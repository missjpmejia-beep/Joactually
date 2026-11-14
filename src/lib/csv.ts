import { dayKey, timeOf } from './time'
import { formatDuration, kindOf, labelFor, type Entry, type TrackedItem } from './types'

function cell(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  // Stop spreadsheets treating text as a formula
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

function local(iso: string | null): string {
  return iso ? `${dayKey(iso)} ${timeOf(iso)}` : ''
}

const HEADERS = [
  'date',
  'time',
  'item',
  'kind',
  'rating',
  'rating_words',
  'description',
  'amount',
  'unit',
  'size',
  'status',
  'sleep_start',
  'sleep_end',
  'sleep_duration',
  'sleep_minutes',
  'quality',
  'woke_in_night',
  'note',
  'recorded_at',
  'last_edited_at',
]

/** All times are UK local time (Europe/London). */
export function entriesToCsv(entries: Entry[], itemsById: Map<string, TrackedItem>): string {
  const rows = entries.map((e) => {
    const item = itemsById.get(e.item_id)
    const minutes =
      e.start_at && e.end_at ? Math.round((new Date(e.end_at).getTime() - new Date(e.start_at).getTime()) / 60000) : null
    return [
      dayKey(e.occurred_at),
      timeOf(e.occurred_at),
      item?.name ?? 'Unknown',
      item ? kindOf(item) : '',
      e.value,
      item && e.value !== null ? labelFor(item, e.value) : '',
      e.description,
      e.amount,
      e.unit,
      e.size,
      e.status,
      local(e.start_at),
      local(e.end_at),
      e.start_at && e.end_at ? formatDuration(e.start_at, e.end_at) : '',
      minutes,
      e.quality,
      e.interrupted === null ? '' : e.interrupted ? 'yes' : 'no',
      e.note,
      local(e.recorded_at),
      e.updated_at !== e.recorded_at ? local(e.updated_at) : '',
    ]
      .map(cell)
      .join(',')
  })
  return [HEADERS.join(','), ...rows].join('\r\n') + '\r\n'
}

export function downloadCsv(csv: string, filename: string) {
  // Byte-order mark so Excel opens it as UTF-8
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
