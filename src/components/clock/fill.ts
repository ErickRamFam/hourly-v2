/**
 * Hour-by-hour fill (DESIGN.md §6). Derived only from the current time: passed hours of the
 * lap stay lit, the current hour blends from a lighter tint into --hour-fill over the hour,
 * future hours stay unlit. Nothing here reads history or stored state.
 */

export type MarkState = 'passed' | 'current' | 'future'

/** State of ring section `i` when section `lit` is the current hour. */
export function markState(i: number, lit: number): MarkState {
  return i < lit ? 'passed' : i === lit ? 'current' : 'future'
}

/** How far through the hour `now` is, 0 at :00:00 to just under 1 at :59:59. */
export function hourProgress(now: Date): number {
  return (now.getMinutes() * 60 + now.getSeconds()) / 3600
}

/** Share of --hour-fill in the current mark: 55% at the top of the hour, 100% at its end. */
export function currentFillPct(progress: number): number {
  const p = Math.min(1, Math.max(0, progress))
  return Math.round(55 + 45 * p)
}

/** Colour of the current mark: --hour-fill mixed with white, deepening into the passed colour. */
export function currentFill(progress: number): string {
  return `color-mix(in oklab, var(--hour-fill) ${currentFillPct(progress)}%, white)`
}

/** Colour of a lit mark in `state` (future marks are hidden, so they take the passed colour). */
export function markFill(state: MarkState, current: string): string {
  return state === 'current' ? current : 'var(--hour-fill)'
}
