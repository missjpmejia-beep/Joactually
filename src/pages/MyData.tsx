import { useEffect, useState } from 'react'
import { useApp } from '../lib/app'
import { deleteAllEntries, deleteForever, emptyRecentlyDeleted, fetchAllEntries, fetchRecentlyDeleted, restoreEntry } from '../lib/data'
import { downloadCsv, entriesToCsv } from '../lib/csv'
import { dayHeading, dayKey, timeOf, todayKey } from '../lib/time'
import { describeValue, type Entry } from '../lib/types'
import { Sheet } from '../components/Sheet'

export function MyData() {
  const { itemsById, entriesVersion, entriesChanged, showToast } = useApp()
  const [deleted, setDeleted] = useState<Entry[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmAll, setConfirmAll] = useState(false)
  const [typed, setTyped] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchRecentlyDeleted()
      .then((list) => !cancelled && setDeleted(list))
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [entriesVersion])

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const exportCsv = () =>
    run(async () => {
      const all = await fetchAllEntries()
      downloadCsv(entriesToCsv(all, itemsById), `jo-actually-${todayKey()}.csv`)
      showToast(`Downloaded ${all.length} ${all.length === 1 ? 'entry' : 'entries'}`)
    })

  return (
    <section style={{ ['--hard' as string]: 'var(--riso-green)' }}>
      <h2 className="section-title">My data</h2>
      {error && <p className="error">{error}</p>}

      <div className="card pad">
        <p className="no-top">Download every entry as a spreadsheet (CSV). Times are UK time.</p>
        <button type="button" className="btn ghost" disabled={busy} onClick={exportCsv}>
          Download CSV
        </button>
      </div>

      <h3 className="sub-title">Recently deleted</h3>
      <p className="muted small">Deleted entries can be restored for 30 days, then they’re removed for good.</p>
      {deleted === null ? null : deleted.length === 0 ? (
        <p className="empty-box">Nothing here.</p>
      ) : (
        <>
          <ul className="card item-list">
            {deleted.map((e) => {
              const item = itemsById.get(e.item_id)
              const k = dayKey(e.occurred_at)
              return (
                <li key={e.id} className="item-row">
                  <div className="item-info">
                    <span className="item-name">
                      {item?.name ?? 'Unknown'} <span className="muted">{describeValue(item, e)}</span>
                    </span>
                    <span className="muted small">
                      {dayHeading(k)} · {timeOf(e.occurred_at)}
                      {e.note ? ` · ${e.note}` : ''}
                    </span>
                  </div>
                  <div className="item-actions">
                    <button
                      type="button"
                      className="btn small ghost"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await restoreEntry(e.id)
                          entriesChanged()
                          showToast(`${item?.name ?? 'Entry'} restored`)
                        })
                      }
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      className="btn small danger-text"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await deleteForever(e.id)
                          entriesChanged()
                        })
                      }
                    >
                      Delete forever
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          <button
            type="button"
            className="btn ghost wide"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await emptyRecentlyDeleted()
                entriesChanged()
                showToast('Recently deleted emptied')
              })
            }
          >
            Delete all of these forever
          </button>
        </>
      )}

      <h3 className="sub-title">Permanently delete</h3>
      <button type="button" className="btn danger wide" onClick={() => setConfirmAll(true)}>
        Delete all my entries permanently…
      </button>

      {confirmAll && (
        <Sheet open onClose={() => setConfirmAll(false)} title="Delete everything?">
          <p>
            This permanently deletes <strong>every entry</strong> you’ve ever logged, including recently deleted ones.
            It can’t be undone. Your list of tracked items stays.
          </p>
          <p className="muted small">Download a CSV first if you might want it later.</p>
          <label className="field">
            <span>Type DELETE to confirm</span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" />
          </label>
          <div className="sheet-actions">
            <span className="spacer" />
            <button type="button" className="btn ghost" onClick={() => setConfirmAll(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn danger"
              disabled={busy || typed.trim() !== 'DELETE'}
              onClick={() =>
                run(async () => {
                  await deleteAllEntries()
                  entriesChanged()
                  setConfirmAll(false)
                  setTyped('')
                  showToast('All entries permanently deleted')
                })
              }
            >
              Delete everything
            </button>
          </div>
        </Sheet>
      )}
    </section>
  )
}
