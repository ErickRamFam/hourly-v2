import { describe, expect, it } from 'vitest'
import { initialState } from '../../lib/storage'
import { lumens, removedQuest } from '../../lib/quests'
import { reducer, type Action } from '../reducer'
import type { AppState } from '../types'
import { selectLifetimeEarned, selectLumens } from '../selectors'

const NOON = new Date(2026, 8, 17, 12, 0).getTime()

function run(actions: Action[], start: AppState = initialState()): AppState {
  return actions.reduce(reducer, start)
}

const DAY_MS = 86_400_000

/** Earns 3 lumens per `count`: one one-off quest per day, each completed (+1) and clearing its day (+2). */
function earn(state: AppState, count: number): AppState {
  let s = state
  for (let i = 0; i < count; i++) {
    const now = NOON + i * DAY_MS
    s = reducer(s, { type: 'addQuest', title: `q${i}`, repeats: false, now, id: `q${i}` })
    s = reducer(s, { type: 'toggleQuest', id: `q${i}`, now })
  }
  return s
}

describe('quests through the reducer', () => {
  it('adds, toggles, and removes with the day derived from now', () => {
    let s = run([{ type: 'addQuest', title: 'Read', repeats: true, now: NOON, id: 'r' }])
    expect(s.quests[0]).toEqual({ id: 'r', title: 'Read', repeats: true, createdDay: '2026-09-17' })
    s = reducer(s, { type: 'toggleQuest', id: 'r', now: NOON })
    expect(s.completions['2026-09-17']).toEqual(['r'])
    expect(selectLumens(s)).toBe(3)
    s = reducer(s, { type: 'removeQuest', id: 'r' })
    expect(s.quests).toEqual([])
    expect(s.completions).toEqual({})
    expect(selectLumens(s)).toBe(3)
  })
  it('restores a removed quest in place without touching the ledger', () => {
    let s = run([
      { type: 'addQuest', title: 'A', repeats: true, now: NOON, id: 'a' },
      { type: 'addQuest', title: 'B', repeats: false, now: NOON, id: 'b' },
      { type: 'addQuest', title: 'C', repeats: false, now: NOON, id: 'c' },
      { type: 'toggleQuest', id: 'b', now: NOON },
    ])
    const before = s
    const removed = removedQuest(s.quests, s.completions, 'b')!
    s = reducer(s, { type: 'removeQuest', id: 'b' })
    expect(s.ledger).toBe(before.ledger)
    s = reducer(s, { type: 'restoreQuest', removed })
    expect(s.ledger).toBe(before.ledger)
    expect(s.quests).toEqual(before.quests)
    expect(s.completions).toEqual(before.completions)
    expect(selectLumens(s)).toBe(1)
    // Re-checking the restored quest after an uncheck earns nothing more.
    s = reducer(reducer(s, { type: 'toggleQuest', id: 'b', now: NOON }), { type: 'toggleQuest', id: 'b', now: NOON })
    expect(selectLumens(s)).toBe(1)
    expect(reducer(s, { type: 'restoreQuest', removed })).toBe(s)
  })
  it('returns the same state for no-op actions', () => {
    const s = initialState()
    expect(reducer(s, { type: 'addQuest', title: '   ', repeats: false, now: NOON })).toBe(s)
    expect(reducer(s, { type: 'toggleQuest', id: 'ghost', now: NOON })).toBe(s)
    expect(reducer(s, { type: 'removeQuest', id: 'ghost' })).toBe(s)
    expect(reducer(s, { type: 'equip', kind: 'dial', id: 'sector' })).toBe(s)
    expect(reducer(s, { type: 'setPanel', panel: 'none' })).toBe(s)
  })
})

describe('unlock', () => {
  it('fails silently when unaffordable', () => {
    const s = earn(initialState(), 1) // 3 lumens
    const after = reducer(s, { type: 'unlock', kind: 'dial', id: 'hairline', now: NOON }) // costs 6
    expect(after).toBe(s)
    expect(after.owned.dials).toEqual(['sector'])
  })
  it('spends lumens and records an unlock entry when affordable', () => {
    const s = earn(initialState(), 2) // 6 lumens
    const after = reducer(s, { type: 'unlock', kind: 'dial', id: 'hairline', now: NOON })
    expect(after.owned.dials).toEqual(['sector', 'hairline'])
    expect(selectLumens(after)).toBe(0)
    expect(selectLifetimeEarned(after)).toBe(6)
    expect(after.ledger.at(-1)).toMatchObject({ delta: -6, reason: 'unlock', ref: 'dial:hairline' })
    expect(after.equipped.dial).toBe('sector')
  })
  it('ignores unknown items and items already owned', () => {
    const s = earn(initialState(), 4) // 12 lumens
    expect(reducer(s, { type: 'unlock', kind: 'sky', id: 'nebula', now: NOON })).toBe(s)
    expect(reducer(s, { type: 'unlock', kind: 'sky', id: 'daylight', now: NOON })).toBe(s)
    const once = reducer(s, { type: 'unlock', kind: 'sky', id: 'ember', now: NOON })
    expect(reducer(once, { type: 'unlock', kind: 'sky', id: 'ember', now: NOON })).toBe(once)
    expect(lumens(once.ledger)).toBe(4)
  })
})

describe('equip', () => {
  it('equips only owned items', () => {
    const s = initialState()
    expect(reducer(s, { type: 'equip', kind: 'sky', id: 'tide' })).toBe(s)
    const owned = reducer(earn(s, 3), { type: 'unlock', kind: 'sky', id: 'tide', now: NOON })
    const equipped = reducer(owned, { type: 'equip', kind: 'sky', id: 'tide' })
    expect(equipped.equipped).toEqual({ dial: 'sector', sky: 'tide' })
  })
})

describe('settings and ui', () => {
  it('applies valid patches and drops out-of-range hours', () => {
    const s = run([{ type: 'updateSettings', patch: { themeOverride: 'dark', dayStart: 25, nightStart: 22, use24h: true } }])
    expect(s.settings).toMatchObject({ themeOverride: 'dark', dayStart: 6, nightStart: 22, use24h: true })
  })
  it('opens and closes panels', () => {
    const s = run([{ type: 'setPanel', panel: 'collection' }])
    expect(s.ui.panel).toBe('collection')
    expect(reducer(s, { type: 'setPanel', panel: 'none' }).ui.panel).toBe('none')
  })
})

describe('clearAll', () => {
  it('resets to the initial state', () => {
    const s = run([{ type: 'setPanel', panel: 'settings' }], earn(initialState(), 3))
    expect(reducer(s, { type: 'clearAll' })).toEqual(initialState())
  })
})
