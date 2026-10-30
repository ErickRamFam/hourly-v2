import { describe, expect, it } from 'vitest'
import type { StorageLike } from '../storage'
import {
  TIMER_KEY,
  barFraction,
  formatTimer,
  loadTimer,
  parseTimerInput,
  pauseTimer,
  remainingMs,
  resumeTimer,
  sanitizeTimer,
  saveTimer,
  startTimer,
} from '../timer'
import { barSegments } from '../../components/timerVisuals'

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) }
}

const T0 = 1_800_000_000_000

describe('parseTimerInput', () => {
  it.each([
    ['5', 5 * 60_000],
    ['05', 5 * 60_000],
    ['  5  ', 5 * 60_000],
    ['5:30', 330_000],
    ['05:30', 330_000],
    ['00:01', 1000],
    ['60', 3_600_000],
    ['60:00', 3_600_000],
  ])('%j is %i ms', (input, ms) => {
    expect(parseTimerInput(input)).toEqual({ kind: 'time', ms })
  })
  it.each(['0', '00', '00:00', '0:00'])('%j is zero', (input) => {
    expect(parseTimerInput(input)).toEqual({ kind: 'zero' })
  })
  it.each(['', '   ', '60:01', '61', '5:75', '5:7', '1.5', '1:30.5', '-5', 'abc', '5m', '1:2:3', '100', ':30', '5:'])('%j is invalid', (input) => {
    expect(parseTimerInput(input)).toEqual({ kind: 'invalid' })
  })
})

describe('countdown math', () => {
  it('formats remaining time rounded up to whole seconds', () => {
    expect(formatTimer(0)).toBe('00:00')
    expect(formatTimer(1)).toBe('00:01')
    expect(formatTimer(999)).toBe('00:01')
    expect(formatTimer(1000)).toBe('00:01')
    expect(formatTimer(1001)).toBe('00:02')
    expect(formatTimer(14 * 60_000 + 32_000)).toBe('14:32')
    expect(formatTimer(3_600_000)).toBe('60:00')
  })
  it('counts down from endsAt, pauses and resumes without drift', () => {
    const running = startTimer(600_000, T0)
    expect(running).toEqual({ status: 'running', endsAt: T0 + 600_000, totalMs: 600_000 })
    expect(remainingMs(running, T0 + 90_000)).toBe(510_000)
    const paused = pauseTimer(running, T0 + 90_000)
    expect(paused).toEqual({ status: 'paused', remainingMs: 510_000, totalMs: 600_000 })
    // However long it sits paused, it resumes with what was left.
    expect(remainingMs(paused, T0 + 999_999)).toBe(510_000)
    const resumed = resumeTimer(paused, T0 + 1_000_000)
    expect(resumed.endsAt).toBe(T0 + 1_510_000)
    expect(remainingMs(resumed, T0 + 2_000_000)).toBe(0)
  })
  it('sizes the bar by remaining / 60:00', () => {
    expect(barFraction(3_600_000)).toBe(1)
    expect(barFraction(1_800_000)).toBe(0.5)
    expect(barFraction(0)).toBe(0)
  })
  it('builds the bar from short overlapping segments, current colour to next', () => {
    expect(barSegments(0)).toEqual([])
    const segs = barSegments(180)
    expect(segs).toHaveLength(45)
    expect(segs[0].color).toBe('color-mix(in oklab, var(--hour-fill-next) 1%, var(--hour-fill))')
    expect(segs.at(-1)!.color).toBe('color-mix(in oklab, var(--hour-fill-next) 99%, var(--hour-fill))')
    expect(barSegments(360)).toHaveLength(90)
  })
})

describe('timer storage', () => {
  it('round-trips a running timer and resumes with the right remaining time after reload', () => {
    const s = memoryStorage()
    saveTimer(s, startTimer(600_000, T0))
    const loaded = loadTimer(s, T0 + 60_000)
    expect(loaded).toEqual({ status: 'running', endsAt: T0 + 600_000, totalMs: 600_000 })
    expect(remainingMs(loaded, T0 + 60_000)).toBe(540_000)
  })
  it('clears a timer that ended while the tab was closed', () => {
    const s = memoryStorage()
    saveTimer(s, startTimer(60_000, T0))
    expect(loadTimer(s, T0 + 60_000)).toBeNull()
    expect(s.data.has(TIMER_KEY)).toBe(false)
  })
  it('keeps a paused timer', () => {
    const s = memoryStorage()
    saveTimer(s, { status: 'paused', remainingMs: 5000, totalMs: 60_000 })
    expect(loadTimer(s, T0 * 2)).toEqual({ status: 'paused', remainingMs: 5000, totalMs: 60_000 })
  })
  it('sanitizes garbage to idle and never throws', () => {
    expect(sanitizeTimer(null, T0)).toBeNull()
    expect(sanitizeTimer([], T0)).toBeNull()
    expect(sanitizeTimer({ status: 'running', endsAt: 'soon', totalMs: 1000 }, T0)).toBeNull()
    expect(sanitizeTimer({ status: 'running', endsAt: T0 + 9_999_999, totalMs: 1000 }, T0)).toBeNull()
    expect(sanitizeTimer({ status: 'paused', remainingMs: -1, totalMs: 1000 }, T0)).toBeNull()
    expect(sanitizeTimer({ status: 'paused', remainingMs: 500, totalMs: 1e9 }, T0)).toBeNull()
    expect(sanitizeTimer({ status: 'stopped', totalMs: 1000 }, T0)).toBeNull()
    const s = memoryStorage()
    s.setItem(TIMER_KEY, '{nope')
    expect(loadTimer(s, T0)).toBeNull()
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('quota')
      },
      removeItem: () => {
        throw new Error('denied')
      },
    }
    expect(loadTimer(broken, T0)).toBeNull()
    expect(() => saveTimer(broken, startTimer(1000, T0))).not.toThrow()
    expect(loadTimer(null, T0)).toBeNull()
  })
  it('saving idle removes the key', () => {
    const s = memoryStorage()
    saveTimer(s, startTimer(1000, T0))
    saveTimer(s, null)
    expect(s.data.has(TIMER_KEY)).toBe(false)
  })
})
