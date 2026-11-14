import { useState } from 'react'
import { useApp } from '../lib/app'
import { addEntry, updateEntry } from '../lib/data'
import { dayKey, londonToUtc, timeOf, todayKey } from '../lib/time'
import { kindOf, type Entry, type TrackedItem } from '../lib/types'
import { Sheet } from './Sheet'
import { useDeleteEntry } from './useDeleteEntry'

const SIZES = ['small', 'normal', 'large'] as const

/** Log a new event (meal, caffeine…) or edit any event, including medication. */
export function EventSheet({
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
  const isMed = kindOf(item) === 'medication'
  const showAmount = isMed || Boolean(item.default_unit) || entry?.amount != null

  const [description, setDescription] = useState(entry?.description ?? '')
  const [size, setSize] = useState<string | null>(entry?.size ?? null)
  const [amount, setAmount] = useState(
    entry ? (entry.amount?.toString() ?? '') : (item.default_amount?.toString() ?? ''),
  )
  const [unit, setUnit] = useState(entry ? (entry.unit ?? '') : (item.default_unit ?? ''))
  const [status, setStatus] = useState<'taken' | 'missed'>((entry?.status as 'taken' | 'missed') ?? 'taken')
  const [date, setDate] = useState(entry ? dayKey(entry.occurred_at) : todayKey())
  const [time, setTime] = useState(timeOf(entry ? entry.occurred_at : new Date()))
  const [note, setNote] = useState(entry?.note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clean = (s: string) => (s.trim() ? s.trim() : null)

  async function save() {
    const amt = amount.trim() === '' ? null : Number(amount.replace(',', '.'))
    if (amt !== null && (!Number.isFinite(amt) || amt < 0)) {
      setError('Amount needs to be a number.')
      return
    }
    setBusy(true)
    setError(null)
    const fields: Partial<Entry> = {
      occurred_at: londonToUtc(date, time),
      note: clean(note),
      amount: showAmount ? amt : null,
      unit: showAmount && amt !== null ? clean(unit) : null,
      ...(isMed
        ? { status, description: null, size: null }
        : { description: clean(description), size }),
    }
    try {
      const saved = entry
        ? await updateEntry(entry.id, fields)
        : await addEntry({ item_id: item.id, ...fields })
      entriesChanged()
      if (entry) showToast('Changes saved')
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

  return (
    <Sheet open onClose={onClose} title={entry ? `Edit ${item.name}` : item.name}>
      {isMed && (
        <div className="segmented field">
          <button type="button" className={status === 'taken' ? 'on' : ''} onClick={() => setStatus('taken')}>
            Taken
          </button>
          <button type="button" className={status === 'missed' ? 'on' : ''} onClick={() => setStatus('missed')}>
            Missed
          </button>
        </div>
      )}

      {!isMed && (
        <label className="field">
          <span>What was it? (optional)</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={item.name === 'Meal' ? 'e.g. pasta' : 'Optional'}
            maxLength={200}
          />
        </label>
      )}

      {showAmount && !(isMed && status === 'missed') && (
        <div className="field-row">
          <label className="field">
            <span>Amount</span>
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Optional" />
          </label>
          <label className="field">
            <span>Unit</span>
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. mg" maxLength={20} />
          </label>
        </div>
      )}

      {!isMed && (
        <fieldset className="field">
          <legend>Size (optional)</legend>
          <div className="segmented">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                className={size === s ? 'on' : ''}
                onClick={() => setSize(size === s ? null : s)}
                aria-pressed={size === s}
              >
                {s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </fieldset>
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
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
      </label>

      {error && <p className="error">{error}</p>}
      <div className="sheet-actions">
        {entry && (
          <button type="button" className="btn danger-text" onClick={del} disabled={busy}>
            Delete
          </button>
        )}
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
