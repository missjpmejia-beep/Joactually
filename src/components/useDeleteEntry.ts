import { useApp } from '../lib/app'
import { deleteEntry, restoreEntry } from '../lib/data'
import type { Entry } from '../lib/types'

/** Soft-delete an entry and offer Undo. */
export function useDeleteEntry() {
  const { itemsById, showToast, entriesChanged } = useApp()
  return async (entry: Entry) => {
    await deleteEntry(entry.id)
    entriesChanged()
    const name = itemsById.get(entry.item_id)?.name ?? 'Entry'
    showToast(`${name} deleted`, [
      {
        label: 'Undo',
        primary: true,
        onClick: async () => {
          await restoreEntry(entry.id)
          entriesChanged()
        },
      },
    ])
  }
}
