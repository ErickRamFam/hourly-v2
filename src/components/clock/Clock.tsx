import { useId, type ReactNode } from 'react'
import type { DialId } from '../../lib/dials'
import { lapStops, type Sky } from '../../lib/skies'
import { formatTime } from '../../lib/time'
import type { SecondHandMode } from '../../state/types'
import { GLOW, HAIRLINE, HANDS, LANTERN, NUMERALS, ORBIT, RAYS, RING, TICKS } from './dialGeometry'
import { CENTER, VIEWBOX, arcPath, continuousSecondDeg, handAngles, polar, sectionAngles, sectionForHour, strokeArcPath } from './geometry'
import { lanternTint, ringTint } from './tint'

export type ClockProps = {
  now: Date
  dial: DialId
  sky: Sky
  secondHand: SecondHandMode
  /** True when the second hand should not sweep (reduced motion). */
  reduceMotion: boolean
  use24h: boolean
  /** Collection preview: decorative, and the Sector preview drops numerals and minute ticks (§8). */
  preview?: boolean
  className?: string
}

const C = CENTER
const SECTIONS = Array.from({ length: 12 }, (_, i) => i)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)
const NUMERAL_POSITIONS = Array.from({ length: 12 }, (_, i) => i + 1)

type Ids = { near: string; far: string; lantern: string }
type FaceProps = { lit: number; stops: string[]; ids: Ids; hour: number; use24h: boolean; preview: boolean }

/**
 * Everything drawn as "lit" is rendered once per section and crossfaded by opacity, so at the
 * top of the hour the old mark fades to nothing while the new one rises (DESIGN.md §6,
 * critique 02 m5). The lit colour derives from the transitioning --hour, so only opacity
 * (and Orbit's scale) ever transitions. The layer as a whole fades in once at load.
 */
function LitLayer({ lit, className, children }: { lit: number; className?: string; children: (i: number, isLit: boolean) => ReactNode }) {
  return (
    <g className={['light-on', className].filter(Boolean).join(' ')} aria-hidden="true">
      {SECTIONS.map((i) => (
        <g key={i} className="clock-lit" data-lit={i === lit || undefined} opacity={i === lit ? 1 : 0}>
          {children(i, i === lit)}
        </g>
      ))}
    </g>
  )
}

/** The two bloom copies under the lit mark (§6): far blur 16 at --glow-far, near blur 6 at --glow-near. */
function Bloom({ ids, lit, children }: { ids: Ids; lit: number; children: (i: number, filter: string) => ReactNode }) {
  return (
    <LitLayer lit={lit} className="clock-glow">
      {(i) => (
        <>
          <g style={{ opacity: 'var(--glow-far)' }}>{children(i, `url(#${ids.far})`)}</g>
          <g style={{ opacity: 'var(--glow-near)' }}>{children(i, `url(#${ids.near})`)}</g>
        </>
      )}
    </LitLayer>
  )
}

type TickSpec = { outer: number; inner: number; width: number }

function Ticks({ minute, hour }: { minute: (TickSpec & { opacity: number }) | null; hour: TickSpec }) {
  return (
    <g className="clock-ticks" aria-hidden="true">
      {MINUTES.map((i) => {
        const deg = i * 6
        const isHour = i % 5 === 0
        if (!isHour && !minute) return null
        const spec = isHour ? hour : minute!
        const a = polar(C, C, spec.outer, deg)
        const b = polar(C, C, spec.inner, deg)
        return (
          <line
            key={i}
            className={isHour ? 'clock-tick clock-tick-hour' : 'clock-tick clock-tick-minute'}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={isHour ? 'var(--ink)' : 'var(--pewter)'}
            strokeOpacity={isHour ? 1 : minute!.opacity}
            strokeWidth={spec.width}
            strokeLinecap={isHour ? 'round' : undefined}
          />
        )
      })}
    </g>
  )
}

function Numerals({ radius, hour, use24h }: { radius: number; hour: number; use24h: boolean }) {
  const pm = use24h && hour >= 12
  return (
    <g className="clock-numerals" aria-hidden="true">
      {NUMERAL_POSITIONS.map((n) => {
        const p = polar(C, C, radius, n * 30)
        return (
          <text
            key={n}
            className="clock-numeral"
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={NUMERALS.fontSize}
            fontWeight={500}
            fill="var(--ink)"
            fillOpacity={NUMERALS.opacity}
          >
            {pm ? n + 12 : n}
          </text>
        )
      })}
    </g>
  )
}

function SectorFace({ lit, stops, ids, hour, use24h, preview }: FaceProps) {
  const wedge = (i: number) => {
    const a = sectionAngles(i, RING.gapDeg)
    return arcPath(C, C, RING.rOuter, RING.rInner, a.start, a.end)
  }
  return (
    <>
      <Bloom ids={ids} lit={lit}>
        {(i, filter) => <path d={wedge(i)} fill="var(--hour-bloom)" filter={filter} />}
      </Bloom>
      <circle className="clock-bezel" cx={C} cy={C} r={RING.bezel} fill="none" stroke="var(--line)" strokeWidth={1} />
      <g className="clock-sections">
        {SECTIONS.map((i) => (
          <path key={i} className="clock-section" data-section={i} d={wedge(i)} style={{ fill: ringTint(stops[i]) }} />
        ))}
      </g>
      <LitLayer lit={lit} className="clock-lit-layer">
        {(i) => {
          const a = sectionAngles(i, RING.gapDeg)
          return (
            <>
              <path d={wedge(i)} fill="var(--hour-fill)" />
              <path
                d={strokeArcPath(C, C, RING.edge.r, a.start + RING.edge.insetDeg, a.end - RING.edge.insetDeg)}
                fill="none"
                stroke="white"
                strokeOpacity="var(--edge-alpha)"
                strokeWidth={1}
              />
              <path
                d={strokeArcPath(C, C, RING.innerEdge.r, a.start + RING.innerEdge.insetDeg, a.end - RING.innerEdge.insetDeg)}
                fill="none"
                stroke="var(--hour-fill)"
                strokeOpacity="var(--wedge-edge)"
                strokeWidth={1}
              />
            </>
          )
        }}
      </LitLayer>
      <Ticks minute={preview ? null : TICKS.minute} hour={TICKS.hour} />
      {!preview && <Numerals radius={NUMERALS.radius} hour={hour} use24h={use24h} />}
    </>
  )
}

function HairlineFace({ lit, ids, hour, use24h }: FaceProps) {
  const arc = (i: number) => {
    const a = sectionAngles(i)
    return strokeArcPath(C, C, HAIRLINE.ring, a.start + HAIRLINE.litInsetDeg, a.end - HAIRLINE.litInsetDeg)
  }
  return (
    <>
      <Bloom ids={ids} lit={lit}>
        {(i, filter) => <path d={arc(i)} fill="none" stroke="var(--hour-bloom)" strokeWidth={HAIRLINE.litWidth} strokeLinecap="round" filter={filter} />}
      </Bloom>
      <circle className="clock-ring" cx={C} cy={C} r={HAIRLINE.ring} fill="none" stroke="var(--line-strong)" strokeWidth={HAIRLINE.ringWidth} />
      <Ticks minute={HAIRLINE.minuteTick} hour={HAIRLINE.hourTick} />
      <LitLayer lit={lit} className="clock-lit-layer">
        {(i) => <path className="clock-lit-arc" d={arc(i)} fill="none" stroke="var(--hour-fill)" strokeWidth={HAIRLINE.litWidth} strokeLinecap="round" />}
      </LitLayer>
      <Numerals radius={NUMERALS.radius} hour={hour} use24h={use24h} />
    </>
  )
}

function RaysFace({ lit, ids, hour, use24h }: FaceProps) {
  const ray = (i: number) => {
    const { mid } = sectionAngles(i)
    const a = polar(C, C, RAYS.inner, mid)
    const b = polar(C, C, RAYS.outer, mid)
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }
  }
  return (
    <>
      <Bloom ids={ids} lit={lit}>
        {(i, filter) => <line {...ray(i)} stroke="var(--hour-bloom)" strokeWidth={RAYS.litWidth} strokeLinecap="round" filter={filter} />}
      </Bloom>
      <g className="clock-sections">
        {SECTIONS.map((i) => (
          <line
            key={i}
            className="clock-section"
            data-section={i}
            {...ray(i)}
            stroke="var(--slate)"
            strokeOpacity={RAYS.opacity}
            strokeWidth={RAYS.width}
            strokeLinecap="round"
          />
        ))}
      </g>
      <LitLayer lit={lit} className="clock-lit-layer">
        {(i) => <line {...ray(i)} stroke="var(--hour-fill)" strokeWidth={RAYS.litWidth} strokeLinecap="round" />}
      </LitLayer>
      <Ticks minute={null} hour={TICKS.hour} />
      <Numerals radius={NUMERALS.raysRadius} hour={hour} use24h={use24h} />
    </>
  )
}

function LanternFace({ lit, stops, ids, hour, use24h }: FaceProps) {
  const wedge = (i: number) => {
    const a = sectionAngles(i)
    return arcPath(C, C, LANTERN.rOuter, 0, a.start, a.end)
  }
  return (
    <>
      <Bloom ids={ids} lit={lit}>
        {(i, filter) => <path d={wedge(i)} fill="var(--hour-bloom)" filter={filter} />}
      </Bloom>
      <g className="clock-sections">
        {SECTIONS.map((i) => (
          <path key={i} className="clock-section" data-section={i} d={wedge(i)} style={{ fill: lanternTint(stops[i]) }} />
        ))}
      </g>
      <LitLayer lit={lit} className="clock-lit-layer">
        {(i) => <path className="clock-lit-wedge" d={wedge(i)} fill={`url(#${ids.lantern})`} />}
      </LitLayer>
      <Ticks minute={TICKS.minute} hour={TICKS.hour} />
      <Numerals radius={NUMERALS.radius} hour={hour} use24h={use24h} />
    </>
  )
}

function OrbitFace({ lit, ids }: FaceProps) {
  const dot = (i: number) => polar(C, C, ORBIT.radius, sectionAngles(i).mid)
  return (
    <>
      <Bloom ids={ids} lit={lit}>
        {(i, filter) => {
          const p = dot(i)
          return <circle cx={p.x} cy={p.y} r={ORBIT.litDot} fill="var(--hour-bloom)" filter={filter} />
        }}
      </Bloom>
      <circle className="clock-ring" cx={C} cy={C} r={ORBIT.radius} fill="none" stroke="var(--line-strong)" strokeWidth={ORBIT.ringWidth} />
      <g className="clock-sections">
        {SECTIONS.map((i) => {
          const p = dot(i)
          return <circle key={i} className="clock-section" data-section={i} cx={p.x} cy={p.y} r={ORBIT.dot} fill="var(--orbit-dot)" />
        })}
      </g>
      {/* The lit dot swells from the unlit size (r 5.5 → 9) as it fades in; the inner circle breathes. */}
      <LitLayer lit={lit} className="clock-lit-layer">
        {(i, isLit) => {
          const p = dot(i)
          return (
            <g className="orbit-swell" style={{ transform: `scale(${isLit ? 1 : ORBIT.dot / ORBIT.litDot})` }}>
              <circle className={isLit ? 'orbit-breathe' : undefined} cx={p.x} cy={p.y} r={ORBIT.litDot} fill="var(--hour-fill)" />
            </g>
          )
        }}
      </LitLayer>
      <Ticks minute={TICKS.minute} hour={TICKS.hour} />
    </>
  )
}

const FACES: Record<DialId, (props: FaceProps) => ReactNode> = {
  sector: SectorFace,
  hairline: HairlineFace,
  rays: RaysFace,
  lantern: LanternFace,
  orbit: OrbitFace,
}

function Hand({ className, deg, length, tail, width, stroke }: { className: string; deg: number; length: number; tail: number; width: number; stroke: string }) {
  return (
    <g className={`clock-hand ${className}`} style={{ transform: `rotate(${deg}deg)` }}>
      <line x1={C} y1={C + tail} x2={C} y2={C - length} stroke={stroke} strokeWidth={width} strokeLinecap="round" />
    </g>
  )
}

export function Clock({ now, dial, sky, secondHand, reduceMotion, use24h, preview = false, className }: ClockProps) {
  const id = useId()
  const ids: Ids = { near: `${id}-near`, far: `${id}-far`, lantern: `${id}-lantern` }
  const hour = now.getHours()
  const lit = sectionForHour(hour)
  const stops = lapStops(sky, hour)
  const sweep = secondHand === 'sweep' && !reduceMotion
  const angles = handAngles(now, sweep)
  const secondDeg = continuousSecondDeg(now, sweep)
  const Face = FACES[dial]
  const a11y = preview ? { 'aria-hidden': true as const } : { role: 'img', 'aria-label': `Clock showing ${formatTime(now, use24h)}` }

  return (
    <svg
      className={['clock', className].filter(Boolean).join(' ')}
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      {...a11y}
      data-dial={dial}
      data-second-hand={secondHand === 'hidden' ? 'hidden' : sweep ? 'sweep' : 'tick'}
      overflow="visible"
    >
      <defs>
        <filter id={ids.near} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={GLOW.near} />
        </filter>
        <filter id={ids.far} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation={GLOW.far} />
        </filter>
        <radialGradient id={ids.lantern} gradientUnits="userSpaceOnUse" cx={C} cy={C} r={LANTERN.rOuter}>
          <stop offset="0" stopColor="var(--hour-fill)" stopOpacity={0} />
          <stop offset="1" stopColor="var(--hour-fill)" stopOpacity={0.85} />
        </radialGradient>
      </defs>
      <Face lit={lit} stops={stops} ids={ids} hour={hour} use24h={use24h} preview={preview} />
      <g className="clock-hands">
        <Hand className="clock-hand-hour" deg={angles.hour} {...HANDS.hour} stroke="var(--ink)" />
        <Hand className="clock-hand-minute" deg={angles.minute} {...HANDS.minute} stroke="var(--ink)" />
        {secondHand !== 'hidden' && <Hand className="clock-hand-second" deg={secondDeg} {...HANDS.second} stroke="var(--hour-fill)" />}
        <circle className="clock-cap-ring" cx={C} cy={C} r={HANDS.cap.ring} fill="var(--hour-fill)" opacity={HANDS.cap.ringOpacity} />
        <circle className="clock-cap-paper" cx={C} cy={C} r={HANDS.cap.paper} fill="var(--paper)" />
        <circle className="clock-cap-ink" cx={C} cy={C} r={dial === 'lantern' ? HANDS.cap.lanternInk : HANDS.cap.ink} fill="var(--ink)" />
      </g>
    </svg>
  )
}
