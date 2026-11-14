import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { TrackedItem } from './types'
import { fetchItems, seedStarterItems } from './data'

export interface ToastAction {
  label: string
  primary?: boolean
  onClick: () => void
}

export interface Toast {
  id: number
  text: string
  actions: ToastAction[]
}

interface AppState {
  items: TrackedItem[]
  itemsById: Map<string, TrackedItem>
  itemsLoaded: boolean
  itemsError: string | null
  reloadItems: () => Promise<void>
  toast: Toast | null
  showToast: (text: string, actions?: ToastAction[]) => void
  hideToast: () => void
  /** Bumped whenever entries change, so screens can refetch. */
  entriesVersion: number
  entriesChanged: () => void
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<TrackedItem[]>([])
  const [itemsLoaded, setItemsLoaded] = useState(false)
  const [itemsError, setItemsError] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [entriesVersion, setEntriesVersion] = useState(0)
  const timer = useRef<number | undefined>(undefined)
  const seeding = useRef(false)

  const reloadItems = useCallback(async () => {
    try {
      let list = await fetchItems()
      if (list.length === 0 && !seeding.current) {
        seeding.current = true
        await seedStarterItems()
        list = await fetchItems()
      }
      setItems(list)
      setItemsError(null)
    } catch (e) {
      setItemsError((e as Error).message)
    } finally {
      setItemsLoaded(true)
    }
  }, [])

  useEffect(() => {
    void reloadItems()
  }, [reloadItems])

  const hideToast = useCallback(() => {
    window.clearTimeout(timer.current)
    setToast(null)
  }, [])

  const showToast = useCallback((text: string, actions: ToastAction[] = []) => {
    window.clearTimeout(timer.current)
    setToast({ id: Date.now(), text, actions })
    timer.current = window.setTimeout(() => setToast(null), 8000)
  }, [])

  const entriesChanged = useCallback(() => setEntriesVersion((v) => v + 1), [])

  const itemsById = new Map(items.map((i) => [i.id, i]))

  return (
    <Ctx.Provider
      value={{
        items,
        itemsById,
        itemsLoaded,
        itemsError,
        reloadItems,
        toast,
        showToast,
        hideToast,
        entriesVersion,
        entriesChanged,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp outside AppProvider')
  return v
}
