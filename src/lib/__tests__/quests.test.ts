import { describe, expect, it } from 'vitest'
import {
  addQuest,
  dayProgress,
  lifetimeEarned,
  lumens,
  questsForDay,
  removeQuest,
  removedQuest,
  restoreQuest,
  toggleQuest,
  type Completions,
  type LedgerEntry,
  type Quest,
} from '../quests'

const DAY = '2026-09-17'
const YESTERDAY = '2026-09-16'
const TOMORROW = '2026-09-18'

let n = 0
const ids = () => `id-${++n}`

function q(id: string, repeats: boolean, createdDay = DAY): Quest {
  return { id, title: id, repeats, createdDay }
}

describe('questsForDay', () => {
  const quests = [q('daily', true, YESTERDAY), q('once-today', false, DAY), q('once-yesterday', false, YESTERDAY), q('future', true, TOMORROW)]
  it('shows repeating quests from their creation day and one-offs on their day only', () => {
    expect(questsForDay(quests, DAY).map((x) => x.id)).toEqual(['daily', 'once-today'])
    expect(questsForDay(quests, YESTERDAY).map((x) => x.id)).toEqual(['daily', 'once-yesterday'])
    expect(questsForDay(quests, TOMORROW).map((x) => x.id)).toEqual(['daily', 'future'])
  })
})

describe('addQuest / removeQuest', () => {
  it('adds a trimmed quest and ignores blanks', () => {
    const list = addQuest([], '  Water the plants  ', true, DAY, 'a')
    expect(list).toEqual([{ id: 'a', title: 'Water the plants', repeats: true, createdDay: DAY }])
    const same = addQuest(list, '   ', false, DAY)
    expect(same).toBe(list)
  })
  it('removes a quest and prunes its completions but not the ledger', () => {
    const quests = [q('a', true), q('b', true)]
    const completions: Completions = { [DAY]: ['a', 'b'], [YESTERDAY]: ['a'] }
    const result = removeQuest(quests, completions, 'a')
    expect(result.quests.map((x) => x.id)).toEqual(['b'])
    expect(result.completions).toEqual({ [DAY]: ['b'] })
  })
  it('is a no-op for unknown ids', () => {
    const quests = [q('a', true)]
    expect(removeQuest(quests, {}, 'zzz').quests).toBe(quests)
  })
})

describe('removedQuest / restoreQuest', () => {
  it('puts a removed quest back at its position with every completed day', () => {
    const quests = [q('a', true, YESTERDAY), q('b', true, YESTERDAY), q('c', false)]
    const completions: Completions = { [DAY]: ['b', 'c'], [YESTERDAY]: ['a', 'b'] }
    const removed = removedQuest(quests, completions, 'b')
    expect(removed).toEqual({ quest: quests[1], index: 1, days: [DAY, YESTERDAY] })
    const gone = removeQuest(quests, completions, 'b')
    const back = restoreQuest(gone.quests, gone.completions, removed!)
    expect(back.quests).toEqual(quests)
    expect(back.completions[DAY]).toEqual(expect.arrayContaining(['b', 'c']))
    expect(back.completions[YESTERDAY]).toEqual(expect.arrayContaining(['a', 'b']))
  })
  it('restores a day the removal emptied, clamps the index, and ignores ids already present', () => {
    const quests = [q('a', true)]
    const removed = removedQuest(quests, { [DAY]: ['a'] }, 'a')!
    const back = restoreQuest([], {}, { ...removed, index: 5 })
    expect(back.quests).toEqual(quests)
    expect(back.completions).toEqual({ [DAY]: ['a'] })
    expect(restoreQuest(quests, {}, removed).quests).toBe(quests)
    expect(removedQuest(quests, {}, 'zzz')).toBeNull()
  })
})

describe('toggleQuest and the lumen ledger', () => {
  it('awards +1 for a completion and +2 when the day is cleared', () => {
    const quests = [q('a', true), q('b', false)]
    let completions: Completions = {}
    let ledger: LedgerEntry[] = []

    ;({ completions, ledger } = toggleQuest(quests, completions, ledger, DAY, 'a', 1000, ids))
    expect(completions[DAY]).toEqual(['a'])
    expect(ledger.map((e) => [e.delta, e.reason])).toEqual([[1, 'quest']])
    expect(lumens(ledger)).toBe(1)

    ;({ completions, ledger } = toggleQuest(quests, completions, ledger, DAY, 'b', 2000, ids))
    expect(ledger.map((e) => [e.delta, e.reason, e.ref])).toEqual([
      [1, 'quest', `${DAY}/a`],
      [1, 'quest', `${DAY}/b`],
      [2, 'clean-day', DAY],
    ])
    expect(lumens(ledger)).toBe(4)
    expect(dayProgress(quests, completions, DAY)).toEqual({ done: 2, total: 2 })
  })

  it('does not claw back on uncheck and does not re-award on re-check', () => {
    const quests = [q('a', true)]
    let completions: Completions = {}
    let ledger: LedgerEntry[] = []
    ;({ completions, ledger } = toggleQuest(quests, completions, ledger, DAY, 'a', 1, ids))
    expect(lumens(ledger)).toBe(3) // +1 quest, +2 clean day (single-quest day)

    ;({ completions, ledger } = toggleQuest(quests, completions, ledger, DAY, 'a', 2, ids))
    expect(completions[DAY]).toBeUndefined()
    expect(lumens(ledger)).toBe(3)

    ;({ completions, ledger } = toggleQuest(quests, completions, ledger, DAY, 'a', 3, ids))
    expect(completions[DAY]).toEqual(['a'])
    expect(lumens(ledger)).toBe(3)
    expect(ledger).toHaveLength(2)
  })

  it('awards the clean-day bonus once even if the day is cleared, broken and cleared again', () => {
    const quests = [q('a', true), q('b', true)]
    let completions: Completions = {}
    let ledger: LedgerEntry[] = []
    for (const id of ['a', 'b', 'b', 'b']) {
      ;({ completions, ledger } = toggleQuest(quests, completions, ledger, DAY, id, 1, ids))
    }
    expect(ledger.filter((e) => e.reason === 'clean-day')).toHaveLength(1)
    expect(lumens(ledger)).toBe(4)
  })

  it('does not award a clean-day bonus when a new quest is added after clearing, until it is done too', () => {
    let quests = [q('a', true)]
    let completions: Completions = {}
    let ledger: LedgerEntry[] = []
    ;({ completions, ledger } = toggleQuest(quests, completions, ledger, DAY, 'a', 1, ids))
    expect(lumens(ledger)).toBe(3)
    quests = addQuest(quests, 'b', false, DAY, 'b')
    expect(dayProgress(quests, completions, DAY)).toEqual({ done: 1, total: 2 })
    ;({ completions, ledger } = toggleQuest(quests, completions, ledger, DAY, 'b', 2, ids))
    expect(lumens(ledger)).toBe(4) // +1 for b, no second clean-day bonus
  })

  it('ignores quests that do not belong to the day', () => {
    const quests = [q('once', false, YESTERDAY)]
    const result = toggleQuest(quests, {}, [], DAY, 'once', 1, ids)
    expect(result.completions).toEqual({})
    expect(result.ledger).toEqual([])
  })

  it('keeps per-day ledgers separate', () => {
    const quests = [q('a', true, YESTERDAY)]
    let completions: Completions = {}
    let ledger: LedgerEntry[] = []
    ;({ completions, ledger } = toggleQuest(quests, completions, ledger, YESTERDAY, 'a', 1, ids))
    ;({ completions, ledger } = toggleQuest(quests, completions, ledger, DAY, 'a', 2, ids))
    expect(lumens(ledger)).toBe(6)
    expect(completions).toEqual({ [YESTERDAY]: ['a'], [DAY]: ['a'] })
  })

  it('lifetimeEarned ignores spending', () => {
    const ledger: LedgerEntry[] = [
      { id: '1', at: 1, delta: 1, reason: 'quest', ref: 'x' },
      { id: '2', at: 2, delta: 2, reason: 'clean-day', ref: 'y' },
      { id: '3', at: 3, delta: -3, reason: 'unlock', ref: 'dial:orbit' },
    ]
    expect(lumens(ledger)).toBe(0)
    expect(lifetimeEarned(ledger)).toBe(3)
  })
})

describe('dayProgress', () => {
  it('reports zero for days with no quests', () => {
    expect(dayProgress([], {}, DAY)).toEqual({ done: 0, total: 0 })
  })
  it('ignores completions for quests that no longer exist', () => {
    expect(dayProgress([q('a', true)], { [DAY]: ['a', 'ghost'] }, DAY)).toEqual({ done: 1, total: 1 })
  })
})
