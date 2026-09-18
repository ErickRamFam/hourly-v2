import { useId } from 'react'
import type { DialId } from '../../lib/dials'
import { lapStops, type Sky } from '../../lib/skies'
import { ART, GLOW } from './dialGeometry'
import { CENTER, VIEWBOX, arcPath, polar, sectionAngles, strokeArcPath } from './geometry'
import { lanternTint, ringTint } from './tint'

const C = CENTER
const SECTIONS = Array.from({ length: 12 }, (_, i) => i)

/**
 * Collection art (DESIGN.md §8): the dial drawn straight on the glass at 64px, no tile,
 * lit at hour 10 with the near bloom copy only. Heavier strokes than the clock (ART).
 */
export function DialArt({ dial, sky }: { dial: DialId; sky: Sky }) {
  const id = useId()
  const near = `${id}-near`
  const grad = `${id}-lantern`
  const stops = lapStops(sky, ART.litHour)
  const lit = ART.litHour % 12
  const bloom = { filter: `url(#${near})`, style: { opacity: 'var(--glow-near)' } }

  let body: React.ReactNode
  switch (dial) {
    case 'sector': {
      const g = ART.sector
      const litPath = (() => {
        const a = sectionAngles(lit, g.gapDeg)
        return arcPath(C, C, g.rOuter, g.rInner, a.start, a.end)
      })()
      body = (
        <>
          <path d={litPath} fill="var(--hour-bloom)" {...bloom} />
          {SECTIONS.map((i) => {
            const a = sectionAngles(i, g.gapDeg)
            return <path key={i} d={arcPath(C, C, g.rOuter, g.rInner, a.start, a.end)} style={{ fill: i === lit ? 'var(--hour-fill)' : ringTint(stops[i]) }} />
          })}
        </>
      )
      break
    }
    case 'hairline': {
      const g = ART.hairline
      const a = sectionAngles(lit)
      const arc = strokeArcPath(C, C, g.ring, a.start + g.litInsetDeg, a.end - g.litInsetDeg)
      body = (
        <>
          <path d={arc} fill="none" stroke="var(--hour-bloom)" strokeWidth={g.glowWidth} strokeLinecap="round" {...bloom} />
          <circle cx={C} cy={C} r={g.ring} fill="none" stroke="var(--line-strong)" strokeWidth={g.ringWidth} />
          {SECTIONS.map((i) => {
            const p = polar(C, C, g.tick.outer, i * 30)
            const q = polar(C, C, g.tick.inner, i * 30)
            return <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="var(--ink)" strokeWidth={g.tick.width} strokeLinecap="round" />
          })}
          <path d={arc} fill="none" stroke="var(--hour-fill)" strokeWidth={g.litWidth} strokeLinecap="round" />
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
            i === lit ? null : <line key={i} {...ray(i)} stroke="var(--slate)" strokeOpacity={g.opacity} strokeWidth={g.width} strokeLinecap="round" />,
          )}
          <line {...ray(lit)} stroke="var(--hour-fill)" strokeWidth={g.litWidth} strokeLinecap="round" />
        </>
      )
      break
    }
    case 'lantern': {
      const g = ART.lantern
      const a = sectionAngles(lit)
      const litPath = arcPath(C, C, g.rOuter, 0, a.start, a.end)
      body = (
        <>
          <defs>
            <radialGradient id={grad} gradientUnits="userSpaceOnUse" cx={C} cy={C} r={g.rOuter}>
              <stop offset="0" stopColor="var(--hour-fill)" stopOpacity={0} />
              <stop offset="1" stopColor="var(--hour-fill)" stopOpacity={0.85} />
            </radialGradient>
          </defs>
          <path d={litPath} fill="var(--hour-bloom)" {...bloom} />
          {SECTIONS.map((i) => {
            const s = sectionAngles(i)
            return i === lit ? null : <path key={i} d={arcPath(C, C, g.rOuter, 0, s.start, s.end)} style={{ fill: lanternTint(stops[i]) }} />
          })}
          <path d={litPath} fill={`url(#${grad})`} />
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
            return i === lit ? null : <circle key={i} cx={q.x} cy={q.y} r={g.dot} fill="var(--orbit-dot)" />
          })}
          <circle cx={litP.x} cy={litP.y} r={g.litDot} fill="var(--hour-fill)" />
        </>
      )
      break
    }
  }

  return (
    <svg className="art block size-16 flex-none" viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} overflow="visible" aria-hidden="true" data-art={dial}>
      <defs>
        <filter id={near} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={GLOW.near} />
        </filter>
      </defs>
      {body}
    </svg>
  )
}
