import type { Completions, LedgerEntry, Quest } from '../lib/quests'

export type ThemeOverride = 'auto' | 'light' | 'dark'
export type SecondHandMode = 'sweep' | 'tick' | 'hidden'
export type ReduceMotion = 'system' | 'on'
/** How the clock shows the hours (DESIGN.md §6, Clock display). */
export type ClockFill = 'blend' | 'hour' | 'solid' | 'accent'
export type Panel = 'none' | 'collection' | 'settings'
export type ItemKind = 'dial' | 'sky'

export const THEME_OVERRIDES: readonly ThemeOverride[] = ['auto', 'light', 'dark']
export const SECOND_HAND_MODES: readonly SecondHandMode[] = ['sweep', 'tick', 'hidden']
export const REDUCE_MOTION_MODES: readonly ReduceMotion[] = ['system', 'on']
export const CLOCK_FILL_MODES: readonly ClockFill[] = ['blend', 'hour', 'solid', 'accent']
export const PANELS: readonly Panel[] = ['none', 'collection', 'settings']

export type Settings = {
  themeOverride: ThemeOverride
  /** Hour (0–23) at which the light theme begins in auto mode. */
  dayStart: number
  /** Hour (0–23) at which the dark theme begins in auto mode. */
  nightStart: number
  secondHand: SecondHandMode
  use24h: boolean
  reduceMotion: ReduceMotion
  /** Length in seconds (60 to 3600, whole minutes) that the P key starts when no timer is set. */
  defaultTimerSec: number
  clockFill: ClockFill
  /** Off bypasses the lumen economy: everything can be equipped and no lumen UI shows. */
  lumensEnabled: boolean
}

export type Owned = { dials: string[]; skies: string[] }
export type Equipped = { dial: string; sky: string }
export type UiState = { panel: Panel }

export type AppState = {
  schemaVersion: 1
  settings: Settings
  quests: Quest[]
  completions: Completions
  ledger: LedgerEntry[]
  owned: Owned
  equipped: Equipped
  /** Not persisted. */
  ui: UiState
}

/** Everything that goes to localStorage (state minus transient UI). */
export type PersistedState = Omit<AppState, 'ui'>
