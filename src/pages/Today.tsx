import { useEffect, useState } from 'react'
import { useApp } from '../lib/app'
import { addEntry, addRating, deleteEntry, fetchEntries, fetchOpenSleep, startSleep } from '../lib/data'
import { dateChip, dayKey, londonToUtc, longDay, timeOf, todayKey } from '../lib/time'
import { describeValue, formatAmount, formatDuration, kindOf, labelFor, type Entry, type TrackedItem } from '../lib/types'
import { RatingOptions, directionHint } from '../components/RatingOptions'
import { Sheet } from '../components/Sheet'
import { EntryList } from '../components/EntryList'
import { EntryEditor } from '../components/EntryEditor'
import { NoteSheet } from '../components/NoteSheet'
import { EventSheet } from '../components/EventSheet'
import { SleepSheet } from '../components/SleepSheet'
import { Critter } from '../components/Critter'
import { bubbleCopy, critterFor, CRITTER_COLOUR } from '../lib/critters'

const MEDS_OPEN_KEY = 'joactually.medsOpen'

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

  // The sleep in progress, if any, and a clock so its timer ticks
  const [openSleep, setOpenSleep] = useState<Entry | null>(null)
  const [wakingFrom, setWakingFrom] = useState<Entry | null>(null)
  const [nowTick, setNowTick] = useState(() => new Date().toISOString())
  useEffect(() => {
    const t = window.setInterval(() => setNowTick(new Date().toISOString()), 30_000)
    return () => window.clearInterval(t)
  }, [])
  useEffect(() => {
    let cancelled = false
    // Fetch today's entries and any sleep in progress together, so the Sleep card changes in one step
    Promise.all([fetchEntries({ fromDay: today, toDay: today }), fetchOpenSleep().catch(() => null)])
      .then(([list, open]) => {
        if (!cancelled) {
          setEntries(list)
          setOpenSleep(open)
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

  const loaded = loadedDay === today
  const hour = Number(timeOf(new Date()).slice(0, 2))
  const isLogged = (i: TrackedItem) => Boolean(lastFor(i))
  const moodItem = shown.find((i) => critterFor(i) === 'mood' && i.name.trim().toLowerCase() === 'mood') ??
    shown.find((i) => i.type === 'rating')
  const moodLast = moodItem ? lastFor(moodItem) : undefined
  const tiles = shown.filter((i) => kindOf(i) === 'rating' || kindOf(i) === 'event')

  function tile(item: TrackedItem) {
    const kind = kindOf(item)
    const type = critterFor(item)
    const last = lastFor(item)
    const logged = loaded && Boolean(last)
    const colour = CRITTER_COLOUR[type]
    const at = last ? timeOf(last.occurred_at) : ''
    let right: React.ReactNode = null
    let reading: string | null = null
    let sub = loaded ? 'Tap to log' : '\u00a0'
    let aria = `${item.name}, not logged today, tap to log`
    if (kind === 'rating' && logged && last) {
      // Lead with Jo's own words; the number is a quiet extra
      const v = last.value ?? 0
      const words = v === 0 ? null : labelFor(item, v)
      reading = v === 0 ? 'None' : (words ?? `${v} out of 5`)
      sub = `Last logged ${at}` + (words ? ` · ${v}\u00a0of\u00a05` : '')
      aria = `${item.name}: ${reading}${words ? `, ${v} out of 5` : ''}, last logged ${at}`
    } else if (kind === 'event') {
      right = logged ? <span className="r-pill done">{item.name === 'Meal' ? 'Fed' : 'Done'}</span> : <span className="r-pill">Log</span>
      if (logged && last) {
        sub = `${last.description || (item.name === 'Meal' ? 'Last bite' : 'Last')} · ${at}`
        aria = `${item.name}, logged ${at}`
      }
    }
    return (
      <button
        key={item.id}
        type="button"
        className={`r-tile s-${colour}` + (poppedItem === item.id ? ' pop' : '')}
        aria-label={aria}
        onClick={() => void tap(item)}
      >
        <Critter type={type} score={kind === 'rating' ? (last?.value ?? null) : null} logged={logged} size={150} />
        <span className="r-tile-head">
          <span className="r-label">{item.name}</span>
          {right}
        </span>
        {reading && <span className={`r-reading c-${colour}`}>{reading}</span>}
        <span className="r-sub">{sub}</span>
      </button>
    )
  }

  async function goToSleep(item: TrackedItem) {
    try {
      const e = await startSleep(item.id)
      setOpenSleep(e)
      entriesChanged()
      showToast(`Asleep from ${timeOf(e.start_at!)}. Night night.`, [
        {
          label: 'Undo',
          primary: true,
          onClick: async () => {
            await deleteEntry(e.id)
            setOpenSleep(null)
            entriesChanged()
          },
        },
      ])
    } catch (err) {
      const msg = (err as Error).message
      showToast(
        /period needs a start and end/i.test(msg)
          ? 'The sleep timer needs the database update first (003_sleep_timer_and_naps.sql).'
          : `Couldn’t start: ${msg}`,
      )
    }
  }

  function sleepCard(item: TrackedItem) {
    const todays = loaded ? entries.filter((e) => e.item_id === item.id && e.start_at && e.end_at) : []
    const night = todays.find((e) => !e.is_nap)
    const naps = todays.filter((e) => e.is_nap)
    const napMins = naps.reduce((m, e) => m + (new Date(e.end_at!).getTime() - new Date(e.start_at!).getTime()) / 60000, 0)
    const napText = naps.length ? `nap ${formatDuration('1970-01-01T00:00:00Z', new Date(napMins * 60000).toISOString())}` : ''
    const asleep = openSleep && openSleep.item_id === item.id ? openSleep : null
    const logged = Boolean(night)

    let sub: string
    if (!loaded) sub = '\u00a0'
    else if (asleep) sub = `Asleep since ${timeOf(asleep.start_at!)} · ${formatDuration(asleep.start_at!, nowTick)}`
    else if (night) sub = [`Last night: ${formatDuration(night.start_at!, night.end_at!)}`, napText].filter(Boolean).join(' · ')
    else if (naps.length) sub = `No night’s sleep logged · ${napText}`
    else sub = 'Tap “Going to sleep” at bedtime'

    return (
      <div key={item.id} className={'r-sleep' + (asleep ? ' asleep' : '') + (poppedItem === item.id ? ' pop' : '')}>
        <button
          type="button"
          className="r-sleep-main"
          aria-label={
            asleep
              ? `${item.name}: asleep since ${timeOf(asleep.start_at!)}. Tap to wake up`
              : `${item.name}: ${sub}. Tap to log a sleep by hand`
          }
          onClick={() => (asleep ? setWakingFrom(asleep) : void tap(item))}
        >
          <Critter type="sleep" score={asleep ? 1 : (night?.quality ?? null)} logged={logged || Boolean(asleep)} size={84} />
          <span className="r-wide-text">
            <span className="r-label">{asleep ? 'Sleeping' : item.name}</span>
            <span className="r-sub">{sub}</span>
          </span>
        </button>
        {loaded && (
          <button
            type="button"
            className={'r-stamp display' + (asleep ? ' wake' : '')}
            onClick={() => (asleep ? setWakingFrom(asleep) : void goToSleep(item))}
          >
            {asleep ? 'I’m awake' : 'Going to sleep'}
          </button>
        )}
      </div>
    )
  }

  function medsCard() {
    const loggedMeds = meds.filter((m) => lastFor(m))
    const allLogged = loaded && loggedMeds.length === meds.length
    const allTaken = allLogged && loggedMeds.every((m) => lastFor(m)?.status === 'taken')
    const pill = !loaded ? null : allTaken ? 'All taken' : allLogged ? 'All logged' : loggedMeds.length ? `${loggedMeds.length} of ${meds.length} logged` : 'Log'
    return (
      <div key="medication-group" className={'r-meds' + (medsOpen ? ' open' : '') + (poppedItem === 'medication-group' ? ' pop' : '')}>
        <button
          type="button"
          className="r-meds-head"
          aria-expanded={medsOpen}
          aria-label={`Medication, ${loggedMeds.length} of ${meds.length} logged today, ${medsOpen ? 'hide' : 'show'} list`}
          onClick={() => toggleMeds(!medsOpen)}
        >
          <Critter type="meds" score={null} logged={allLogged} size={72} />
          <span className="r-label grow">Meds</span>
          {pill && <span className={'r-pill' + (allLogged ? ' done' : '')}>{pill}</span>}
          <svg className="chevron" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {medsOpen && (
          <div className="r-med-list">
            {meds.map((m) => (
              <button
                key={m.id}
                type="button"
                className="r-med"
                aria-label={`${m.name}, ${cardStatus(m)}, tap to log usual dose`}
                onClick={() => void tap(m)}
              >
                <span className="r-label small">{m.name}</span>
                <span className="r-sub">{cardStatus(m)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page r-today">
      <svg className="r-blobs" aria-hidden="true" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r="80" fill="#FFE800" />
        <circle cx="100" cy="98" r="80" fill="#FF48B0" opacity="0.55" />
      </svg>
      <header className="r-header">
        <span className="logo">Jo, Actually.</span>
        <span className="r-date">{dateChip(today)}</span>
      </header>

      <div className="r-hero">
        <Critter
          type="mood"
          score={moodLast?.value ?? null}
          logged={loaded && Boolean(moodLast)}
          size={112}
          label={
            moodLast && moodItem
              ? `Your mood critter, showing ${moodItem.name.toLowerCase()} ${moodLast.value} out of 5`
              : 'Your mood critter, waiting for today’s first entry'
          }
        />
        <p className="r-bubble">{loaded ? bubbleCopy(hour, shown, isLogged) : '\u00a0'}</p>
      </div>

      {itemsError && <p className="error">Couldn’t load your items: {itemsError}</p>}
      {loadError && <p className="error">Couldn’t load today’s entries: {loadError}</p>}
      {itemsLoaded && shown.length === 0 && !itemsError && (
        <p className="empty-box">Nothing to show. Add or unhide items in Settings.</p>
      )}

      <div className="r-grid">{tiles.map(tile)}</div>

      {shown.filter((i) => kindOf(i) === 'sleep').map(sleepCard)}
      {meds.length > 0 && medsCard()}

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
      {wakingFrom && (() => {
        const sleepItem = itemsById.get(wakingFrom.item_id)
        return sleepItem ? (
          <SleepSheet
            key={'wake-' + wakingFrom.id}
            item={sleepItem}
            entry={wakingFrom}
            onClose={() => setWakingFrom(null)}
            onSaved={() => {
              setPoppedItem(sleepItem.id)
              window.setTimeout(() => setPoppedItem(null), 700)
            }}
          />
        ) : null
      })()}
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
