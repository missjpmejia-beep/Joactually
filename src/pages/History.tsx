import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../lib/app'
import { fetchEntries, searchEntries } from '../lib/data'
import { addDays, dayHeading, dayKey, todayKey } from '../lib/time'
import type { Entry } from '../lib/types'
import { EntryList } from '../components/EntryList'
import { EntryEditor } from '../components/EntryEditor'
import { SHADOW_CYCLE } from '../lib/critters'

const PAGE_DAYS = 30

export function History() {
  const { items, entriesVersion } = useApp()
  const [days, setDays] = useState(PAGE_DAYS)
  const [itemId, setItemId] = useState<string>('')
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Entry | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 300)
    return () => window.clearTimeout(t)
  }, [query])

  const today = todayKey()
  const fromDay = addDays(today, -(days - 1))
  const searching = debounced.length > 0

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const p = searching
      ? searchEntries(debounced, itemId || undefined)
      : fetchEntries({ fromDay, toDay: today, itemId: itemId || undefined })
    p.then((list) => {
      if (!cancelled) {
        setEntries(list)
        setError(null)
      }
    })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [fromDay, today, itemId, debounced, searching, entriesVersion])

  const groups = useMemo(() => {
    const byDay = new Map<string, Entry[]>()
    for (const e of entries) {
      const k = dayKey(e.occurred_at)
      if (!byDay.has(k)) byDay.set(k, [])
      byDay.get(k)!.push(e)
    }
    if (searching) return [...byDay.entries()]
    // Every day in range, including empty ones, so gaps are visible
    const out: [string, Entry[]][] = []
    for (let k = today; k >= fromDay; k = addDays(k, -1)) out.push([k, byDay.get(k) ?? []])
    return out
  }, [entries, searching, today, fromDay])


  return (
    <div className="page">
      <h1><span className="marker">History</span></h1>
      <label className="field">
        <span>Search notes, meals and journal</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. pasta, tired, work"
        />
      </label>

      <div className="chips" role="group" aria-label="Filter by item">
        <button type="button" className={'chip' + (itemId === '' ? ' on' : '')} onClick={() => setItemId('')}>
          All
        </button>
        {items.map((i) => (
          <button
            key={i.id}
            type="button"
            className={'chip' + (itemId === i.id ? ' on' : '')}
            onClick={() => setItemId(i.id)}
          >
            {i.name}
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}
      {searching && !loading && entries.length === 0 && <p className="empty-box">No notes match “{debounced}”.</p>}

      {groups.map(([k, list], i) => (
        <section key={k} style={{ ['--hard' as string]: SHADOW_CYCLE[i % SHADOW_CYCLE.length] }}>
          <h2 className="section-title">{dayHeading(k)}</h2>
          {list.length > 0 ? (
            <div className="card">
              <EntryList entries={list} onOpen={setEditing} />
            </div>
          ) : (
            <p className="empty-box">{loading ? '…' : 'Nothing logged. That’s fine.'}</p>
          )}
        </section>
      ))}

      {!searching && (
        <button type="button" className="btn ghost wide" onClick={() => setDays((d) => d + PAGE_DAYS)}>
          Show earlier days
        </button>
      )}

      {editing && <EntryEditor key={editing.id} entry={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
