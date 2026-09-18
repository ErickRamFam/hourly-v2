import { describe, expect, it } from 'vitest'
import { STORAGE_KEY, clearAll, initialState, load, migrate, sanitizeState, save, type StorageLike } from '../storage'
import type { AppState } from '../../state/types'

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

function populated(): AppState {
  return {
    ...initialState(),
    settings: { themeOverride: 'dark', dayStart: 7, nightStart: 21, secondHand: 'tick', use24h: true, reduceMotion: 'on' },
    quests: [{ id: 'a', title: 'Stretch', repeats: true, createdDay: '2026-09-10' }],
    completions: { '2026-09-17': ['a'] },
    ledger: [
      { id: 'l1', at: 1, delta: 1, reason: 'quest', ref: '2026-09-17/a' },
      { id: 'l2', at: 1, delta: 2, reason: 'clean-day', ref: '2026-09-17' },
      { id: 'l3', at: 2, delta: -6, reason: 'unlock', ref: 'dial:hairline' },
    ],
    owned: { dials: ['sector', 'hairline'], skies: ['daylight'] },
    equipped: { dial: 'hairline', sky: 'daylight' },
    ui: { panel: 'settings' },
  }
}

describe('storage', () => {
  it('round-trips state and drops transient ui', () => {
    const s = memoryStorage()
    expect(save(populated(), s)).toBe(true)
    expect(s.data.has(STORAGE_KEY)).toBe(true)
    const loaded = load(s)
    expect(loaded).toEqual({ ...populated(), ui: { panel: 'none' } })
  })

  it('returns initial state when empty or with no storage', () => {
    expect(load(memoryStorage())).toEqual(initialState())
    expect(load(null)).toEqual(initialState())
  })

  it('survives corrupt JSON and wrong shapes', () => {
    const s = memoryStorage()
    s.setItem(STORAGE_KEY, '{not json')
    expect(load(s)).toEqual(initialState())
    s.setItem(STORAGE_KEY, '[1,2,3]')
    expect(load(s)).toEqual(initialState())
    s.setItem(STORAGE_KEY, '"hello"')
    expect(load(s)).toEqual(initialState())
  })

  it('sanitizes malformed fields and keeps the valid ones', () => {
    const state = sanitizeState({
      schemaVersion: 1,
      settings: { themeOverride: 'neon', dayStart: 99, nightStart: 20.7, use24h: 'yes' },
      quests: [
        { id: 'a', title: ' ok ', repeats: 'nope', createdDay: '2026-09-17' },
        { id: 'a', title: 'dup', createdDay: '2026-09-17' },
        { id: 'b', title: '', createdDay: '2026-09-17' },
        { id: 'c', title: 'bad day', createdDay: 'yesterday' },
        'garbage',
      ],
      completions: { '2026-09-17': ['a', 'a', 'ghost', 3], bad: ['a'] },
      ledger: [
        { id: 'x', at: 1, delta: 1.5, reason: 'quest', ref: 'r' },
        { id: 'y', at: 1, delta: 1, reason: 'bribe', ref: 'r' },
        { id: 'z', at: 1, delta: -6, reason: 'unlock', ref: 'dial:orbit' },
      ],
      owned: { dials: ['orbit', 'bogus'], skies: 'tide' },
      equipped: { dial: 'hairline', sky: 'tide' },
    })
    expect(state.settings).toEqual({ themeOverride: 'auto', dayStart: 6, nightStart: 20, secondHand: 'sweep', use24h: false, reduceMotion: 'system' })
    expect(state.quests).toEqual([{ id: 'a', title: 'ok', repeats: false, createdDay: '2026-09-17' }])
    expect(state.completions).toEqual({ '2026-09-17': ['a'] })
    expect(state.ledger).toEqual([{ id: 'z', at: 1, delta: -6, reason: 'unlock', ref: 'dial:orbit' }])
    expect(state.owned).toEqual({ dials: ['sector', 'orbit'], skies: ['daylight'] })
    expect(state.equipped).toEqual({ dial: 'sector', sky: 'daylight' })
    expect(state.ui).toEqual({ panel: 'none' })
  })

  it('refuses to migrate a newer schema', () => {
    expect(migrate({ schemaVersion: 99 })).toBeNull()
    expect(migrate({ schemaVersion: 1, quests: [] })).toEqual({ schemaVersion: 1, quests: [] })
    expect(migrate(null)).toBeNull()
    const s = memoryStorage()
    s.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 99, quests: [{ id: 'a' }] }))
    expect(load(s)).toEqual(initialState())
  })

  it('clearAll removes the key', () => {
    const s = memoryStorage()
    save(populated(), s)
    clearAll(s)
    expect(s.data.has(STORAGE_KEY)).toBe(false)
    expect(load(s)).toEqual(initialState())
  })

  it('save reports failure when storage throws', () => {
    const s: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota')
      },
      removeItem: () => {},
    }
    expect(save(initialState(), s)).toBe(false)
  })
})
