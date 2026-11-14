-- Jo, Actually. — database setup (Stage 1)
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- It is safe to run on a fresh project only.

-- ─────────────────────────────────────────────────────────────
-- Tracked items: the things Jo has chosen to track
-- ─────────────────────────────────────────────────────────────
create table public.tracked_items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null check (length(trim(name)) between 1 and 40),
  type         text not null check (type in ('rating', 'event', 'period')),
  shown        boolean not null default true,
  sort_order   integer not null default 0,

  -- Ratings only
  direction    text check (direction in ('higher_is_better', 'higher_is_worse')),
  label_low    text,   -- words for 1
  label_2      text,   -- optional
  label_3      text,   -- optional
  label_4      text,   -- optional
  label_high   text,   -- words for 5
  allows_none  boolean not null default false,  -- symptoms: offers "None" (saved as 0)

  -- Events only (used from Stage 2)
  is_medication  boolean not null default false,
  default_amount numeric,
  default_unit   text,

  created_at   timestamptz not null default now(),

  constraint rating_has_direction check (type <> 'rating' or direction is not null)
);

create index tracked_items_user_idx on public.tracked_items (user_id, sort_order);

-- ─────────────────────────────────────────────────────────────
-- Entries: each time something is recorded
-- ─────────────────────────────────────────────────────────────
create table public.entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id      uuid not null references public.tracked_items (id) on delete restrict,

  occurred_at  timestamptz not null default now(),   -- stored in UTC
  time_zone    text not null default 'Europe/London',

  -- Rating
  value        smallint check (value between 0 and 5),

  -- Event (Stage 2)
  description  text,
  amount       numeric,
  unit         text,
  size         text check (size in ('small', 'normal', 'large')),
  status       text check (status in ('taken', 'missed')),

  -- Period (Stage 2)
  start_at     timestamptz,
  end_at       timestamptz,
  quality      smallint check (quality between 1 and 5),
  interrupted  boolean,

  -- Everything
  note         text,
  recorded_at  timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,

  constraint period_order check (start_at is null or end_at is null or end_at > start_at)
);

create index entries_user_time_idx on public.entries (user_id, occurred_at desc);
create index entries_item_idx on public.entries (item_id, occurred_at desc);

-- ─────────────────────────────────────────────────────────────
-- Checks that need to look at the item (an entry must suit its item)
-- ─────────────────────────────────────────────────────────────
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

  if item.type = 'period' and (new.start_at is null or new.end_at is null) then
    raise exception 'A period needs a start and end';
  end if;

  if new.status is not null and not item.is_medication then
    raise exception 'Taken/missed is for medication only';
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();
    new.recorded_at := old.recorded_at;
  end if;

  return new;
end;
$$;

create trigger entries_check
before insert or update on public.entries
for each row execute function public.check_entry();

-- ─────────────────────────────────────────────────────────────
-- Row-level security: every row is only visible to its owner
-- ─────────────────────────────────────────────────────────────
alter table public.tracked_items enable row level security;
alter table public.entries       enable row level security;

create policy "Own items: read"   on public.tracked_items for select to authenticated using (user_id = (select auth.uid()));
create policy "Own items: add"    on public.tracked_items for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Own items: change" on public.tracked_items for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own items: remove" on public.tracked_items for delete to authenticated using (user_id = (select auth.uid()));

create policy "Own entries: read"   on public.entries for select to authenticated using (user_id = (select auth.uid()));
create policy "Own entries: add"    on public.entries for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Own entries: change" on public.entries for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own entries: remove" on public.entries for delete to authenticated using (user_id = (select auth.uid()));

-- Logged-out visitors get nothing at all
revoke all on public.tracked_items from anon;
revoke all on public.entries       from anon;
