import { useApp } from '../lib/app'
import { timeOf } from '../lib/time'
import { describeValue, type Entry } from '../lib/types'
import { entryCritter } from '../lib/critters'
import { Critter } from './Critter'

export function EntryList({
  entries,
  onOpen,
  highlightId,
}: {
  entries: Entry[]
  onOpen: (e: Entry) => void
  highlightId?: string | null
}) {
  const { itemsById } = useApp()
  return (
    <ul className="entry-list">
      {entries.map((e) => {
        const item = itemsById.get(e.item_id)
        const journal = item?.type === 'journal'
        return (
          <li key={e.id}>
            <button
              type="button"
              className={'entry-row' + (e.id === highlightId ? ' fresh' : '')}
              onClick={() => onOpen(e)}
            >
              <span className="entry-critter">
                <Critter {...entryCritter(item, e)} size={30} />
              </span>
              <span className="entry-main">
                <span className="entry-top">
                  <span className="entry-name">{item?.name ?? 'Unknown'}</span>
                  <span className="entry-time">{timeOf(e.occurred_at)}</span>
                </span>
                {journal ? (
                  <span className="entry-journal">{e.note}</span>
                ) : (
                  <>
                    <span className="entry-value">{describeValue(item, e)}</span>
                    {e.note && <span className="entry-note">Note: {e.note}</span>}
                  </>
                )}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
