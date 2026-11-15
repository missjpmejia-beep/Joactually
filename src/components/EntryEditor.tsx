import { useState } from 'react'
import { useApp } from '../lib/app'
import { updateEntry } from '../lib/data'
import { dayKey, londonToUtc, timeOf } from '../lib/time'
import type { Entry } from '../lib/types'
import { RatingOptions } from './RatingOptions'
import { Sheet } from './Sheet'
import { EventSheet } from './EventSheet'
import { SleepSheet } from './SleepSheet'
import { JournalSheet } from './JournalSheet'
import { useDeleteEntry } from './useDeleteEntry'

/** Edit or delete any entry. Render with a `key` of the entry id so state resets per entry. */
export function EntryEditor({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const { itemsById } = useApp()
  const item = itemsById.get(entry.item_id)
  if (item?.type === 'event') return <EventSheet item={item} entry={entry} onClose={onClose} />
  if (item?.type === 'period') return <SleepSheet item={item} entry={entry} onClose={onClose} />
  if (item?.type === 'journal') return <JournalSheet item={item} entry={entry} onClose={onClose} />
  return <RatingEditor entry={entry} onClose={onClose} />
}

function RatingEditor({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const { itemsById, showToast, entriesChanged } = useApp()
  const remove = useDeleteEntry()
  const item = itemsById.get(entry.item_id)
  const [value, setValue] = useState<number | null>(entry.value)
  const [date, setDate] = useState(dayKey(entry.occurred_at))
  const [time, setTime] = useState(timeOf(entry.occurred_at))
  const [note, setNote] = useState(entry.note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await updateEntry(entry.id, {
        value: item?.type === 'rating' ? value : entry.value,
        occurred_at: date && time ? londonToUtc(date, time) : entry.occurred_at,
        note: note.trim() ? note.trim() : null,
      })
      entriesChanged()
      showToast('Changes saved')
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function del() {
    setBusy(true)
    setError(null)
    try {
      await remove(entry)
      onClose()
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title={`Edit ${item?.name ?? 'entry'}`}>
      {item?.type === 'rating' && (
        <RatingOptions item={item} selected={value} disabled={busy} onPick={setValue} />
      )}
      <div className="field-row">
        <label className="field">
          <span>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="field">
          <span>Time</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </label>
      </div>
      <label className="field">
        <span>Note</span>
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="sheet-actions">
        <button type="button" className="btn danger-text" onClick={del} disabled={busy}>
          Delete
        </button>
        <span className="spacer" />
        <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="btn primary" onClick={save} disabled={busy || !date || !time}>
          Save
        </button>
      </div>
    </Sheet>
  )
}
