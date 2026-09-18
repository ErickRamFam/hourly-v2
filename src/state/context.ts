import { createContext, type Dispatch } from 'react'
import type { Action } from './reducer'
import type { AppState } from './types'

export type StoreValue = { state: AppState; dispatch: Dispatch<Action> }

export const StoreContext = createContext<StoreValue | null>(null)
