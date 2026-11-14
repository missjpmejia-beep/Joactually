import { useState } from 'react'
import { useApp } from '../lib/app'
import { addItem, updateItem } from '../lib/data'
import { supabase } from '../lib/supabase'
import { getTheme, setTheme, type ThemeChoice } from '../lib/theme'
import { formatAmount, kindOf, type Direction, type ItemKind, type TrackedItem } from '../lib/types'
import { Sheet } from '../components/Sheet'
import { MyData } from './MyData'
import { Critter } from '../components/Critter'
import { sampleCritter } from '../lib/critters'

const KIND_LABEL: Record<ItemKind, string> = {
  rating: 'Rating',
  medication: 'Medication',
  event: 'Event',
  sleep: 'Sleep',
}

function summary(item: TrackedItem): string {
  const kind = kindOf(item)
  if (kind === 'rating') {
    const scale = item.label_low && item.label_high ? `1 ${item.label_low} → 5 ${item.label_high}` : 'Rating 1–5'
    return scale + (item.allows_none ? ' · has “None”' : '')
  }
  if (kind === 'medication') {
    const dose = formatAmount(item.default_amount, item.default_unit)
    return dose ? `Medication · usual dose ${dose}` : 'Medication'
  }
  if (kind === 'sleep') return 'Bedtime, wake time and quality'
  return item.default_unit ? `Event · measured in ${item.default_unit}` : 'Event · description and size'
}

type Editing = TrackedItem | { new: Exclude<ItemKind, 'sleep'> } | null

export function Settings() {
  const { items, reloadItems, showToast } = useApp()
  const [editing, setEditing] = useState<Editing>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await reloadItems()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function move(index: number, delta: -1 | 1) {
    const list = [...items]
    const j = index + delta
    if (j < 0 || j >= list.length) return
    ;[list[index], list[j]] = [list[j], list[index]]
    void run(async () => {
      // Rewrite every position so the order stays tidy
      await Promise.all(list.map((it, i) => (it.sort_order === i ? null : updateItem(it.id, { sort_order: i }))))
    })
  }

  function toggleShown(item: TrackedItem) {
    void run(async () => {
      await updateItem(item.id, { shown: !item.shown })
      showToast(`${item.name} ${item.shown ? 'hidden' : 'shown'}`)
    })
  }

  const nextOrder = items.length ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0

  return (
    <div className="page">
      <h1><span className="marker">Settings</span></h1>

      <section style={{ ['--hard' as string]: 'var(--riso-pink)' }}>
        <h2 className="section-title">What I track</h2>
        {error && <p className="error">{error}</p>}
        <ul className="card item-list">
          {items.map((item, i) => (
            <li key={item.id} className={'item-row' + (item.shown ? '' : ' is-hidden')}>
              <span className="item-critter">
                <Critter {...sampleCritter(item)} size={44} />
              </span>
              <div className="item-info">
                <span className="item-name">
                  {item.name} <span className="kind-tag">{KIND_LABEL[kindOf(item)]}</span>
                </span>
                <span className="muted small">
                  {summary(item)}
                  {item.shown ? '' : ' · hidden'}
                </span>
              </div>
              <div className="item-actions">
                <button type="button" className="icon-btn" aria-label={`Move ${item.name} up`} disabled={busy || i === 0} onClick={() => move(i, -1)}>
                  ↑
                </button>
                <button type="button" className="icon-btn" aria-label={`Move ${item.name} down`} disabled={busy || i === items.length - 1} onClick={() => move(i, 1)}>
                  ↓
                </button>
                <button type="button" className="btn small ghost" disabled={busy} onClick={() => toggleShown(item)}>
                  {item.shown ? 'Hide' : 'Show'}
                </button>
                <button type="button" className="btn small ghost" disabled={busy} onClick={() => setEditing(item)}>
                  Edit
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="add-row">
          <button type="button" className="btn primary" onClick={() => setEditing({ new: 'rating' })}>
            + Rating
          </button>
          <button type="button" className="btn primary" onClick={() => setEditing({ new: 'medication' })}>
            + Medication
          </button>
          <button type="button" className="btn primary" onClick={() => setEditing({ new: 'event' })}>
            + Event
          </button>
        </div>
        <p className="muted small">
          Rating: a 1–5 score like mood or a symptom. Medication: one tap logs your usual dose. Event: something that
          happens, like a meal or caffeine.
        </p>
      </section>

      <Appearance />

      <MyData />

      <Account />

      {editing && (
        <ItemEditor
          key={'id' in editing ? editing.id : 'new-' + editing.new}
          item={'id' in editing ? editing : null}
          kind={'id' in editing ? kindOf(editing) : editing.new}
          nextOrder={nextOrder}
          onClose={() => setEditing(null)}
          onSaved={async (name) => {
            setEditing(null)
            await reloadItems()
            showToast(`${name} saved`)
          }}
        />
      )}
    </div>
  )
}

function ItemEditor({
  item,
  kind,
  nextOrder,
  onClose,
  onSaved,
}: {
  item: TrackedItem | null
  kind: ItemKind
  nextOrder: number
  onClose: () => void
  onSaved: (name: string) => void
}) {
  const [name, setName] = useState(item?.name ?? '')
  const [direction, setDirection] = useState<Direction>(item?.direction ?? 'higher_is_better')
  const [labels, setLabels] = useState<string[]>([
    item?.label_low ?? '',
    item?.label_2 ?? '',
    item?.label_3 ?? '',
    item?.label_4 ?? '',
    item?.label_high ?? '',
  ])
  const [allowsNone, setAllowsNone] = useState(item?.allows_none ?? false)
  const [amount, setAmount] = useState(item?.default_amount?.toString() ?? '')
  const [unit, setUnit] = useState(item?.default_unit ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clean = (s: string) => (s.trim() ? s.trim() : null)
  const amt = amount.trim() === '' ? null : Number(amount.replace(',', '.'))
  const amountOk = amt === null || (Number.isFinite(amt) && amt >= 0)
  const valid =
    name.trim().length > 0 && amountOk && (kind !== 'rating' || (labels[0].trim() && labels[4].trim()))

  async function save() {
    setBusy(true)
    setError(null)
    let fields: Partial<TrackedItem> = { name: name.trim() }
    if (kind === 'rating') {
      fields = {
        ...fields,
        direction,
        label_low: clean(labels[0]),
        label_2: clean(labels[1]),
        label_3: clean(labels[2]),
        label_4: clean(labels[3]),
        label_high: clean(labels[4]),
        allows_none: allowsNone,
      }
    } else if (kind === 'medication') {
      fields = { ...fields, default_amount: amt, default_unit: clean(unit) }
    } else if (kind === 'event') {
      fields = { ...fields, default_unit: clean(unit) }
    }
    try {
      if (item) await updateItem(item.id, fields)
      else
        await addItem({
          ...fields,
          type: kind === 'rating' ? 'rating' : 'event',
          is_medication: kind === 'medication',
          shown: true,
          sort_order: nextOrder,
        })
      onSaved(fields.name!)
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  const title = item ? `Edit ${item.name}` : `Add ${KIND_LABEL[kind].toLowerCase()}`
  const placeholder = { rating: 'e.g. Headache', medication: 'e.g. Sertraline', event: 'e.g. Caffeine', sleep: '' }[kind]

  return (
    <Sheet open onClose={onClose} title={title}>
      <label className="field">
        <span>Name</span>
        <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder={placeholder} />
      </label>

      {kind === 'rating' && (
        <>
          <fieldset className="field">
            <legend>Which way is good?</legend>
            <div className="segmented">
              <button type="button" className={direction === 'higher_is_better' ? 'on' : ''} onClick={() => setDirection('higher_is_better')}>
                Higher is better
              </button>
              <button type="button" className={direction === 'higher_is_worse' ? 'on' : ''} onClick={() => setDirection('higher_is_worse')}>
                Higher is worse
              </button>
            </div>
          </fieldset>

          <fieldset className="field">
            <legend>Words for each number</legend>
            {labels.map((l, i) => (
              <label key={i} className="label-input">
                <span className="rating-num">{i + 1}</span>
                <input
                  value={l}
                  maxLength={30}
                  placeholder={i === 0 || i === 4 ? 'Required' : 'Optional'}
                  onChange={(e) => setLabels((ls) => ls.map((x, j) => (j === i ? e.target.value : x)))}
                />
              </label>
            ))}
            {item && <p className="muted small">Changing words never changes the numbers you’ve already logged.</p>}
          </fieldset>

          <label className="check">
            <input type="checkbox" checked={allowsNone} onChange={(e) => setAllowsNone(e.target.checked)} />
            <span>
              It’s a symptom: offer a <strong>None</strong> button
              <span className="muted small block">“None” means you checked and it wasn’t there, which is different from not logging.</span>
            </span>
          </label>
        </>
      )}

      {kind === 'medication' && (
        <>
          <div className="field-row">
            <label className="field">
              <span>Usual dose</span>
              <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 30" />
            </label>
            <label className="field">
              <span>Unit</span>
              <input value={unit} maxLength={20} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. mg" />
            </label>
          </div>
          <p className="muted small">Tapping it on Today logs this dose as taken, right now. You can change it afterwards.</p>
          {item && <p className="muted small">Changing the usual dose doesn’t change doses you’ve already logged.</p>}
        </>
      )}

      {kind === 'event' && (
        <label className="field">
          <span>Measured in (optional)</span>
          <input value={unit} maxLength={20} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. cups" />
          <span className="muted small">Leave blank if you just want a description and size, like a meal.</span>
        </label>
      )}

      {!amountOk && <p className="error">Usual dose needs to be a number.</p>}
      {error && <p className="error">{error}</p>}
      <div className="sheet-actions">
        <span className="spacer" />
        <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="btn primary" onClick={save} disabled={busy || !valid}>
          Save
        </button>
      </div>
    </Sheet>
  )
}

function Appearance() {
  const [choice, setChoice] = useState<ThemeChoice>(getTheme())
  const pick = (c: ThemeChoice) => {
    setChoice(c)
    setTheme(c)
  }
  return (
    <section style={{ ['--hard' as string]: 'var(--riso-yellow)' }}>
      <h2 className="section-title">Appearance</h2>
      <div className="segmented">
        {(['light', 'dark', 'system'] as const).map((c) => (
          <button key={c} type="button" className={choice === c ? 'on' : ''} onClick={() => pick(c)}>
            {c === 'system' ? 'Match device' : c[0].toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>
    </section>
  )
}

function Account() {
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) setError(error.message)
    else {
      setPw('')
      setMsg('Password changed.')
    }
  }

  return (
    <section style={{ ['--hard' as string]: 'var(--riso-blue)' }}>
      <h2 className="section-title">Account</h2>
      <form className="card pad" onSubmit={changePassword}>
        <label className="field">
          <span>New password</span>
          <input type="password" autoComplete="new-password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} />
        </label>
        {error && <p className="error">{error}</p>}
        {msg && <p className="success">{msg}</p>}
        <button type="submit" className="btn ghost" disabled={busy || pw.length < 8}>
          Change password
        </button>
      </form>
      <button type="button" className="btn ghost wide" onClick={() => supabase.auth.signOut()}>
        Sign out
      </button>
    </section>
  )
}
