import { useState } from 'react'
import { useApp } from '../lib/app'
import { addItem, updateItem } from '../lib/data'
import { supabase } from '../lib/supabase'
import { getTheme, setTheme, type ThemeChoice } from '../lib/theme'
import type { Direction, TrackedItem } from '../lib/types'
import { Sheet } from '../components/Sheet'

export function Settings() {
  const { items, reloadItems, showToast } = useApp()
  const [editing, setEditing] = useState<TrackedItem | 'new' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ratings = items.filter((i) => i.type === 'rating')
  const later = items.filter((i) => i.type !== 'rating')

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
    const list = [...ratings]
    const j = index + delta
    if (j < 0 || j >= list.length) return
    ;[list[index], list[j]] = [list[j], list[index]]
    void run(async () => {
      // Rewrite the order for every rating item so positions stay tidy
      await Promise.all(list.map((it, i) => (it.sort_order === i ? null : updateItem(it.id, { sort_order: i }))))
    })
  }

  function toggleShown(item: TrackedItem) {
    void run(async () => {
      await updateItem(item.id, { shown: !item.shown })
      showToast(`${item.name} ${item.shown ? 'hidden' : 'shown'}`)
    })
  }

  return (
    <div className="page">
      <h1>Settings</h1>

      <section>
        <h2 className="section-title">What I track</h2>
        {error && <p className="error">{error}</p>}
        <ul className="card item-list">
          {ratings.map((item, i) => (
            <li key={item.id} className={'item-row' + (item.shown ? '' : ' is-hidden')}>
              <div className="item-info">
                <span className="item-name">{item.name}</span>
                <span className="muted small">
                  {item.label_low && item.label_high ? `1 ${item.label_low} → 5 ${item.label_high}` : 'Rating 1–5'}
                  {item.allows_none ? ' · has “None”' : ''}
                  {item.shown ? '' : ' · hidden'}
                </span>
              </div>
              <div className="item-actions">
                <button type="button" className="icon-btn" aria-label={`Move ${item.name} up`} disabled={busy || i === 0} onClick={() => move(i, -1)}>
                  ↑
                </button>
                <button type="button" className="icon-btn" aria-label={`Move ${item.name} down`} disabled={busy || i === ratings.length - 1} onClick={() => move(i, 1)}>
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
        <button type="button" className="btn primary wide" onClick={() => setEditing('new')}>
          Add something to rate
        </button>
        {later.length > 0 && (
          <p className="muted small">
            {later.map((i) => i.name).join(' and ')} are set up but switched off until Stage 2.
          </p>
        )}
      </section>

      <Appearance />

      <section>
        <h2 className="section-title">My data</h2>
        <p className="muted small">Download as CSV and recovering deleted entries arrive in Stage 2.</p>
      </section>

      <Account />

      {editing && (
        <ItemEditor
          key={editing === 'new' ? 'new' : editing.id}
          item={editing === 'new' ? null : editing}
          nextOrder={ratings.length ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0}
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
  nextOrder,
  onClose,
  onSaved,
}: {
  item: TrackedItem | null
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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clean = (s: string) => (s.trim() ? s.trim() : null)
  const valid = name.trim().length > 0 && labels[0].trim() && labels[4].trim()

  async function save() {
    setBusy(true)
    setError(null)
    const fields = {
      name: name.trim(),
      direction,
      label_low: clean(labels[0]),
      label_2: clean(labels[1]),
      label_3: clean(labels[2]),
      label_4: clean(labels[3]),
      label_high: clean(labels[4]),
      allows_none: allowsNone,
    }
    try {
      if (item) await updateItem(item.id, fields)
      else await addItem({ ...fields, type: 'rating', shown: true, sort_order: nextOrder })
      onSaved(fields.name)
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title={item ? `Edit ${item.name}` : 'Add something to rate'}>
      <label className="field">
        <span>Name</span>
        <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="e.g. Headache" />
      </label>

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
    <section>
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
    <section>
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
