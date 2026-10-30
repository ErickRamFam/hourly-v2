import { VIEWBOX } from './clock/geometry'
import { barFraction } from '../lib/timer'
import type { Timer } from '../state/useTimer'
import { barSegments } from './timerVisuals'

/**
 * The countdown bar, a separate SVG over the clock (never part of it). Covers remaining / 60:00
 * of the circle and shrinks back toward 12. At time up the full ring fades in and out three
 * times (static and brief with reduced motion, gated here as well as in CSS).
 */
export function TimerBar({ timer, reduceMotion }: { timer: Timer; reduceMotion: boolean }) {
  const { phase } = timer
  if (phase === 'idle') return null
  const done = phase === 'done'
  const sweep = done ? 360 : barFraction(timer.remainingMs) * 360
  return (
    <svg
      className={['timer-bar', done && !reduceMotion ? 'timer-done' : ''].filter(Boolean).join(' ')}
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      overflow="visible"
      aria-hidden="true"
      data-phase={phase}
      data-sweep={Math.round(sweep * 100) / 100}
    >
      {barSegments(sweep).map((s, i) => (
        <path key={i} d={s.d} style={{ fill: s.color }} />
      ))}
    </svg>
  )
}
