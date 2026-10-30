import { useLayoutEffect } from 'react'
import { hourHue, litHue, type Sky } from '../lib/skies'
import { haloOrigin } from '../components/clock/geometry'
import { resolveTheme } from './theme'
import type { Settings } from './types'

/**
 * Mirrors runtime state onto <html> for the design system (DESIGN.md §1, §5):
 * --hour (the ramp stop), --hour-next, --hour-lit (Graphite only: the Daylight stop, so
 * --hour-fill stays coloured), --hour-lit-next (the same for the next hour, for the timer
 * bar's --hour-fill-next), --halo-x/--halo-y (light comes from the lit section),
 * data-theme, data-sky, data-hour, and data-reduce-motion="true".
 */
export function useHourHue(now: Date, sky: Sky, settings: Settings, reduceMotion: boolean): void {
  const hour = now.getHours()
  const theme = resolveTheme(settings, now)
  const hue = hourHue(sky, hour)
  const next = hourHue(sky, hour + 1)
  const lit = litHue(sky, hour)
  const litNext = litHue(sky, hour + 1)

  // Layout effect: the first values land before first paint, so nothing transitions at load.
  useLayoutEffect(() => {
    const root = document.documentElement
    const halo = haloOrigin(hour)
    root.style.setProperty('--hour', hue)
    root.style.setProperty('--hour-next', next)
    // --hour-lit only for skies that borrow their lit colour (Graphite); tokens.css falls back to --hour.
    if (lit === hue) root.style.removeProperty('--hour-lit')
    else root.style.setProperty('--hour-lit', lit)
    if (litNext === next) root.style.removeProperty('--hour-lit-next')
    else root.style.setProperty('--hour-lit-next', litNext)
    root.style.setProperty('--halo-x', `${halo.x}%`)
    root.style.setProperty('--halo-y', `${halo.y}%`)
    root.dataset.theme = theme
    root.dataset.sky = sky.id
    root.dataset.hour = String(hour)
    if (reduceMotion) root.dataset.reduceMotion = 'true'
    else delete root.dataset.reduceMotion
    // Enable the 1200ms hue transition only once the first values have painted.
    if (!root.dataset.hueReady) {
      const frame = requestAnimationFrame(() => {
        root.dataset.hueReady = 'true'
      })
      return () => cancelAnimationFrame(frame)
    }
  }, [hue, next, lit, litNext, theme, sky.id, hour, reduceMotion])
}
