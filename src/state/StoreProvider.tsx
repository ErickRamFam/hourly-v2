import { useCallback, useEffect, useReducer, useRef, type ReactNode } from 'react'
import { clearAll, load, save } from '../lib/storage'
import { StoreContext } from './context'
import { reducer, type Action } from './reducer'
import type { AppState } from './types'

const SAVE_DEBOUNCE_MS = 200

export type StoreProviderProps = {
  children: ReactNode
  /** Start from a given state instead of loading from storage (tests). */
  initial?: AppState
  /** Persist to localStorage (default true). */
  persist?: boolean
}

export function StoreProvider({ children, initial, persist = true }: StoreProviderProps) {
  const [state, rawDispatch] = useReducer(reducer, initial, (seed) => seed ?? load())

  const dispatch = useCallback((action: Action) => {
    if (action.type === 'clearAll') clearAll()
    rawDispatch(action)
  }, [])

  // Debounced persistence, flushed when the page is hidden or unloaded.
  const latest = useRef(state)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirty = useRef(false)

  useEffect(() => {
    latest.current = state
    if (!persist) return
    dirty.current = true
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      dirty.current = false
      save(latest.current)
    }, SAVE_DEBOUNCE_MS)
  }, [state, persist])

  useEffect(() => {
    if (!persist) return
    const flush = () => {
      if (!dirty.current) return
      if (timer.current !== null) {
        clearTimeout(timer.current)
        timer.current = null
      }
      dirty.current = false
      save(latest.current)
    }
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [persist])

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>
}
