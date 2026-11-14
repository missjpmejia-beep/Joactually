import { useState } from 'react'
import { useApp } from '../lib/app'
import { updateEntry } from '../lib/data'
import type { Entry } from '../lib/types'
import { Sheet } from './Sheet'

export function NoteSheet({ entry, onClose }: { entry: Entry | null; onClose: () => void }) {
  const { itemsById, entriesChanged, showToast } = useApp()
  const [note, setNote] = useState(entry?.note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!entry) return null
  const item = itemsById.get(entry.item_id)

  async function save() {
    if (!entry) return
    setBusy(true)
    try {
      await updateEntry(entry.id, { note: note.trim() ? note.trim() : null })
      entriesChanged()
      showToast('Note added')
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title="Add a note" subtitle={item?.name}>
      <label className="field">
        <span className="visually-hidden">Note</span>
        <textarea
          rows={4}
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. slow start, tired"
        />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="sheet-actions">
        <span className="spacer" />
        <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="btn primary" onClick={save} disabled={busy}>
          Save note
        </button>
      </div>
    </Sheet>
  )
}
