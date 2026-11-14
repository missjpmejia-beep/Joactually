export type ItemType = 'rating' | 'event' | 'period'
export type Direction = 'higher_is_better' | 'higher_is_worse'

export interface TrackedItem {
  id: string
  name: string
  type: ItemType
  shown: boolean
  sort_order: number
  direction: Direction | null
  label_low: string | null
  label_2: string | null
  label_3: string | null
  label_4: string | null
  label_high: string | null
  allows_none: boolean
  is_medication: boolean
}

export interface Entry {
  id: string
  item_id: string
  occurred_at: string
  time_zone: string
  value: number | null
  description: string | null
  amount: number | null
  unit: string | null
  size: string | null
  status: string | null
  start_at: string | null
  end_at: string | null
  quality: number | null
  interrupted: boolean | null
  note: string | null
  recorded_at: string
  updated_at: string
  deleted_at: string | null
}

/** Words for a rating value, or null if none were set. 0 is always "None". */
export function labelFor(item: TrackedItem, value: number): string | null {
  if (value === 0) return 'None'
  const map: Record<number, string | null> = {
    1: item.label_low,
    2: item.label_2,
    3: item.label_3,
    4: item.label_4,
    5: item.label_high,
  }
  const l = map[value]?.trim()
  return l ? l : null
}

/** e.g. "3 · Okay", "2", "None" */
export function describeValue(item: TrackedItem | undefined, entry: Entry): string {
  if (entry.value === null || entry.value === undefined) return ''
  if (entry.value === 0) return 'None'
  const words = item ? labelFor(item, entry.value) : null
  return words ? `${entry.value} · ${words}` : String(entry.value)
}

/** Only rating items can be logged in Stage 1. */
export function isLoggable(item: TrackedItem): boolean {
  return item.type === 'rating'
}
