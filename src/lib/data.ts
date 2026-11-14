import { supabase } from './supabase'
import type { Entry, TrackedItem } from './types'
import { addDays, startOfDayUtc } from './time'

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

// ── Items ────────────────────────────────────────────────────

export async function fetchItems(): Promise<TrackedItem[]> {
  return check(await supabase.from('tracked_items').select('*').order('sort_order'))
}

/** Starter set from the spec. Sleep and Meal start hidden until Stage 2. */
const STARTERS: Partial<TrackedItem>[] = [
  {
    name: 'Mood', type: 'rating', direction: 'higher_is_better',
    label_low: 'Very low', label_2: 'Low', label_3: 'Okay', label_4: 'Good', label_high: 'Very good',
  },
  {
    name: 'Anxiety', type: 'rating', direction: 'higher_is_worse',
    label_low: 'Calm', label_2: 'A little anxious', label_3: 'Fairly anxious', label_4: 'Very anxious',
    label_high: 'Extremely anxious',
  },
  {
    name: 'Energy', type: 'rating', direction: 'higher_is_better',
    label_low: 'Exhausted', label_2: 'Low', label_3: 'Okay', label_4: 'Good', label_high: 'Full of energy',
  },
  { name: 'Sleep', type: 'period', shown: false },
  { name: 'Meal', type: 'event', shown: false },
]

export async function seedStarterItems(): Promise<void> {
  // Every row must have the same columns: in a multi-row insert, a missing
  // column becomes null instead of using the database default.
  const blank = {
    shown: true, direction: null,
    label_low: null, label_2: null, label_3: null, label_4: null, label_high: null,
  }
  const rows = STARTERS.map((s, i) => ({ ...blank, ...s, sort_order: i }))
  check(await supabase.from('tracked_items').insert(rows))
}

export async function addItem(item: Partial<TrackedItem>): Promise<TrackedItem> {
  return check(await supabase.from('tracked_items').insert(item).select().single())
}

export async function updateItem(id: string, changes: Partial<TrackedItem>): Promise<void> {
  check(await supabase.from('tracked_items').update(changes).eq('id', id))
}

// ── Entries ──────────────────────────────────────────────────

export async function addRating(itemId: string, value: number, occurredAt?: string): Promise<Entry> {
  const row: Record<string, unknown> = { item_id: itemId, value }
  if (occurredAt) row.occurred_at = occurredAt
  return check(await supabase.from('entries').insert(row).select().single())
}

export async function updateEntry(id: string, changes: Partial<Entry>): Promise<Entry> {
  return check(await supabase.from('entries').update(changes).eq('id', id).select().single())
}

/** Soft delete: hidden at once, recoverable for 30 days. */
export async function deleteEntry(id: string): Promise<void> {
  check(await supabase.from('entries').update({ deleted_at: new Date().toISOString() }).eq('id', id))
}

export async function restoreEntry(id: string): Promise<void> {
  check(await supabase.from('entries').update({ deleted_at: null }).eq('id', id))
}

/** Entries between two London days (inclusive), newest first. */
export async function fetchEntries(opts: {
  fromDay: string
  toDay: string
  itemId?: string
  search?: string
}): Promise<Entry[]> {
  let q = supabase
    .from('entries')
    .select('*')
    .is('deleted_at', null)
    .gte('occurred_at', startOfDayUtc(opts.fromDay))
    .lt('occurred_at', startOfDayUtc(addDays(opts.toDay, 1)))
    .order('occurred_at', { ascending: false })
    .limit(2000)
  if (opts.itemId) q = q.eq('item_id', opts.itemId)
  return check(await q)
}

/** Search notes and descriptions across all time. */
export async function searchEntries(text: string, itemId?: string): Promise<Entry[]> {
  // Strip characters that have meaning in the filter syntax
  const safe = text.replace(/[%_,()*\\]/g, ' ').trim()
  if (!safe) return []
  let q = supabase
    .from('entries')
    .select('*')
    .is('deleted_at', null)
    .or(`note.ilike.%${safe}%,description.ilike.%${safe}%`)
    .order('occurred_at', { ascending: false })
    .limit(500)
  if (itemId) q = q.eq('item_id', itemId)
  return check(await q)
}
