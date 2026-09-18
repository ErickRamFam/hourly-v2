import { lifetimeEarned, lumens } from '../lib/quests'
import type { AppState } from './types'

export function selectLumens(state: AppState): number {
  return lumens(state.ledger)
}

export function selectLifetimeEarned(state: AppState): number {
  return lifetimeEarned(state.ledger)
}
