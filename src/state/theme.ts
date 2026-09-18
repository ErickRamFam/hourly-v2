import { isDaytime } from '../lib/time'
import type { Settings } from './types'

export type Theme = 'light' | 'dark'

export function resolveTheme(settings: Pick<Settings, 'themeOverride' | 'dayStart' | 'nightStart'>, now: Date): Theme {
  if (settings.themeOverride !== 'auto') return settings.themeOverride
  return isDaytime(now, settings.dayStart, settings.nightStart) ? 'light' : 'dark'
}
