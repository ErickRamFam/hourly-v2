import { newId } from './id'

export type Quest = {
  id: string
  title: string
  repeats: boolean
  /** Day key ("YYYY-MM-DD") the quest was created on. */
  createdDay: string
}

/** Quest ids completed on each day, keyed by day key. */
export type Completions = Record<string, string[]>

export type LedgerReason = 'quest' | 'clean-day' | 'unlock'

export type LedgerEntry = {
  id: string
  /** Epoch ms. */
  at: number
  /** Positive = earned, negative = spent. */
  delta: number
  reason: LedgerReason
  /** What the entry refers to: "<day>/<questId>", "<day>", or "<kind>:<itemId>". */
  ref: string
}

export const QUEST_LUMENS = 1
export const CLEAN_DAY_LUMENS = 2

export const MAX_TITLE_LENGTH = 120

/**
 * Quests that belong on `day`: repeating quests from their creation day onward,
 * one-offs only on the day they were created.
 */
export function questsForDay(quests: readonly Quest[], day: string): Quest[] {
  return quests.filter((q) => (q.repeats ? q.createdDay <= day : q.createdDay === day))
}

export function isDone(completions: Completions, day: string, questId: string): boolean {
  return (completions[day] ?? []).includes(questId)
}

export function addQuest(
  quests: readonly Quest[],
  title: string,
  repeats: boolean,
  day: string,
  id: string = newId(),
): Quest[] {
  const trimmed = title.trim().slice(0, MAX_TITLE_LENGTH)
  if (!trimmed) return quests as Quest[]
  return [...quests, { id, title: trimmed, repeats, createdDay: day }]
}

/** Removes a quest and prunes it from every day's completions. The ledger is untouched. */
export function removeQuest(
  quests: readonly Quest[],
  completions: Completions,
  questId: string,
): { quests: Quest[]; completions: Completions } {
  if (!quests.some((q) => q.id === questId)) return { quests: quests as Quest[], completions }
  const nextCompletions: Completions = {}
  for (const [day, ids] of Object.entries(completions)) {
    const kept = ids.filter((id) => id !== questId)
    if (kept.length > 0) nextCompletions[day] = kept
  }
  return { quests: quests.filter((q) => q.id !== questId), completions: nextCompletions }
}

/** What `removeQuest` discards, kept so the removal can be undone. */
export type RemovedQuest = {
  quest: Quest
  /** Position in the full quest list. */
  index: number
  /** Day keys on which the quest was completed. */
  days: string[]
}

/** Snapshot of a quest before removal, or null for unknown ids. */
export function removedQuest(quests: readonly Quest[], completions: Completions, questId: string): RemovedQuest | null {
  const index = quests.findIndex((q) => q.id === questId)
  if (index < 0) return null
  const days = Object.keys(completions).filter((day) => completions[day].includes(questId))
  return { quest: quests[index], index, days }
}

/** Puts a removed quest back at its position with its completions. The ledger is untouched. */
export function restoreQuest(
  quests: readonly Quest[],
  completions: Completions,
  removed: RemovedQuest,
): { quests: Quest[]; completions: Completions } {
  const { quest, index, days } = removed
  if (quests.some((q) => q.id === quest.id)) return { quests: quests as Quest[], completions }
  const nextQuests = [...quests]
  nextQuests.splice(Math.min(Math.max(index, 0), nextQuests.length), 0, quest)
  const nextCompletions: Completions = { ...completions }
  for (const day of days) {
    const ids = nextCompletions[day] ?? []
    if (!ids.includes(quest.id)) nextCompletions[day] = [...ids, quest.id]
  }
  return { quests: nextQuests, completions: nextCompletions }
}

export type DayProgress = { done: number; total: number }

export function dayProgress(quests: readonly Quest[], completions: Completions, day: string): DayProgress {
  const todays = questsForDay(quests, day)
  const doneIds = new Set(completions[day] ?? [])
  const done = todays.filter((q) => doneIds.has(q.id)).length
  return { done, total: todays.length }
}

export function questRef(day: string, questId: string): string {
  return `${day}/${questId}`
}

function hasEntry(ledger: readonly LedgerEntry[], reason: LedgerReason, ref: string): boolean {
  return ledger.some((e) => e.reason === reason && e.ref === ref)
}

export type ToggleResult = { completions: Completions; ledger: LedgerEntry[] }

/**
 * Checks or unchecks `questId` for `day` and applies the lumen rules.
 *
 * Lumens are a ledger of events and are never recomputed:
 * - +1 the first time a quest is completed on a given day (re-checking after an uncheck
 *   earns nothing more; unchecking claws nothing back).
 * - +2 the moment a day with at least one quest becomes fully cleared, once per day.
 */
export function toggleQuest(
  quests: readonly Quest[],
  completions: Completions,
  ledger: readonly LedgerEntry[],
  day: string,
  questId: string,
  now: number,
  makeId: () => string = newId,
): ToggleResult {
  const todays = questsForDay(quests, day)
  if (!todays.some((q) => q.id === questId)) return { completions, ledger: ledger as LedgerEntry[] }

  const current = completions[day] ?? []
  const nextLedger = [...ledger]

  if (current.includes(questId)) {
    const kept = current.filter((id) => id !== questId)
    const nextCompletions = { ...completions }
    if (kept.length > 0) nextCompletions[day] = kept
    else delete nextCompletions[day]
    return { completions: nextCompletions, ledger: nextLedger }
  }

  const nextDone = [...current, questId]
  const nextCompletions = { ...completions, [day]: nextDone }

  const qRef = questRef(day, questId)
  if (!hasEntry(nextLedger, 'quest', qRef)) {
    nextLedger.push({ id: makeId(), at: now, delta: QUEST_LUMENS, reason: 'quest', ref: qRef })
  }

  const doneSet = new Set(nextDone)
  const cleared = todays.length > 0 && todays.every((q) => doneSet.has(q.id))
  if (cleared && !hasEntry(nextLedger, 'clean-day', day)) {
    nextLedger.push({ id: makeId(), at: now, delta: CLEAN_DAY_LUMENS, reason: 'clean-day', ref: day })
  }

  return { completions: nextCompletions, ledger: nextLedger }
}

/** Current balance: the sum of every ledger delta. */
export function lumens(ledger: readonly LedgerEntry[]): number {
  return ledger.reduce((sum, e) => sum + e.delta, 0)
}

/** Everything ever earned (positive deltas only). */
export function lifetimeEarned(ledger: readonly LedgerEntry[]): number {
  return ledger.reduce((sum, e) => (e.delta > 0 ? sum + e.delta : sum), 0)
}
