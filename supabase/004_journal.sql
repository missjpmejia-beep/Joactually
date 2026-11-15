-- Jo, Actually. — journal
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run more than once.

-- 1. A new kind of item: 'journal'. Its entries are just words (kept in the note column).
alter table public.tracked_items drop constraint if exists tracked_items_type_check;
alter table public.tracked_items
  add constraint tracked_items_type_check check (type in ('rating', 'event', 'period', 'journal'));

-- 2. Entry rules: same as before, plus "a journal entry needs some words".
create or replace function public.check_entry()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item public.tracked_items;
begin
  select * into item from public.tracked_items where id = new.item_id;

  if item.id is null or item.user_id <> new.user_id then
    raise exception 'Item not found';
  end if;

  if item.type = 'rating' then
    if new.value is null then
      raise exception 'A rating needs a value';
    end if;
    if new.value = 0 and not item.allows_none then
      raise exception '"None" is only for symptoms';
    end if;
  elsif new.value is not null then
    raise exception 'Only ratings have a value';
  end if;

  if item.type = 'period' then
    if new.start_at is null then
      raise exception 'A period needs a start';
    end if;
    -- Finished: belongs to the date of waking. In progress: sits at its start for now.
    new.occurred_at := coalesce(new.end_at, new.start_at);
  elsif new.start_at is not null or new.end_at is not null or new.quality is not null
        or new.interrupted is not null or new.is_nap then
    raise exception 'Only periods have start, end, quality, interrupted or nap';
  end if;

  if item.type <> 'event' and (new.description is not null or new.amount is not null or new.unit is not null or new.size is not null) then
    raise exception 'Only events have a description, amount or size';
  end if;

  if item.type = 'journal' and (new.note is null or length(trim(new.note)) = 0) then
    raise exception 'A journal entry needs some words';
  end if;

  if item.is_medication then
    if new.status is null then
      new.status := 'taken';
    end if;
  elsif new.status is not null then
    raise exception 'Taken/missed is for medication only';
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();
    new.recorded_at := old.recorded_at;
  end if;

  return new;
end;
$$;

-- 3. Give every existing account a Journal, at the bottom of their list.
--    (Brand-new accounts get one from the app's starter set instead.)
insert into public.tracked_items (user_id, name, type, shown, sort_order)
select u.id, 'Journal', 'journal', true,
       (select coalesce(max(t.sort_order), -1) + 1 from public.tracked_items t where t.user_id = u.id)
from auth.users u
where exists (select 1 from public.tracked_items t where t.user_id = u.id)
  and not exists (select 1 from public.tracked_items t where t.user_id = u.id and t.type = 'journal');
