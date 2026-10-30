import { arcPath, CENTER } from './clock/geometry'
import { formatTimer } from '../lib/timer'
import type { Timer } from '../state/useTimer'

const C = CENTER
/** Outside the hour ring (r 186 to 189.5 with the bezel): DESIGN.md §6, Timer. */
export const BAR = { rInner: 198, rOuter: 208, segDeg: 4, overlapDeg: 0.5 } as const

/**
 * Short annular segments from 12 o'clock to `sweepDeg`, each a step from the current hour's
 * lit colour (at 12) toward the next hour's (at the tip). A linear or radial SVG gradient
 * cannot follow an arc; segments can. Each overlaps the next by half a degree so no seam shows.
 */
export function barSegments(sweepDeg: number): { d: string; color: string }[] {
  const out: { d: string; color: string }[] = []
  if (sweepDeg <= 0) return out
  for (let start = 0; start < sweepDeg; start += BAR.segDeg) {
    const end = Math.min(sweepDeg, start + BAR.segDeg + BAR.overlapDeg)
    const pct = Math.round((((start + end) / 2) / sweepDeg) * 100)
    out.push({
      d: arcPath(C, C, BAR.rOuter, BAR.rInner, start, end),
      color: `color-mix(in oklab, var(--hour-fill-next) ${pct}%, var(--hour-fill))`,
    })
  }
  return out
}

/** Screen-reader name of the label button for each phase. */
export function timerLabelName(timer: Pick<Timer, 'phase' | 'remainingMs'>): string {
  const t = formatTimer(timer.remainingMs)
  if (timer.phase === 'running') return `Timer, ${t} left. Press to pause and edit`
  if (timer.phase === 'paused') return `Timer paused, ${t} left. Press to edit`
  return 'Timer, 00:00. Press to set a time'
}
