import { useEffect, useState } from 'react'
import { useApp } from '../lib/app'
import { addRating, deleteEntry, fetchEntries } from '../lib/data'
import { dayKey, londonToUtc, longDay, timeOf, todayKey } from '../lib/time'
import { isLoggable, type Entry, type TrackedItem } from '../lib/types'
import { RatingOptions, directionHint } from '../components/RatingOptions'
import { Sheet } from '../components/Sheet'
import { EntryList } from '../components/EntryList'
import { EntryEditor } from '../components/EntryEditor'
import { NoteSheet } from '../components/NoteSheet'

export function Today() {
  const { items, itemsLoaded, itemsError, itemsById, showToast, entriesChanged, entriesVersion } = useApp()
  const [today, setToday] = useState(todayKey())
  const [entries, setEntries] = useState<Entry[]>([])
  const [loadedDay, setLoadedDay] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [picking, setPicking] = useState<TrackedItem | null>(null)
  const [editing, setEditing] = useState<Entry | null>(null)
  const [noting, setNoting] = useState<Entry | null>(null)
  const [freshId, setFreshId] = useState<string | null>(null)

  // Roll over to a new day if the app is left open past midnight
  useEffect(() => {
    const t = window.setInterval(() => setToday(todayKey()), 60_000)
    const onShow = () => setToday(todayKey())
    document.addEventListener('visibilitychange', onShow)
    return () => {
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', onShow)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchEntries({ fromDay: today, toDay: today })
      .then((list) => {
        if (!cancelled) {
          setEntries(list)
          setLoadedDay(today)
          setLoadError(null)
        }
      })
      .catch((e: Error) => !cancelled && setLoadError(e.message))
    return () => {
      cancelled = true
    }
  }, [today, entriesVersion])

  const shown = items.filter((i) => i.shown && isLoggable(i))

  function lastFor(item: TrackedItem): Entry | undefined {
    return entries.find((e) => e.item_id === item.id)
  }

  async function onSaved(entry: Entry) {
    const item = itemsById.get(entry.item_id)
    setFreshId(entry.id)
    entriesChanged()
    const valueText = entry.value === 0 ? 'None' : String(entry.value)
    const otherDay = dayKey(entry.occurred_at) !== todayKey()
    showToast(`${item?.name ?? 'Entry'} ${valueText} saved${otherDay ? ` for ${longDay(dayKey(entry.occurred_at))}` : ''}`, [
      { label: 'Add note', onClick: () => setNoting(entry) },
      {
        label: 'Undo',
        primary: true,
        onClick: async () => {
          await deleteEntry(entry.id)
          entriesChanged()
        },
      },
    ])
  }

  return (
    <div className="page">
      <header className="page-top">
        <span className="brand">Jo, Actually.</span>
        <span className="muted">{longDay(today)}</span>
      </header>
      <h1>What would you like to log?</h1>

      {itemsError && <p className="error">Couldn’t load your items: {itemsError}</p>}
      {loadError && <p className="error">Couldn’t load today’s entries: {loadError}</p>}

      {itemsLoaded && shown.length === 0 && !itemsError && (
        <p className="empty-box">Nothing to show. Add or unhide items in Settings.</p>
      )}

      <div className="card-grid">
        {shown.map((item) => {
          const last = lastFor(item)
          return (
            <button key={item.id} type="button" className="log-card" onClick={() => setPicking(item)}>
              <span className="log-card-name">{item.name}</span>
              <span className="log-card-sub">
                {loadedDay !== today
                  ? '\u00a0'
                  : last
                  ? `Last: ${last.value === 0 ? 'None' : last.value} at ${timeOf(last.occurred_at)}`
                  : 'Not logged yet today'}
              </span>
            </button>
          )
        })}
      </div>

      {entries.length > 0 && (
        <section>
          <h2 className="section-title">Today so far</h2>
          <div className="card">
            <EntryList entries={entries} onOpen={setEditing} highlightId={freshId} />
          </div>
        </section>
      )}

      {picking && (
        <RatingSheet
          key={picking.id}
          item={picking}
          onClose={() => setPicking(null)}
          onSaved={(e) => {
            setPicking(null)
            void onSaved(e)
          }}
        />
      )}
      {editing && <EntryEditor key={editing.id} entry={editing} onClose={() => setEditing(null)} />}
      {noting && <NoteSheet key={noting.id} entry={noting} onClose={() => setNoting(null)} />}
    </div>
  )
}

function RatingSheet({
  item,
  onClose,
  onSaved,
}: {
  item: TrackedItem
  onClose: () => void
  onSaved: (e: Entry) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [changingTime, setChangingTime] = useState(false)
  const [date, setDate] = useState(todayKey())
  const [time, setTime] = useState(timeOf(new Date()))
  const [now, setNow] = useState(timeOf(new Date()))

  useEffect(() => {
    const t = window.setInterval(() => setNow(timeOf(new Date())), 15_000)
    return () => window.clearInterval(t)
  }, [])

  async function pick(value: number) {
    setBusy(true)
    setError(null)
    try {
      const entry = await addRating(item.id, value, changingTime ? londonToUtc(date, time) : undefined)
      onSaved(entry)
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  const low = item.label_low ? `1 = ${item.label_low}` : ''
  const high = item.label_high ? `5 = ${item.label_high}` : ''
  const subtitle = [low, high].filter(Boolean).join(' · ')

  return (
    <Sheet open onClose={onClose} title={item.name} subtitle={subtitle || undefined}>
      <RatingOptions item={item} disabled={busy} onPick={pick} />
      <p className="hint">Tap a number to save. {directionHint(item)}</p>
      {changingTime && (
        <div className="field-row">
          <label className="field">
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field">
            <span>Time</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>
      )}
      {error && <p className="error">{error}</p>}
      <div className="sheet-actions">
        {!changingTime && (
          <button type="button" className="link-btn" onClick={() => setChangingTime(true)}>
            Now · {now} — change time
          </button>
        )}
        <span className="spacer" />
        <button type="button" className="btn ghost" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Sheet>
  )
}
