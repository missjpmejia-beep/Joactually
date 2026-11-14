import { useState } from 'react'
import { useApp } from '../lib/app'
import { deleteEntry, restoreEntry, updateEntry } from '../lib/data'
import { dayKey, londonToUtc, timeOf } from '../lib/time'
import type { Entry } from '../lib/types'
import { RatingOptions } from './RatingOptions'
import { Sheet } from './Sheet'

/** Edit or delete any entry. Render with a `key` of the entry id so state resets per entry. */
export function EntryEditor({ entry, onClose }: { entry: Entry | null; onClose: () => void }) {
  const { itemsById, showToast, entriesChanged } = useApp()
  const item = entry ? itemsById.get(entry.item_id) : undefined
  const [value, setValue] = useState<number | null>(entry?.value ?? null)
  const [date, setDate] = useState(entry ? dayKey(entry.occurred_at) : '')
  const [time, setTime] = useState(entry ? timeOf(entry.occurred_at) : '')
  const [note, setNote] = useState(entry?.note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!entry) return null

  async function save() {
    if (!entry) return
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

  async function remove() {
    if (!entry) return
    setBusy(true)
    setError(null)
    try {
      await deleteEntry(entry.id)
      entriesChanged()
      const id = entry.id
      showToast(`${item?.name ?? 'Entry'} deleted`, [
        {
          label: 'Undo',
          primary: true,
          onClick: async () => {
            await restoreEntry(id)
            entriesChanged()
          },
        },
      ])
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
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
        <button type="button" className="btn danger-text" onClick={remove} disabled={busy}>
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
