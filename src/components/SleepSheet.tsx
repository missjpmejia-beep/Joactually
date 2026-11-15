import { useState } from 'react'
import { useApp } from '../lib/app'
import { addEntry, updateEntry } from '../lib/data'
import { addDays, dayKey, londonToUtc, longDay, timeOf, todayKey } from '../lib/time'
import { formatDuration, type Entry, type TrackedItem } from '../lib/types'
import { Sheet } from './Sheet'
import { useDeleteEntry } from './useDeleteEntry'

/**
 * Work out bedtime and wake time as real instants.
 * Sleep belongs to the date of waking; if bedtime is later in the clock than
 * wake time (23:30 → 07:00) it was the evening before.
 */
export function sleepTimes(wakeDay: string, bed: string, wake: string) {
  const bedDay = bed > wake ? addDays(wakeDay, -1) : wakeDay
  return { start_at: londonToUtc(bedDay, bed), end_at: londonToUtc(wakeDay, wake) }
}

/** A good guess at "this was a nap": started in the daytime and under 4 hours. */
export function looksLikeNap(startIso: string, endIso: string): boolean {
  const hours = (new Date(endIso).getTime() - new Date(startIso).getTime()) / 3_600_000
  const startedAt = timeOf(startIso)
  return hours < 4 && startedAt >= '06:00' && startedAt < '20:00'
}

function defaultWake(): string {
  const now = timeOf(new Date())
  return now < '12:00' ? now : '07:00'
}

/**
 * Three ways in:
 * - no entry: log a sleep by hand (times shown)
 * - an open entry (start, no end): "I'm awake" — wake time is now, times tucked away
 * - a finished entry: edit it
 */
export function SleepSheet({
  item,
  entry,
  onClose,
  onSaved,
}: {
  item: TrackedItem
  entry?: Entry
  onClose: () => void
  onSaved?: (e: Entry) => void
}) {
  const { entriesChanged, showToast } = useApp()
  const remove = useDeleteEntry()
  const waking = Boolean(entry?.start_at && !entry.end_at)
  const [wakeNow] = useState(() => new Date().toISOString())

  const [showTimes, setShowTimes] = useState(!waking)
  const [wakeDay, setWakeDay] = useState(entry?.end_at ? dayKey(entry.end_at) : todayKey())
  const [bed, setBed] = useState(entry?.start_at ? timeOf(entry.start_at) : '23:00')
  const [wake, setWake] = useState(
    entry?.end_at ? timeOf(entry.end_at) : waking ? timeOf(wakeNow) : defaultWake(),
  )
  const [quality, setQuality] = useState<number | null>(entry?.quality ?? null)
  const [interrupted, setInterrupted] = useState(entry?.interrupted ?? false)
  const [note, setNote] = useState(entry?.note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Waking with the times untouched keeps the exact moments; otherwise use the time boxes
  const times =
    waking && !showTimes && entry?.start_at
      ? { start_at: entry.start_at, end_at: wakeNow }
      : wakeDay && bed && wake && bed !== wake
        ? sleepTimes(wakeDay, bed, wake)
        : null

  const [isNap, setIsNap] = useState(() => {
    if (entry?.end_at) return Boolean(entry.is_nap)
    if (waking && entry?.start_at) return looksLikeNap(entry.start_at, wakeNow)
    return false
  })

  async function save() {
    if (!times) return
    setBusy(true)
    setError(null)
    const fields: Partial<Entry> = {
      ...times,
      occurred_at: times.end_at, // belongs to the date of waking
      quality,
      interrupted,
      is_nap: isNap,
      note: note.trim() ? note.trim() : null,
    }
    try {
      const saved = entry ? await updateEntry(entry.id, fields) : await addEntry({ item_id: item.id, ...fields })
      entriesChanged()
      if (waking) showToast(`${isNap ? 'Nap' : 'Sleep'} saved: ${formatDuration(times.start_at, times.end_at)}`)
      else if (entry) showToast('Changes saved')
      onSaved?.(saved)
      onClose()
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  async function del() {
    if (!entry) return
    setBusy(true)
    try {
      await remove(entry)
      onClose()
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  const title = waking ? (timeOf(wakeNow) < '12:00' ? 'Morning! You’re awake' : 'Welcome back') : entry ? `Edit ${item.name}` : item.name
  const subtitle =
    waking && entry?.start_at
      ? `Asleep ${timeOf(entry.start_at)} → ${timeOf(wakeNow)}`
      : undefined

  return (
    <Sheet open onClose={onClose} title={title} subtitle={subtitle}>
      {times && (
        <p className="sleep-summary">
          {formatDuration(times.start_at, times.end_at)} · saved on {longDay(dayKey(times.end_at))}
        </p>
      )}

      <fieldset className="field">
        <legend>What was it?</legend>
        <div className="segmented">
          <button type="button" className={!isNap ? 'on' : ''} aria-pressed={!isNap} onClick={() => setIsNap(false)}>
            Night’s sleep
          </button>
          <button type="button" className={isNap ? 'on' : ''} aria-pressed={isNap} onClick={() => setIsNap(true)}>
            Nap
          </button>
        </div>
      </fieldset>

      {showTimes ? (
        <>
          <div className="field-row">
            <label className="field">
              <span>Went to sleep</span>
              <input type="time" value={bed} onChange={(e) => setBed(e.target.value)} required />
            </label>
            <label className="field">
              <span>Woke up</span>
              <input type="time" value={wake} onChange={(e) => setWake(e.target.value)} required />
            </label>
          </div>
          <label className="field">
            <span>Date you woke up</span>
            <input type="date" value={wakeDay} onChange={(e) => setWakeDay(e.target.value)} required />
          </label>
        </>
      ) : (
        <button type="button" className="link-btn" onClick={() => setShowTimes(true)}>
          Forgot to tap? Change times
        </button>
      )}

      <fieldset className="field">
        <legend>How well did you sleep? (optional)</legend>
        <div className="quality-row">
          {[1, 2, 3, 4, 5].map((q) => (
            <button
              key={q}
              type="button"
              className={'quality-btn' + (quality === q ? ' on' : '')}
              aria-pressed={quality === q}
              onClick={() => setQuality(quality === q ? null : q)}
            >
              {q}
            </button>
          ))}
        </div>
        <span className="muted small">1 = very poorly · 5 = very well</span>
      </fieldset>

      <label className="check">
        <input type="checkbox" checked={interrupted} onChange={(e) => setInterrupted(e.target.checked)} />
        <span>Woke in the night</span>
      </label>

      <label className="field">
        <span>Note</span>
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
      </label>

      {error && <p className="error">{error}</p>}
      <div className="sheet-actions">
        {entry && (
          <button type="button" className="btn danger-text" onClick={del} disabled={busy}>
            {waking ? 'Discard' : 'Delete'}
          </button>
        )}
        <span className="spacer" />
        <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
          {waking ? 'Not yet' : 'Cancel'}
        </button>
        <button type="button" className="btn primary" onClick={save} disabled={busy || !times}>
          Save
        </button>
      </div>
    </Sheet>
  )
}
