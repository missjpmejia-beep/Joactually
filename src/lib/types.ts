import { timeOf } from './time'

export type ItemType = 'rating' | 'event' | 'period' | 'journal'
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
  default_amount: number | null
  default_unit: string | null
}

export type ItemKind = 'rating' | 'medication' | 'event' | 'sleep' | 'journal'

export function kindOf(item: TrackedItem): ItemKind {
  if (item.type === 'rating') return 'rating'
  if (item.type === 'period') return 'sleep'
  if (item.type === 'journal') return 'journal'
  return item.is_medication ? 'medication' : 'event'
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
  /** Sleep only: a nap rather than night sleep */
  is_nap?: boolean
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

/** "7 h 30 min" */
export function formatDuration(startIso: string, endIso: string): string {
  const mins = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h ? `${h} h ${m} min` : `${m} min`
}

export function formatAmount(amount: number | null, unit: string | null): string {
  if (amount === null || amount === undefined) return ''
  return unit ? `${amount} ${unit}` : String(amount)
}

/** Short summary of any entry, e.g. "3 · Okay", "30 mg taken", "Pasta · large", "7 h 30 min · quality 4" */
export function describeValue(item: TrackedItem | undefined, entry: Entry): string {
  if (item?.type === 'journal') return entry.note ?? ''
  if (entry.start_at && !entry.end_at) return `Asleep since ${timeOf(entry.start_at)}`
  if (entry.start_at && entry.end_at) {
    const parts = [entry.is_nap ? `Nap · ${formatDuration(entry.start_at, entry.end_at)}` : formatDuration(entry.start_at, entry.end_at)]
    if (entry.quality) parts.push(`quality ${entry.quality}`)
    if (entry.interrupted) parts.push('woke in night')
    return parts.join(' · ')
  }
  if (entry.status === 'missed') return 'Missed'
  if (entry.status === 'taken') {
    const amt = formatAmount(entry.amount, entry.unit)
    return amt ? `${amt} taken` : 'Taken'
  }
  if (entry.value === null || entry.value === undefined) {
    const parts = [entry.description, formatAmount(entry.amount, entry.unit), entry.size].filter(Boolean)
    return parts.join(' · ') || 'Logged'
  }
  if (entry.value === 0) return 'None'
  const words = item ? labelFor(item, entry.value) : null
  return words ? `${entry.value} · ${words}` : String(entry.value)
}
