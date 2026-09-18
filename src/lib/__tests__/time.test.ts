import { describe, expect, it } from 'vitest'
import {
  HOUR_LINES,
  HOUR_WORDS,
  dayKey,
  formatHourLabel,
  formatHourStop,
  formatLongDate,
  formatShortDate,
  formatTime,
  hourLine,
  hourWord,
  isDaytime,
  msUntilNextMinute,
  msUntilNextSecond,
  parseDayKey,
  shiftDayKey,
} from '../time'

describe('dayKey', () => {
  it('uses the calendar date after the rollover hour', () => {
    expect(dayKey(new Date(2026, 8, 17, 4, 0))).toBe('2026-09-17')
    expect(dayKey(new Date(2026, 8, 17, 23, 59))).toBe('2026-09-17')
  })
  it('belongs to the previous day before 4:00', () => {
    expect(dayKey(new Date(2026, 8, 17, 3, 59))).toBe('2026-09-16')
    expect(dayKey(new Date(2026, 8, 17, 0, 0))).toBe('2026-09-16')
  })
  it('respects a custom rollover hour', () => {
    expect(dayKey(new Date(2026, 8, 17, 1, 0), 0)).toBe('2026-09-17')
    expect(dayKey(new Date(2026, 0, 1, 2, 0), 4)).toBe('2025-12-31')
  })
})

describe('parseDayKey / shiftDayKey', () => {
  it('round-trips', () => {
    const d = parseDayKey('2026-09-17')
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getMonth()).toBe(8)
    expect(d?.getDate()).toBe(17)
    expect(d?.getHours()).toBe(12)
  })
  it('rejects garbage', () => {
    expect(parseDayKey('nope')).toBeNull()
    expect(parseDayKey('2026-9-1')).toBeNull()
  })
  it('shifts across month and year boundaries', () => {
    expect(shiftDayKey('2026-09-17', -6)).toBe('2026-09-11')
    expect(shiftDayKey('2026-01-01', -1)).toBe('2025-12-31')
    expect(shiftDayKey('2026-02-28', 1)).toBe('2026-03-01')
  })
})

describe('isDaytime', () => {
  const at = (h: number) => new Date(2026, 8, 17, h, 30)
  it('is inside [dayStart, nightStart)', () => {
    expect(isDaytime(at(6), 6, 19)).toBe(true)
    expect(isDaytime(at(18), 6, 19)).toBe(true)
    expect(isDaytime(at(19), 6, 19)).toBe(false)
    expect(isDaytime(at(5), 6, 19)).toBe(false)
  })
  it('wraps when the boundaries are inverted', () => {
    expect(isDaytime(at(23), 20, 4)).toBe(true)
    expect(isDaytime(at(2), 20, 4)).toBe(true)
    expect(isDaytime(at(12), 20, 4)).toBe(false)
  })
  it('is never daytime with equal boundaries', () => {
    expect(isDaytime(at(12), 8, 8)).toBe(false)
  })
})

describe('formatting', () => {
  it('formats 12h and 24h time', () => {
    expect(formatTime(new Date(2026, 8, 17, 15, 5), false)).toBe('3:05 pm')
    expect(formatTime(new Date(2026, 8, 17, 15, 5), true)).toBe('15:05')
    expect(formatTime(new Date(2026, 8, 17, 0, 0), false)).toBe('12:00 am')
    expect(formatTime(new Date(2026, 8, 17, 0, 0), true)).toBe('00:00')
    expect(formatTime(new Date(2026, 8, 17, 12, 0), false)).toBe('12:00 pm')
  })
  it('formats hour labels', () => {
    expect(formatHourLabel(4, false)).toBe('4:00 am')
    expect(formatHourLabel(19, true)).toBe('19:00')
    expect(formatHourStop(6)).toBe('6:00')
    expect(formatHourStop(19)).toBe('19:00')
    expect(formatHourStop(24)).toBe('0:00')
    expect(formatHourStop(19, false)).toBe('7 pm')
    expect(formatHourStop(6, false)).toBe('6 am')
    expect(formatHourStop(12, false)).toBe('12 pm')
    expect(formatHourStop(0, false)).toBe('12 am')
    expect(formatHourStop(19, true)).toBe('19:00')
  })
  it('formats the long date', () => {
    expect(formatLongDate(new Date(2026, 8, 17))).toBe('Thursday, 17 September')
    expect(formatLongDate(new Date(2026, 8, 16))).toBe('Wednesday, 16 September')
    expect(formatShortDate(new Date(2026, 8, 16))).toBe('Wed 16 Sep')
  })
})

describe('hourWord', () => {
  it('has 24 words and 24 lines', () => {
    expect(HOUR_WORDS).toHaveLength(24)
    expect(HOUR_LINES).toHaveLength(24)
  })
  it('maps hours to DESIGN.md copy', () => {
    expect(hourWord(0)).toBe('Midnight')
    expect(hourWord(2)).toBe('The small hours')
    expect(hourWord(10)).toBe('Late morning')
    expect(hourWord(12)).toBe('Noon')
    expect(hourWord(17)).toBe('Golden hour')
    expect(hourWord(19)).toBe('Evening')
    expect(hourWord(23)).toBe('Nearly midnight')
    expect(hourLine(19)).toBe('The day is winding down, and the light with it.')
    expect(hourLine(10)).toBe('The best light of the day for getting things done.')
  })
  it('wraps out-of-range hours', () => {
    expect(hourWord(24)).toBe('Midnight')
    expect(hourWord(-1)).toBe('Nearly midnight')
    expect(hourLine(24)).toBe(hourLine(0))
  })
})

describe('boundaries', () => {
  it('computes ms to the next second and minute', () => {
    expect(msUntilNextSecond(new Date(2026, 0, 1, 0, 0, 0, 250))).toBe(750)
    expect(msUntilNextMinute(new Date(2026, 0, 1, 0, 0, 30, 500))).toBe(29_500)
  })
})
