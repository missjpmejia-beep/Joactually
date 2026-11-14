-- Jo, Actually. — Stage 2 database update
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run more than once.

-- A sleep period belongs to the date of waking: its occurred_at is always its end time.
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
    if new.start_at is null or new.end_at is null then
      raise exception 'A period needs a start and end';
    end if;
    new.occurred_at := new.end_at;
  elsif new.start_at is not null or new.end_at is not null or new.quality is not null or new.interrupted is not null then
    raise exception 'Only periods have start, end, quality or interrupted';
  end if;

  if item.type <> 'event' and (new.description is not null or new.amount is not null or new.unit is not null or new.size is not null) then
    raise exception 'Only events have a description, amount or size';
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

-- Medications must be events
alter table public.tracked_items drop constraint if exists medication_is_event;
alter table public.tracked_items add constraint medication_is_event check (not is_medication or type = 'event');
