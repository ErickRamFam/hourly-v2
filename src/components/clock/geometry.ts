export const VIEWBOX = 400
export const CENTER = VIEWBOX / 2

export type Point = { x: number; y: number }

/** Rounds to 3 decimals so paths are stable across renders and readable in tests. */
export function round(n: number): number {
  return Math.round(n * 1000) / 1000
}

/** Point on a circle. Angles are degrees clockwise from 12 o'clock. */
export function polar(cx: number, cy: number, r: number, deg: number): Point {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: round(cx + r * Math.cos(rad)), y: round(cy + r * Math.sin(rad)) }
}

/**
 * Closed annular sector (ring slice) from `startDeg` to `endDeg` clockwise.
 * With `rInner` 0 this becomes a pie wedge.
 */
export function arcPath(cx: number, cy: number, rOuter: number, rInner: number, startDeg: number, endDeg: number): string {
  const sweep = endDeg - startDeg
  const large = sweep > 180 ? 1 : 0
  const o1 = polar(cx, cy, rOuter, startDeg)
  const o2 = polar(cx, cy, rOuter, endDeg)
  if (rInner <= 0) {
    return `M ${cx} ${cy} L ${o1.x} ${o1.y} A ${rOuter} ${rOuter} 0 ${large} 1 ${o2.x} ${o2.y} Z`
  }
  const i1 = polar(cx, cy, rInner, startDeg)
  const i2 = polar(cx, cy, rInner, endDeg)
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i2.x} ${i2.y}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${i1.x} ${i1.y}`,
    'Z',
  ].join(' ')
}

/** Open (stroke-only) arc along a circle from `startDeg` to `endDeg` clockwise. */
export function strokeArcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const sweep = endDeg - startDeg
  const large = sweep > 180 ? 1 : 0
  const a = polar(cx, cy, r, startDeg)
  const b = polar(cx, cy, r, endDeg)
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`
}

export const SECTION_DEG = 30

/** Start/end angles for section `index` (0 = 12 o'clock to 1 o'clock), shrunk by `gapDeg` on each side. */
export function sectionAngles(index: number, gapDeg = 0): { start: number; end: number; mid: number } {
  const start = index * SECTION_DEG
  return { start: start + gapDeg, end: start + SECTION_DEG - gapDeg, mid: start + SECTION_DEG / 2 }
}

/** The ring section (0–11) that is lit for a 24-hour `hour`. */
export function sectionForHour(hour: number): number {
  return ((Math.floor(hour) % 12) + 12) % 12
}

export type HandAngles = { hour: number; minute: number; second: number }

/** Hand rotations in degrees clockwise from 12. `sweep` includes milliseconds in the second hand. */
export function handAngles(date: Date, sweep: boolean): HandAngles {
  const ms = sweep ? date.getMilliseconds() : 0
  const s = date.getSeconds() + ms / 1000
  const m = date.getMinutes() + s / 60
  const h = (date.getHours() % 12) + m / 60
  return { hour: round(h * 30), minute: round(m * 6), second: round(s * 6) }
}

/**
 * Where the halo's light originates, as percentages of the clock box (DESIGN.md §5):
 * a = (hour % 12 + .5) * 30°; x = 50 + 16·sin(a); y = 50 − 16·cos(a).
 */
export function haloOrigin(hour: number): Point {
  const a = ((sectionForHour(hour) + 0.5) * SECTION_DEG * Math.PI) / 180
  return { x: round(50 + 16 * Math.sin(a)), y: round(50 - 16 * Math.cos(a)) }
}

/** Second-hand rotation that never runs backwards within a day, so a tick transition never spins the long way. */
export function continuousSecondDeg(date: Date, sweep: boolean): number {
  const ms = sweep ? date.getMilliseconds() : 0
  const s = date.getSeconds() + ms / 1000
  return round((date.getHours() * 3600 + date.getMinutes() * 60 + s) * 6)
}
