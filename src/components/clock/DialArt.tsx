import { useId } from 'react'
import type { DialId } from '../../lib/dials'
import { lapStops, type Sky } from '../../lib/skies'
import { ART, GLOW } from './dialGeometry'
import type { ClockFill } from '../../state/types'
import { currentMarkFill, markFill, markLit, markState } from './fill'
import { CENTER, VIEWBOX, arcPath, polar, sectionAngles, strokeArcPath } from './geometry'
import { lanternTint, ringTint } from './tint'

const C = CENTER
const SECTIONS = Array.from({ length: 12 }, (_, i) => i)
/** The art's current hour is halfway through, so its blend sits between the two ends. */
const ART_PROGRESS = 0.5

/**
 * Collection art (DESIGN.md §8): the dial drawn straight on the glass at 64px, no tile,
 * filled to hour 10: hours 0 to 9 passed, hour 10 current with its near bloom copy only.
 * Heavier strokes than the clock (ART). Follows the Clock display setting: in Hour only the
 * passed hours are drawn unlit.
 */
export function DialArt({ dial, sky, fill: mode = 'blend' }: { dial: DialId; sky: Sky; fill?: ClockFill }) {
  const id = useId()
  const near = `${id}-near`
  const grad = `${id}-lantern`
  const gradNow = `${id}-lantern-now`
  const stops = lapStops(sky, ART.litHour)
  const lit = ART.litHour % 12
  const current = currentMarkFill(mode, ART_PROGRESS)
  // Unlit marks read as 'future' so every branch below draws them in its unlit style.
  const state = (i: number) => {
    const s = markState(i, lit)
    return markLit(s, mode) ? s : 'future'
  }
  const fill = (i: number) => markFill(state(i), current)
  const bloom = { filter: `url(#${near})`, style: { opacity: 'var(--glow-near)' } }

  let body: React.ReactNode
  switch (dial) {
    case 'sector': {
      const g = ART.sector
      const wedge = (i: number) => {
        const a = sectionAngles(i, g.gapDeg)
        return arcPath(C, C, g.rOuter, g.rInner, a.start, a.end)
      }
      body = (
        <>
          <path d={wedge(lit)} fill="var(--hour-bloom)" {...bloom} />
          {SECTIONS.map((i) => (
            <path key={i} d={wedge(i)} style={{ fill: state(i) === 'future' ? ringTint(stops[i]) : fill(i) }} />
          ))}
        </>
      )
      break
    }
    case 'hairline': {
      const g = ART.hairline
      const arc = (i: number) => {
        const a = sectionAngles(i)
        return strokeArcPath(C, C, g.ring, a.start + g.litInsetDeg, a.end - g.litInsetDeg)
      }
      body = (
        <>
          <path d={arc(lit)} fill="none" stroke="var(--hour-bloom)" strokeWidth={g.glowWidth} strokeLinecap="round" {...bloom} />
          <circle cx={C} cy={C} r={g.ring} fill="none" stroke="var(--line-strong)" strokeWidth={g.ringWidth} />
          {SECTIONS.map((i) => {
            const p = polar(C, C, g.tick.outer, i * 30)
            const q = polar(C, C, g.tick.inner, i * 30)
            return <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="var(--ink)" strokeWidth={g.tick.width} strokeLinecap="round" />
          })}
          {SECTIONS.map((i) =>
            state(i) === 'future' ? null : <path key={i} d={arc(i)} fill="none" style={{ stroke: fill(i) }} strokeWidth={g.litWidth} strokeLinecap="round" />,
          )}
        </>
      )
      break
    }
    case 'rays': {
      const g = ART.rays
      const ray = (i: number) => {
        const { mid } = sectionAngles(i)
        const p = polar(C, C, g.inner, mid)
        const q = polar(C, C, g.outer, mid)
        return { x1: p.x, y1: p.y, x2: q.x, y2: q.y }
      }
      body = (
        <>
          <line {...ray(lit)} stroke="var(--hour-bloom)" strokeWidth={g.glowWidth} strokeLinecap="round" {...bloom} />
          {SECTIONS.map((i) =>
            state(i) === 'future' ? (
              <line key={i} {...ray(i)} stroke="var(--slate)" strokeOpacity={g.opacity} strokeWidth={g.width} strokeLinecap="round" />
            ) : (
              <line key={i} {...ray(i)} style={{ stroke: fill(i) }} strokeWidth={g.litWidth} strokeLinecap="round" />
            ),
          )}
        </>
      )
      break
    }
    case 'lantern': {
      const g = ART.lantern
      const wedge = (i: number) => {
        const a = sectionAngles(i)
        return arcPath(C, C, g.rOuter, 0, a.start, a.end)
      }
      body = (
        <>
          <defs>
            <radialGradient id={grad} gradientUnits="userSpaceOnUse" cx={C} cy={C} r={g.rOuter}>
              <stop offset="0" stopColor="var(--hour-fill)" stopOpacity={0} />
              <stop offset="1" stopColor="var(--hour-fill)" stopOpacity={0.85} />
            </radialGradient>
            <radialGradient id={gradNow} gradientUnits="userSpaceOnUse" cx={C} cy={C} r={g.rOuter}>
              <stop offset="0" style={{ stopColor: current }} stopOpacity={0} />
              <stop offset="1" style={{ stopColor: current }} stopOpacity={0.85} />
            </radialGradient>
          </defs>
          <path d={wedge(lit)} fill="var(--hour-bloom)" {...bloom} />
          {SECTIONS.map((i) => {
            const s = state(i)
            if (s === 'future') return <path key={i} d={wedge(i)} style={{ fill: lanternTint(stops[i]) }} />
            return <path key={i} d={wedge(i)} fill={`url(#${s === 'current' ? gradNow : grad})`} />
          })}
        </>
      )
      break
    }
    case 'orbit': {
      const g = ART.orbit
      const p = (i: number) => polar(C, C, g.radius, sectionAngles(i).mid)
      const litP = p(lit)
      body = (
        <>
          <circle cx={litP.x} cy={litP.y} r={g.glowDot} fill="var(--hour-bloom)" {...bloom} />
          <circle cx={C} cy={C} r={g.radius} fill="none" stroke="var(--line-strong)" strokeWidth={g.ringWidth} />
          {SECTIONS.map((i) => {
            const q = p(i)
            return state(i) === 'future' ? (
              <circle key={i} cx={q.x} cy={q.y} r={g.dot} fill="var(--orbit-dot)" />
            ) : (
              <circle key={i} cx={q.x} cy={q.y} r={g.litDot} style={{ fill: fill(i) }} />
            )
          })}
        </>
      )
      break
    }
  }

  return (
    <svg className="art block size-16 flex-none" viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} overflow="visible" aria-hidden="true" data-art={dial} data-fill={mode}>
      <defs>
        <filter id={near} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={GLOW.near} />
        </filter>
      </defs>
      {body}
    </svg>
  )
}
