-- Jo, Actually. — pick a critter for each item
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run more than once.

-- Which critter picture an item uses. Empty (null) = the app picks, exactly as before.
alter table public.tracked_items add column if not exists critter text;

alter table public.tracked_items drop constraint if exists tracked_items_critter_check;
alter table public.tracked_items
  add constraint tracked_items_critter_check check (
    critter is null or critter in (
      'mood', 'anxiety', 'energy', 'food', 'sleep', 'meds', 'journal',
      'mug', 'drop', 'bolt', 'star'
    )
  );
