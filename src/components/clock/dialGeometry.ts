/**
 * Clock geometry in viewBox units (400 × 400, center 200). Values from DESIGN.md §6 and §8.
 * Every number the design director may tune lives here.
 */

/** Sector ring (default dial). gapDeg is per side (1.5° total between sections). */
export const RING = {
  rOuter: 186,
  rInner: 158,
  gapDeg: 0.75,
  bezel: 189.5,
  /** Outer white highlight: r 184, inset 1.5° from each wedge end. */
  edge: { r: 184, insetDeg: 1.5 },
  /** Inner lit edge: r 158.5, inset 1°, stroked --hour-fill at --wedge-edge. */
  innerEdge: { r: 158.5, insetDeg: 1 },
} as const

export const NUMERALS = { radius: 126, raysRadius: 104, fontSize: 15, opacity: 0.8 } as const

export const TICKS = {
  minute: { outer: 151, inner: 147, width: 1, opacity: 0.55 },
  hour: { outer: 152, inner: 143, width: 1.5 },
} as const

export const HANDS = {
  hour: { length: 92, tail: 14, width: 6 },
  /** Tip reaches the minute track (r 147–151) and crosses numerals instead of ending in one (M4). */
  minute: { length: 146, tail: 18, width: 4 },
  second: { length: 148, tail: 26, width: 1.5 },
  cap: { ring: 9.5, ringOpacity: 0.35, paper: 8, ink: 5.5, lanternInk: 7 },
} as const

export const HAIRLINE = {
  ring: 172,
  ringWidth: 1,
  litWidth: 3,
  litInsetDeg: 1,
  hourTick: { outer: 178, inner: 164, width: 1.5 },
  minuteTick: { outer: 176, inner: 172, width: 1, opacity: 0.5 },
} as const

export const RAYS = { inner: 124, outer: 184, width: 1.5, opacity: 0.55, litWidth: 3 } as const

export const LANTERN = { rOuter: 186 } as const

export const ORBIT = { radius: 172, dot: 5.5, litDot: 9, ringWidth: 1 } as const

/** Gaussian blur radii for the two bloom copies under the lit mark (opacities are tokens). */
export const GLOW = { near: 6, far: 16 } as const

/** Live preview of the equipped dial at the top of Collection → Dials (§8). */
export const PREVIEW = { size: 168 } as const

/**
 * 64px Collection art (§8): heavier strokes than the clock so each dial survives the scale.
 * Lit at hour 10; near bloom copy only.
 */
export const ART = {
  litHour: 10,
  sector: { rOuter: 186, rInner: 150, gapDeg: 1.5 },
  hairline: { ring: 172, ringWidth: 6, tick: { outer: 180, inner: 160, width: 9 }, litWidth: 18, glowWidth: 30, litInsetDeg: 1 },
  rays: { inner: 118, outer: 184, width: 9, opacity: 0.55, litWidth: 18, glowWidth: 40 },
  lantern: { rOuter: 186 },
  orbit: { radius: 172, ringWidth: 6, dot: 17.6, litDot: 28, glowDot: 34 },
} as const
