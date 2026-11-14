import { useEffect, useState } from 'react'
import { useApp } from '../lib/app'
import { addEntry, addRating, deleteEntry, fetchEntries } from '../lib/data'
import { dayKey, londonToUtc, longDay, timeOf, todayKey } from '../lib/time'
import { describeValue, formatAmount, formatDuration, kindOf, type Entry, type TrackedItem } from '../lib/types'
import { RatingOptions, directionHint } from '../components/RatingOptions'
import { Sheet } from '../components/Sheet'
import { EntryList } from '../components/EntryList'
import { EntryEditor } from '../components/EntryEditor'
import { NoteSheet } from '../components/NoteSheet'
import { EventSheet } from '../components/EventSheet'
import { SleepSheet } from '../components/SleepSheet'
import { KindIcon, Tick } from '../components/Icons'

const MEDS_OPEN_KEY = 'joactually.medsOpen'

function greeting(): string {
  const h = Number(timeOf(new Date()).slice(0, 2))
  if (h < 5) return 'Still up, Jo?'
  if (h < 12) return 'Good morning, Jo'
  if (h < 18) return 'Good afternoon, Jo'
  return 'Good evening, Jo'
}

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
  const [poppedItem, setPoppedItem] = useState<string | null>(null)

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

  const shown = items.filter((i) => i.shown)
  const meds = shown.filter((i) => kindOf(i) === 'medication')
  const [medsOpen, setMedsOpen] = useState(() => {
    try {
      return localStorage.getItem(MEDS_OPEN_KEY) === '1'
    } catch {
      return false
    }
  })
  function toggleMeds(open: boolean) {
    setMedsOpen(open)
    try {
      localStorage.setItem(MEDS_OPEN_KEY, open ? '1' : '0')
    } catch {
      /* storage unavailable */
    }
  }

  function lastFor(item: TrackedItem): Entry | undefined {
    return entries.find((e) => e.item_id === item.id)
  }

  function onSaved(entry: Entry) {
    const item = itemsById.get(entry.item_id)
    const kind = item ? kindOf(item) : 'rating'
    setFreshId(entry.id)
    setPoppedItem(item && kindOf(item) === 'medication' ? 'medication-group' : entry.item_id)
    window.setTimeout(() => setPoppedItem(null), 700)
    entriesChanged()
    const what =
      kind === 'rating'
        ? `${item?.name ?? 'Entry'} ${entry.value === 0 ? 'None' : entry.value} saved`
        : kind === 'medication'
          ? `${item?.name} ${describeValue(item, entry).toLowerCase()}`
          : `${item?.name ?? 'Entry'} saved`
    const otherDay = dayKey(entry.occurred_at) !== todayKey()
    showToast(`${what}${otherDay ? ` for ${longDay(dayKey(entry.occurred_at))}` : ''}`, [
      kind === 'medication'
        ? { label: 'Change', onClick: () => setEditing(entry) }
        : kind === 'rating'
          ? { label: 'Add note', onClick: () => setNoting(entry) }
          : null,
      {
        label: 'Undo',
        primary: true,
        onClick: async () => {
          await deleteEntry(entry.id)
          entriesChanged()
        },
      },
    ].filter((a) => a !== null))
  }

  async function tap(item: TrackedItem) {
    if (kindOf(item) !== 'medication') {
      setPicking(item)
      return
    }
    // Medication: one tap logs the usual dose, taken now
    try {
      const entry = await addEntry({
        item_id: item.id,
        status: 'taken',
        amount: item.default_amount,
        unit: item.default_amount !== null ? item.default_unit : null,
      })
      onSaved(entry)
    } catch (e) {
      showToast(`Couldn’t save: ${(e as Error).message}`)
    }
  }

  function cardStatus(item: TrackedItem): string {
    if (loadedDay !== today) return '\u00a0'
    const last = lastFor(item)
    const kind = kindOf(item)
    if (!last) return 'Not logged yet today'
    const at = timeOf(last.occurred_at)
    if (kind === 'rating') return `Last: ${last.value === 0 ? 'None' : last.value} at ${at}`
    if (kind === 'medication') {
      if (last.status === 'missed') return `Missed · ${at}`
      const amt = formatAmount(last.amount, last.unit)
      return `${amt ? amt + ' · ' : ''}taken ${at}`
    }
    if (kind === 'sleep' && last.start_at && last.end_at) return `Last night: ${formatDuration(last.start_at, last.end_at)}`
    return `Last: ${at}`
  }

  return (
    <div className="page">
      <header className="page-top">
        <span className="brand">Jo, Actually.</span>
        <span className="muted">{longDay(today)}</span>
      </header>
      <h1 className="greeting">{greeting()}</h1>
      <p className="lede">What would you like to log?</p>

      {itemsError && <p className="error">Couldn’t load your items: {itemsError}</p>}
      {loadError && <p className="error">Couldn’t load today’s entries: {loadError}</p>}

      {itemsLoaded && shown.length === 0 && !itemsError && (
        <p className="empty-box">Nothing to show. Add or unhide items in Settings.</p>
      )}

      <div className="card-grid">
        {shown.map((item) => {
          const kind = kindOf(item)
          if (kind === 'medication') {
            // All medications live in one box, placed where the first one sits in the order
            if (item.id !== meds[0].id) return null
            const logged = meds.filter((m) => lastFor(m)).length
            return (
              <div
                key="medication-group"
                className={'med-group' + (medsOpen ? ' open' : '') + (poppedItem === 'medication-group' ? ' pop' : '')}
              >
                <button
                  type="button"
                  className="med-head"
                  aria-expanded={medsOpen}
                  onClick={() => toggleMeds(!medsOpen)}
                >
                  <span className="card-top">
                    <KindIcon kind="medication" />
                    {loadedDay === today && logged === meds.length && <Tick />}
                  </span>
                  <span className="log-card-name">Medication</span>
                  <span className="log-card-sub">
                    {loadedDay !== today ? '\u00a0' : logged === 0 ? 'None logged yet today' : `${logged} of ${meds.length} logged today`}
                  </span>
                  <svg className="chevron" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {medsOpen && (
                  <div className="med-list">
                    {meds.map((m) => (
                      <button key={m.id} type="button" className="med-btn" onClick={() => void tap(m)}>
                        <span className="med-name">
                          {m.name}
                          {loadedDay === today && lastFor(m) && <Tick />}
                        </span>
                        <span className="log-card-sub">{cardStatus(m)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          }
          return (
            <button
              key={item.id}
              type="button"
              className={`log-card kind-${kind}` + (poppedItem === item.id ? ' pop' : '')}
              onClick={() => void tap(item)}
            >
              <span className="card-top">
                <KindIcon kind={kind} />
                {loadedDay === today && lastFor(item) && <Tick />}
              </span>
              <span className="log-card-name">{item.name}</span>
              <span className="log-card-sub">{cardStatus(item)}</span>
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

      {picking && picking.type === 'event' && (
        <EventSheet key={picking.id} item={picking} onClose={() => setPicking(null)} onSaved={onSaved} />
      )}
      {picking && picking.type === 'period' && (
        <SleepSheet key={picking.id} item={picking} onClose={() => setPicking(null)} onSaved={onSaved} />
      )}
      {picking && picking.type === 'rating' && (
        <RatingSheet
          key={picking.id}
          item={picking}
          onClose={() => setPicking(null)}
          onSaved={(e) => {
            setPicking(null)
            onSaved(e)
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
