/**
 * Countdown timer: pure logic, parsing and its own storage (DESIGN.md §6, "Timer").
 * The timer is separate from the clock and from AppState: it lives under its own key and the
 * clock never reads it. A running timer stores the wall-clock moment it ends (`endsAt`) and is
 * always read against Date.now(), never a decrementing counter, so background throttling
 * cannot make it drift.
 */
import type { StorageLike } from './storage'

export const TIMER_KEY = 'hourly.timer.v1'
export const TIMER_MIN_MS = 1000
export const TIMER_MAX_MS = 60 * 60 * 1000

export type TimerRunning = { status: 'running'; endsAt: number; totalMs: number }
export type TimerPaused = { status: 'paused'; remainingMs: number; totalMs: number }
/** What is stored. null is idle. */
export type TimerStored = TimerRunning | TimerPaused

export type ParsedTimer = { kind: 'time'; ms: number } | { kind: 'zero' } | { kind: 'invalid' }

/** At most four digits: MMSS. */
export const TIMER_MAX_DIGITS = 4

/**
 * Parses what the timer field holds: 1 to 4 digits, nothing else. One or two digits are
 * minutes (`5` is 5:00, `45` is 45:00); three or four are MMSS (`530` is 5:30, `1500` is
 * 15:00). Seconds must be 00 to 59 and the valid range is 00:01 to 60:00. All zeros (`0`,
 * `00`, `0000`) is `zero`: an error while idle, a cancel while paused.
 */
export function parseTimerInput(digits: string): ParsedTimer {
  if (!/^\d{1,4}$/.test(digits)) return { kind: 'invalid' }
  let seconds: number
  if (digits.length <= 2) {
    seconds = Number(digits) * 60
  } else {
    const s = Number(digits.slice(-2))
    if (s > 59) return { kind: 'invalid' }
    seconds = Number(digits.slice(0, -2)) * 60 + s
  }
  if (seconds === 0) return { kind: 'zero' }
  const ms = seconds * 1000
  return ms < TIMER_MIN_MS || ms > TIMER_MAX_MS ? { kind: 'invalid' } : { kind: 'time', ms }
}

/** Keeps only 0-9 from typed, pasted or IME text, capped at the first four digits. */
export function timerDigits(text: string): string {
  return text.replace(/\D/g, '').slice(0, TIMER_MAX_DIGITS)
}

/** How the field shows its digits: as typed, with the colon added at 3 or 4 digits (`530` reads 5:30). */
export function formatTimerDigits(digits: string): string {
  return digits.length <= 2 ? digits : `${digits.slice(0, -2)}:${digits.slice(-2)}`
}

/** Whole seconds shown for `ms` remaining: rounded up, so 00:00 only appears at the end. */
export function displaySeconds(ms: number): number {
  return Math.max(0, Math.ceil(ms / 1000))
}

/** "MM:SS" for `ms` remaining (60:00 at most). */
export function formatTimer(ms: number): string {
  const total = displaySeconds(ms)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function remainingMs(timer: TimerStored | null, now: number): number {
  if (!timer) return 0
  return timer.status === 'running' ? Math.max(0, timer.endsAt - now) : timer.remainingMs
}

export function startTimer(ms: number, now: number): TimerRunning {
  return { status: 'running', endsAt: now + ms, totalMs: ms }
}

export function pauseTimer(timer: TimerStored, now: number): TimerPaused {
  if (timer.status === 'paused') return timer
  return { status: 'paused', remainingMs: remainingMs(timer, now), totalMs: timer.totalMs }
}

export function resumeTimer(timer: TimerStored, now: number): TimerRunning {
  if (timer.status === 'running') return timer
  return { status: 'running', endsAt: now + timer.remainingMs, totalMs: timer.totalMs }
}

/** Fraction of the circle the bar covers: remaining / 60:00, so 60:00 is the full ring. */
export function barFraction(ms: number): number {
  return Math.min(1, Math.max(0, displaySeconds(ms) / 3600))
}

// ---- storage ----------------------------------------------------------------

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Coerces a parsed value into a valid timer, or null. A running timer that has already
 * ended (it ran out while the tab was closed) is null too: it is cleared silently.
 */
export function sanitizeTimer(raw: unknown, now: number): TimerStored | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  if (!finite(r.totalMs) || r.totalMs < TIMER_MIN_MS || r.totalMs > TIMER_MAX_MS) return null
  const totalMs = Math.round(r.totalMs)
  if (r.status === 'running') {
    if (!finite(r.endsAt)) return null
    const left = r.endsAt - now
    if (left <= 0 || left > TIMER_MAX_MS) return null
    return { status: 'running', endsAt: r.endsAt, totalMs }
  }
  if (r.status === 'paused') {
    if (!finite(r.remainingMs) || r.remainingMs <= 0 || r.remainingMs > TIMER_MAX_MS) return null
    return { status: 'paused', remainingMs: r.remainingMs, totalMs }
  }
  return null
}

export function defaultTimerStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** Never throws; anything unreadable or already ended is cleared and read as idle. */
export function loadTimer(storage: StorageLike | null, now: number): TimerStored | null {
  if (!storage) return null
  try {
    const text = storage.getItem(TIMER_KEY)
    if (!text) return null
    const timer = sanitizeTimer(JSON.parse(text), now)
    if (!timer) storage.removeItem(TIMER_KEY)
    return timer
  } catch {
    clearTimerStorage(storage)
    return null
  }
}

/** Writes the timer, or removes the key for idle. Never throws. */
export function saveTimer(storage: StorageLike | null, timer: TimerStored | null): void {
  if (!storage) return
  try {
    if (timer) storage.setItem(TIMER_KEY, JSON.stringify(timer))
    else storage.removeItem(TIMER_KEY)
  } catch {
    // ignore: the timer still runs in memory
  }
}

export function clearTimerStorage(storage: StorageLike | null = defaultTimerStorage()): void {
  saveTimer(storage, null)
}
