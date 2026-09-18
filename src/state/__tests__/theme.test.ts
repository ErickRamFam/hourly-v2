import { describe, expect, it } from 'vitest'
import { resolveTheme } from '../theme'

describe('resolveTheme', () => {
  const base = { themeOverride: 'auto' as const, dayStart: 6, nightStart: 19 }
  it('follows the day/night boundaries in auto mode', () => {
    expect(resolveTheme(base, new Date(2026, 8, 17, 9))).toBe('light')
    expect(resolveTheme(base, new Date(2026, 8, 17, 21))).toBe('dark')
    expect(resolveTheme(base, new Date(2026, 8, 17, 19))).toBe('dark')
  })
  it('honors overrides', () => {
    expect(resolveTheme({ ...base, themeOverride: 'dark' }, new Date(2026, 8, 17, 9))).toBe('dark')
    expect(resolveTheme({ ...base, themeOverride: 'light' }, new Date(2026, 8, 17, 23))).toBe('light')
  })
})
