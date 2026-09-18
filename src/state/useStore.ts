import { useContext } from 'react'
import { StoreContext, type StoreValue } from './context'
import type { Action } from './reducer'
import { selectLifetimeEarned, selectLumens } from './selectors'
import type { AppState } from './types'

export function useStore(): StoreValue {
  const value = useContext(StoreContext)
  if (!value) throw new Error('useStore must be used inside <StoreProvider>')
  return value
}

export function useAppState(): AppState {
  return useStore().state
}

export function useDispatch(): (action: Action) => void {
  return useStore().dispatch
}

export function useLumens(): { balance: number; lifetime: number } {
  const state = useAppState()
  return { balance: selectLumens(state), lifetime: selectLifetimeEarned(state) }
}
