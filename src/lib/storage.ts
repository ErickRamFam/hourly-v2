import { DEFAULT_DIAL_ID, isDialId } from './dials'
import { DEFAULT_SKY_ID, SKIES } from './skies'
import type { Completions, LedgerEntry, LedgerReason, Quest } from './quests'
import type { AppState, PersistedState, Settings } from '../state/types'
import { CLOCK_FILL_MODES, REDUCE_MOTION_MODES, SECOND_HAND_MODES, THEME_OVERRIDES } from '../state/types'

export const STORAGE_KEY = 'hourly.v2'
export const SCHEMA_VERSION = 1 as const

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function defaultSettings(): Settings {
  return {
    themeOverride: 'auto',
    dayStart: 6,
    nightStart: 19,
    secondHand: 'sweep',
    use24h: false,
    reduceMotion: 'system',
    defaultTimerSec: DEFAULT_TIMER_SEC,
    clockFill: 'blend',
    lumensEnabled: true,
  }
}

export const DEFAULT_TIMER_SEC = 1800
export const MIN_TIMER_SEC = 60
export const MAX_TIMER_SEC = 3600

export function initialState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: defaultSettings(),
    quests: [],
    completions: {},
    ledger: [],
    owned: { dials: [DEFAULT_DIAL_ID], skies: [DEFAULT_SKY_ID] },
    equipped: { dial: DEFAULT_DIAL_ID, sky: DEFAULT_SKY_ID },
    ui: { panel: 'none' },
  }
}

// ---- sanitizers ------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function int(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  const n = Math.floor(value)
  return n < min || n > max ? fallback : n
}

function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === 'string' && (options as readonly string[]).includes(value) ? (value as T) : fallback
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/

function isDayKey(value: unknown): value is string {
  return typeof value === 'string' && DAY_KEY.test(value)
}

function sanitizeSettings(value: unknown): Settings {
  const base = defaultSettings()
  if (!isRecord(value)) return base
  return {
    themeOverride: oneOf(value.themeOverride, THEME_OVERRIDES, base.themeOverride),
    dayStart: int(value.dayStart, base.dayStart, 0, 23),
    nightStart: int(value.nightStart, base.nightStart, 0, 23),
    secondHand: oneOf(value.secondHand, SECOND_HAND_MODES, base.secondHand),
    use24h: typeof value.use24h === 'boolean' ? value.use24h : base.use24h,
    reduceMotion: oneOf(value.reduceMotion, REDUCE_MOTION_MODES, base.reduceMotion),
    // Old saves have none and get 30:00, as does anything out of range; in range rounds to whole minutes.
    defaultTimerSec: Math.round(int(value.defaultTimerSec, base.defaultTimerSec, MIN_TIMER_SEC, MAX_TIMER_SEC) / 60) * 60,
    clockFill: oneOf(value.clockFill, CLOCK_FILL_MODES, base.clockFill),
    lumensEnabled: typeof value.lumensEnabled === 'boolean' ? value.lumensEnabled : base.lumensEnabled,
  }
}

function sanitizeQuests(value: unknown): Quest[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const out: Quest[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    const id = str(item.id)
    const title = str(item.title)?.trim()
    if (!id || !title || seen.has(id) || !isDayKey(item.createdDay)) continue
    seen.add(id)
    out.push({ id, title, repeats: item.repeats === true, createdDay: item.createdDay })
  }
  return out
}

function sanitizeCompletions(value: unknown, quests: readonly Quest[]): Completions {
  if (!isRecord(value)) return {}
  const known = new Set(quests.map((q) => q.id))
  const out: Completions = {}
  for (const [day, ids] of Object.entries(value)) {
    if (!isDayKey(day) || !Array.isArray(ids)) continue
    const kept = Array.from(new Set(ids.filter((id): id is string => typeof id === 'string' && known.has(id))))
    if (kept.length > 0) out[day] = kept
  }
  return out
}

const REASONS: readonly LedgerReason[] = ['quest', 'clean-day', 'unlock']

function sanitizeLedger(value: unknown): LedgerEntry[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const out: LedgerEntry[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    const id = str(item.id)
    const ref = str(item.ref)
    const reason = REASONS.find((r) => r === item.reason)
    if (!id || ref === null || !reason || seen.has(id)) continue
    if (typeof item.delta !== 'number' || !Number.isFinite(item.delta) || !Number.isInteger(item.delta)) continue
    if (typeof item.at !== 'number' || !Number.isFinite(item.at)) continue
    seen.add(id)
    out.push({ id, at: item.at, delta: item.delta, reason, ref })
  }
  return out
}

function sanitizeOwned(value: unknown): AppState['owned'] {
  const base = initialState().owned
  if (!isRecord(value)) return base
  const skyIds = new Set(SKIES.map((s) => s.id))
  const dials = Array.isArray(value.dials) ? value.dials.filter((d): d is string => typeof d === 'string' && isDialId(d)) : []
  const skies = Array.isArray(value.skies) ? value.skies.filter((s): s is string => typeof s === 'string' && skyIds.has(s)) : []
  return {
    dials: Array.from(new Set([DEFAULT_DIAL_ID, ...dials])),
    skies: Array.from(new Set([DEFAULT_SKY_ID, ...skies])),
  }
}

/**
 * With lumens on, an equipped item must be owned. With lumens off anything in the catalog
 * may be equipped (it was picked for free), so a reload keeps it; unknown ids never pass.
 */
function sanitizeEquipped(value: unknown, owned: AppState['owned'], lumensEnabled: boolean): AppState['equipped'] {
  const base = initialState().equipped
  if (!isRecord(value)) return base
  const dial = str(value.dial)
  const sky = str(value.sky)
  const skyIds = new Set(SKIES.map((s) => s.id))
  const dialOk = dial !== null && (lumensEnabled ? owned.dials.includes(dial) : isDialId(dial))
  const skyOk = sky !== null && (lumensEnabled ? owned.skies.includes(sky) : skyIds.has(sky))
  return { dial: dialOk ? dial : base.dial, sky: skyOk ? sky : base.sky }
}

/** Coerces any parsed value into a valid AppState, filling defaults for anything missing or malformed. */
export function sanitizeState(raw: unknown): AppState {
  const base = initialState()
  if (!isRecord(raw)) return base
  // Settings first: whether lumens are on decides which equipped items are valid.
  const settings = sanitizeSettings(raw.settings)
  const quests = sanitizeQuests(raw.quests)
  const owned = sanitizeOwned(raw.owned)
  return {
    schemaVersion: SCHEMA_VERSION,
    settings,
    quests,
    completions: sanitizeCompletions(raw.completions, quests),
    ledger: sanitizeLedger(raw.ledger),
    owned,
    equipped: sanitizeEquipped(raw.equipped, owned, settings.lumensEnabled),
    ui: { panel: 'none' },
  }
}

/**
 * Migration hook. Takes a parsed JSON value at any schema version and returns a value
 * shaped like the current schema, or null when it cannot be migrated (e.g. a newer version).
 */
export function migrate(raw: unknown): unknown | null {
  if (!isRecord(raw)) return null
  const version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 1
  switch (version) {
    case 1:
      return raw
    default:
      return null
  }
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** Loads state from storage. Never throws; garbage falls back to initialState(). */
export function load(storage: StorageLike | null = defaultStorage()): AppState {
  if (!storage) return initialState()
  try {
    const text = storage.getItem(STORAGE_KEY)
    if (!text) return initialState()
    const migrated = migrate(JSON.parse(text))
    if (migrated === null) return initialState()
    return sanitizeState(migrated)
  } catch {
    return initialState()
  }
}

export function toPersisted(state: AppState): PersistedState {
  const { ui: _ui, ...rest } = state
  return rest
}

export function save(state: AppState, storage: StorageLike | null = defaultStorage()): boolean {
  if (!storage) return false
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(toPersisted(state)))
    return true
  } catch {
    return false
  }
}

/** Removes everything Hourly stores. */
export function clearAll(storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return
  try {
    storage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
