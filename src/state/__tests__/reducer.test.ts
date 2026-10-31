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
    expect(reducer(s, { type: 'equip', kind: 'dial', id: 'lantern' })).toBe(s)
    expect(reducer(s, { type: 'setPanel', panel: 'none' })).toBe(s)
  })
})

describe('renameQuest', () => {
  it('retitles without touching completions, ledger, repeats or createdDay', () => {
    const s = run([
      { type: 'addQuest', title: 'Read', repeats: true, now: NOON, id: 'r' },
      { type: 'toggleQuest', id: 'r', now: NOON },
    ])
    const after = reducer(s, { type: 'renameQuest', id: 'r', title: '  Read a chapter ' })
    expect(after.quests).toEqual([{ id: 'r', title: 'Read a chapter', repeats: true, createdDay: '2026-09-17' }])
    expect(after.completions).toBe(s.completions)
    expect(after.ledger).toBe(s.ledger)
  })
  it('returns the same state on no-ops', () => {
    const s = run([{ type: 'addQuest', title: 'Read', repeats: false, now: NOON, id: 'r' }])
    expect(reducer(s, { type: 'renameQuest', id: 'r', title: '' })).toBe(s)
    expect(reducer(s, { type: 'renameQuest', id: 'r', title: 'Read' })).toBe(s)
    expect(reducer(s, { type: 'renameQuest', id: 'ghost', title: 'X' })).toBe(s)
  })
})

describe('unlock', () => {
  it('fails silently when unaffordable', () => {
    const s = earn(initialState(), 1) // 3 lumens
    const after = reducer(s, { type: 'unlock', kind: 'dial', id: 'hairline', now: NOON }) // costs 6
    expect(after).toBe(s)
    expect(after.owned.dials).toEqual(['lantern'])
  })
  it('spends lumens and records an unlock entry when affordable', () => {
    const s = earn(initialState(), 2) // 6 lumens
    const after = reducer(s, { type: 'unlock', kind: 'dial', id: 'hairline', now: NOON })
    expect(after.owned.dials).toEqual(['lantern', 'hairline'])
    expect(selectLumens(after)).toBe(0)
    expect(selectLifetimeEarned(after)).toBe(6)
    expect(after.ledger.at(-1)).toMatchObject({ delta: -6, reason: 'unlock', ref: 'dial:hairline' })
    expect(after.equipped.dial).toBe('lantern')
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
    expect(equipped.equipped).toEqual({ dial: 'lantern', sky: 'tide' })
  })
})

describe('Clock display setting', () => {
  it('defaults to blend and accepts only the four modes', () => {
    expect(initialState().settings.clockFill).toBe('blend')
    for (const clockFill of ['hour', 'solid', 'accent', 'blend'] as const) {
      expect(run([{ type: 'updateSettings', patch: { clockFill } }]).settings.clockFill).toBe(clockFill)
    }
    const bogus = { clockFill: 'rainbow' } as unknown as Partial<AppState['settings']>
    expect(run([{ type: 'updateSettings', patch: bogus }]).settings.clockFill).toBe('blend')
  })
})

describe('Lumens setting', () => {
  const off = (s: AppState = initialState()) => reducer(s, { type: 'updateSettings', patch: { lumensEnabled: false } })
  const on = (s: AppState) => reducer(s, { type: 'updateSettings', patch: { lumensEnabled: true } })

  it('defaults to on and accepts only booleans', () => {
    expect(initialState().settings.lumensEnabled).toBe(true)
    expect(off().settings.lumensEnabled).toBe(false)
    const bogus = { lumensEnabled: 'no' } as unknown as Partial<AppState['settings']>
    expect(reducer(off(), { type: 'updateSettings', patch: bogus }).settings.lumensEnabled).toBe(false)
  })

  it('on: equipping a locked item is rejected (the original rule)', () => {
    const s = initialState()
    expect(reducer(s, { type: 'equip', kind: 'dial', id: 'orbit' })).toBe(s)
    expect(reducer(s, { type: 'equip', kind: 'sky', id: 'tide' })).toBe(s)
  })

  it('off: equips a locked item without touching owned or the ledger', () => {
    const s = off(earn(initialState(), 1))
    const after = reducer(reducer(s, { type: 'equip', kind: 'dial', id: 'orbit' }), { type: 'equip', kind: 'sky', id: 'tide' })
    expect(after.equipped).toEqual({ dial: 'orbit', sky: 'tide' })
    expect(after.owned).toBe(s.owned)
    expect(after.ledger).toBe(s.ledger)
    // Unknown ids are still refused.
    expect(reducer(after, { type: 'equip', kind: 'dial', id: 'bogus' })).toBe(after)
  })

  it('off: nothing can be bought', () => {
    const s = off(earn(initialState(), 4))
    expect(reducer(s, { type: 'unlock', kind: 'dial', id: 'hairline', now: NOON })).toBe(s)
  })

  it('turning off never changes owned or equipped', () => {
    const s = reducer(reducer(earn(initialState(), 2), { type: 'unlock', kind: 'dial', id: 'hairline', now: NOON }), { type: 'equip', kind: 'dial', id: 'hairline' })
    const after = off(s)
    expect(after.owned).toBe(s.owned)
    expect(after.equipped).toBe(s.equipped)
    expect(after.ledger).toBe(s.ledger)
  })

  it('keeps earning in the ledger while off, so the balance is right after turning on', () => {
    const s = earn(off(), 2)
    expect(selectLumens(s)).toBe(6)
    expect(selectLumens(on(s))).toBe(6)
    expect(on(s).ledger).toBe(s.ledger)
  })

  it('off then on resets an unbought dial and an unbought sky to the defaults', () => {
    let s = off()
    s = reducer(reducer(s, { type: 'equip', kind: 'dial', id: 'orbit' }), { type: 'equip', kind: 'sky', id: 'graphite' })
    const after = on(s)
    expect(after.equipped).toEqual({ dial: 'lantern', sky: 'daylight' })
    expect(after.owned).toBe(s.owned)
  })

  it('off then on keeps a bought dial equipped', () => {
    let s = reducer(earn(initialState(), 2), { type: 'unlock', kind: 'dial', id: 'hairline', now: NOON })
    s = reducer(s, { type: 'equip', kind: 'dial', id: 'hairline' })
    s = reducer(off(s), { type: 'equip', kind: 'sky', id: 'tide' })
    const after = on(s)
    expect(after.equipped).toEqual({ dial: 'hairline', sky: 'daylight' })
  })

  it('off then on with a free item equipped keeps a bought one owned', () => {
    let s = reducer(earn(initialState(), 2), { type: 'unlock', kind: 'dial', id: 'hairline', now: NOON })
    s = reducer(off(s), { type: 'equip', kind: 'dial', id: 'orbit' })
    const after = on(s)
    expect(after.equipped.dial).toBe('lantern')
    expect(after.owned.dials).toEqual(['lantern', 'hairline'])
    expect(reducer(after, { type: 'equip', kind: 'dial', id: 'hairline' }).equipped.dial).toBe('hairline')
  })

  it('clear all data turns lumens back on', () => {
    expect(reducer(off(), { type: 'clearAll' }).settings.lumensEnabled).toBe(true)
  })
})

describe('settings and ui', () => {
  it('applies valid patches and drops out-of-range hours', () => {
    const s = run([{ type: 'updateSettings', patch: { themeOverride: 'dark', dayStart: 25, nightStart: 22, use24h: true } }])
    expect(s.settings).toMatchObject({ themeOverride: 'dark', dayStart: 6, nightStart: 22, use24h: true })
  })
  it('accepts a default timer only in whole minutes from 1:00 to 60:00', () => {
    const set = (defaultTimerSec: number) => run([{ type: 'updateSettings', patch: { defaultTimerSec } }]).settings.defaultTimerSec
    expect(initialState().settings.defaultTimerSec).toBe(1800)
    expect(set(60)).toBe(60)
    expect(set(3600)).toBe(3600)
    expect(set(600)).toBe(600)
    expect(set(0)).toBe(1800)
    expect(set(30)).toBe(1800)
    expect(set(3660)).toBe(1800)
    expect(set(90)).toBe(1800)
    expect(set(120.5)).toBe(1800)
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
