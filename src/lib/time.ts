// All times are stored in UTC and shown in Europe/London, so BST changes never shift entries.
export const TZ = 'Europe/London'

const partsFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

function londonParts(d: Date) {
  const p: Record<string, string> = {}
  for (const { type, value } of partsFmt.formatToParts(d)) p[type] = value
  return {
    year: +p.year,
    month: +p.month,
    day: +p.day,
    hour: +p.hour,
    minute: +p.minute,
    second: +p.second,
  }
}

/** "2026-11-14" — the London calendar date of an instant. */
export function dayKey(d: Date | string): string {
  const { year, month, day } = londonParts(new Date(d))
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** "14:32" */
export function timeOf(d: Date | string): string {
  const { hour, minute } = londonParts(new Date(d))
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

/** London's offset from UTC (ms) at a given instant: 0 in winter, 1 h in BST. */
function offsetAt(ms: number): number {
  const p = londonParts(new Date(ms))
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - Math.floor(ms / 1000) * 1000
}

/** Turn a London wall-clock date + time ("2026-11-14", "14:32") into a UTC ISO string. */
export function londonToUtc(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const naive = Date.UTC(y, m - 1, d, hh, mm)
  let utc = naive - offsetAt(naive)
  // Re-check once in case the guess crossed a clock change
  utc = naive - offsetAt(utc)
  return new Date(utc).toISOString()
}

/** The London start of a day key, as a UTC ISO string. */
export function startOfDayUtc(key: string): string {
  return londonToUtc(key, '00:00')
}

/** Add whole days to a day key (calendar arithmetic, no time zones involved). */
export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return t.toISOString().slice(0, 10)
}

export function todayKey(): string {
  return dayKey(new Date())
}

const longFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const shortFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

function keyToDate(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12))
}

/** "Saturday 14 November" */
export function longDay(key: string): string {
  return longFmt.format(keyToDate(key)).replace(',', '')
}

/** "Today · Sat 14 Nov", "Yesterday · Fri 13 Nov", "Thu 12 Nov" */
export function dayHeading(key: string): string {
  const short = shortFmt.format(keyToDate(key)).replace(',', '')
  const today = todayKey()
  if (key === today) return `Today · ${short}`
  if (key === addDays(today, -1)) return `Yesterday · ${short}`
  return short
}
