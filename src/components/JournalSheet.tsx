import { useEffect, useState } from 'react'
import { useApp } from '../lib/app'
import { addEntry, updateEntry } from '../lib/data'
import { dayKey, londonToUtc, timeOf, todayKey } from '../lib/time'
import type { Entry, TrackedItem } from '../lib/types'
import { Sheet } from './Sheet'
import { useDeleteEntry } from './useDeleteEntry'

/** Unsaved words are kept on this device, so closing the sheet by accident loses nothing. */
const DRAFT_KEY = 'joactually.journalDraft'

function readDraft(): string {
  try {
    return localStorage.getItem(DRAFT_KEY) ?? ''
  } catch {
    return ''
  }
}

function writeDraft(text: string) {
  try {
    if (text.trim()) localStorage.setItem(DRAFT_KEY, text)
    else localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* storage unavailable */
  }
}

/** Write a new journal entry, or edit one. */
export function JournalSheet({
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
  const [text, setText] = useState(() => (entry ? (entry.note ?? '') : readDraft()))
  const [changingTime, setChangingTime] = useState(Boolean(entry))
  const [date, setDate] = useState(entry ? dayKey(entry.occurred_at) : todayKey())
  const [time, setTime] = useState(timeOf(entry ? entry.occurred_at : new Date()))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hadDraft = !entry && readDraft().trim().length > 0

  // Keep a draft of new entries as Jo types
  useEffect(() => {
    if (!entry) writeDraft(text)
  }, [entry, text])

  async function save() {
    setBusy(true)
    setError(null)
    const fields: Partial<Entry> = {
      note: text.trim(),
      ...(changingTime ? { occurred_at: londonToUtc(date, time) } : {}),
    }
    try {
      const saved = entry ? await updateEntry(entry.id, fields) : await addEntry({ item_id: item.id, ...fields })
      if (!entry) writeDraft('')
      entriesChanged()
      if (entry) showToast('Changes saved')
      onSaved?.(saved)
      onClose()
    } catch (e) {
      const msg = (e as Error).message
      setError(/journal|type_check|check constraint/i.test(msg) ? 'The journal needs the database update first (004_journal.sql).' : msg)
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

  return (
    <Sheet
      open
      onClose={onClose}
      title={entry ? `Edit ${item.name.toLowerCase()} entry` : item.name}
      subtitle={entry ? undefined : 'Whatever’s on your mind. Nobody else reads this.'}
    >
      <label className="field">
        <span className="visually-hidden">Journal entry</span>
        <textarea
          className="journal-text"
          rows={9}
          autoFocus={!entry}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Today…"
        />
        {hadDraft && <span className="muted small">Picked up where you left off.</span>}
      </label>

      {changingTime && (
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
      )}

      {error && <p className="error">{error}</p>}
      <div className="sheet-actions">
        {entry && (
          <button type="button" className="btn danger-text" onClick={del} disabled={busy}>
            Delete
          </button>
        )}
        {!changingTime && (
          <button type="button" className="link-btn" onClick={() => setChangingTime(true)}>
            Now · {time} — change time
          </button>
        )}
        <span className="spacer" />
        <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
          {entry ? 'Cancel' : 'Close'}
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={save}
          disabled={busy || !text.trim() || (changingTime && (!date || !time))}
        >
          Save
        </button>
      </div>
    </Sheet>
  )
}
