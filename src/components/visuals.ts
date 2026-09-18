import type { Sky } from '../lib/skies'

/** Disc opacity for a day's share cleared (DESIGN.md §8): filled by light, never by angle. */
export function discOpacity(done: number, total: number): number {
  if (total === 0 || done === 0) return 0
  return Math.max(0.15, done / total)
}

/** 24 stops as a smooth linear gradient: stop i sits at i/23 of the width (DESIGN.md §8). */
export function skyGradient(sky: Sky): string {
  const stops = sky.hours.map((hex, i) => `${hex} ${((i / 23) * 100).toFixed(2)}%`)
  return `linear-gradient(90deg, ${stops.join(', ')})`
}

/** Left offset in px of the current-hour tick under a strip of `width` px. */
export function skyTickLeft(hour: number, width = 200): number {
  return ((hour + 0.5) / 24) * width
}
