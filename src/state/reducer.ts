import { DEFAULT_DIAL_ID, getDial, isDialId } from '../lib/dials'
import * as Q from '../lib/quests'
import { DEFAULT_SKY_ID, SKIES, getSky } from '../lib/skies'
import { MAX_TIMER_SEC, MIN_TIMER_SEC, initialState } from '../lib/storage'
import { dayKey } from '../lib/time'
import { CLOCK_FILL_MODES, type AppState, type ItemKind, type Panel, type Settings } from './types'

export type Action =
  | { type: 'addQuest'; title: string; repeats: boolean; now: number; id?: string }
  | { type: 'renameQuest'; id: string; title: string }
  | { type: 'removeQuest'; id: string }
  | { type: 'restoreQuest'; removed: Q.RemovedQuest }
  | { type: 'toggleQuest'; id: string; now: number }
  | { type: 'updateSettings'; patch: Partial<Settings> }
  | { type: 'unlock'; kind: ItemKind; id: string; now: number }
  | { type: 'equip'; kind: ItemKind; id: string }
  | { type: 'setPanel'; panel: Panel }
  | { type: 'clearAll' }

function itemExists(kind: ItemKind, id: string): boolean {
  return kind === 'dial' ? isDialId(id) : SKIES.some((s) => s.id === id)
}

function itemPrice(kind: ItemKind, id: string): number {
  return kind === 'dial' ? getDial(id).price : getSky(id).price
}

function ownedList(state: AppState, kind: ItemKind): string[] {
  return kind === 'dial' ? state.owned.dials : state.owned.skies
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'addQuest': {
      const day = dayKey(new Date(action.now))
      const quests = Q.addQuest(state.quests, action.title, action.repeats, day, action.id)
      return quests === state.quests ? state : { ...state, quests }
    }
    case 'renameQuest': {
      const quests = Q.renameQuest(state.quests, action.id, action.title)
      return quests === state.quests ? state : { ...state, quests }
    }
    case 'removeQuest': {
      const { quests, completions } = Q.removeQuest(state.quests, state.completions, action.id)
      return quests === state.quests ? state : { ...state, quests, completions }
    }
    case 'restoreQuest': {
      const { quests, completions } = Q.restoreQuest(state.quests, state.completions, action.removed)
      return quests === state.quests ? state : { ...state, quests, completions }
    }
    case 'toggleQuest': {
      const day = dayKey(new Date(action.now))
      const { completions, ledger } = Q.toggleQuest(
        state.quests,
        state.completions,
        state.ledger,
        day,
        action.id,
        action.now,
      )
      if (completions === state.completions) return state
      return { ...state, completions, ledger }
    }
    case 'updateSettings': {
      const next: Settings = { ...state.settings }
      const p = action.patch
      if (p.themeOverride !== undefined) next.themeOverride = p.themeOverride
      if (p.secondHand !== undefined) next.secondHand = p.secondHand
      if (p.reduceMotion !== undefined) next.reduceMotion = p.reduceMotion
      if (p.use24h !== undefined) next.use24h = p.use24h
      if (p.clockFill !== undefined && CLOCK_FILL_MODES.includes(p.clockFill)) next.clockFill = p.clockFill
      if (typeof p.lumensEnabled === 'boolean') next.lumensEnabled = p.lumensEnabled
      if (p.dayStart !== undefined && Number.isInteger(p.dayStart) && p.dayStart >= 0 && p.dayStart <= 23) {
        next.dayStart = p.dayStart
      }
      if (p.nightStart !== undefined && Number.isInteger(p.nightStart) && p.nightStart >= 0 && p.nightStart <= 23) {
        next.nightStart = p.nightStart
      }
      const t = p.defaultTimerSec
      if (t !== undefined && Number.isInteger(t) && t % 60 === 0 && t >= MIN_TIMER_SEC && t <= MAX_TIMER_SEC) {
        next.defaultTimerSec = t
      }
      // Lumens back on: anything equipped for free that was never bought goes back to the
      // default. owned is the record of what was bought, so nothing else needs undoing.
      if (!state.settings.lumensEnabled && next.lumensEnabled) {
        const dial = state.owned.dials.includes(state.equipped.dial) ? state.equipped.dial : DEFAULT_DIAL_ID
        const sky = state.owned.skies.includes(state.equipped.sky) ? state.equipped.sky : DEFAULT_SKY_ID
        if (dial !== state.equipped.dial || sky !== state.equipped.sky) return { ...state, settings: next, equipped: { dial, sky } }
      }
      return { ...state, settings: next }
    }
    case 'unlock': {
      // Nothing is for sale while lumens are off.
      if (!state.settings.lumensEnabled) return state
      if (!itemExists(action.kind, action.id)) return state
      if (ownedList(state, action.kind).includes(action.id)) return state
      const price = itemPrice(action.kind, action.id)
      if (Q.lumens(state.ledger) < price) return state
      const entry: Q.LedgerEntry = {
        id: `unlock-${action.kind}-${action.id}`,
        at: action.now,
        delta: -price,
        reason: 'unlock',
        ref: `${action.kind}:${action.id}`,
      }
      const owned =
        action.kind === 'dial'
          ? { ...state.owned, dials: [...state.owned.dials, action.id] }
          : { ...state.owned, skies: [...state.owned.skies, action.id] }
      return { ...state, owned, ledger: [...state.ledger, entry] }
    }
    case 'equip': {
      // Lumens off: anything in the catalog equips for free, without touching owned or the ledger.
      if (!itemExists(action.kind, action.id)) return state
      if (state.settings.lumensEnabled && !ownedList(state, action.kind).includes(action.id)) return state
      const equipped = action.kind === 'dial' ? { ...state.equipped, dial: action.id } : { ...state.equipped, sky: action.id }
      if (equipped.dial === state.equipped.dial && equipped.sky === state.equipped.sky) return state
      return { ...state, equipped }
    }
    case 'setPanel':
      return state.ui.panel === action.panel ? state : { ...state, ui: { panel: action.panel } }
    case 'clearAll':
      return initialState()
  }
}
