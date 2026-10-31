/**
 * Contrast model for the Accent clock display (DESIGN.md §6). It repeats in JS what
 * tokens.css computes in CSS (--hour-fill, --hour-accent, the unlit ring over the haloed
 * page), so a unit test can check every sky, hour and theme. Keep the two in step: a change
 * to the lit-fill or accent rule in tokens.css belongs here too.
 */
import { SKIES, hourHue, litHue, type Sky } from '../../lib/skies'

export type Theme = 'light' | 'dark'
type Rgb = [number, number, number]
type Oklch = { l: number; c: number; h: number }

/** The floors the accent hour must clear (WCAG non-text 3:1 against the ring; 1.5:1 against the fill). */
export const ACCENT_MIN_RING = 3
export const ACCENT_MIN_FILL = 1.5

export const PAGE = {
  light: { paper: '#f1f4f9', slate: '#56637a', ringTint: 0.12, haloAlpha: 0.7 },
  dark: { paper: '#0e1320', slate: '#a3aec2', ringTint: 0.11, haloAlpha: 0.62 },
} as const

// ---- colour maths (sRGB, OKLab, OKLCH) --------------------------------------

function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}
const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const toGamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)

function rgbToOklab([r, g, b]: Rgb): Rgb {
  const [R, G, B] = [toLinear(r), toLinear(g), toLinear(b)]
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

/** Linear sRGB, unclipped (may fall outside 0..1). */
function oklabToLinear([L, a, b]: Rgb): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

function mixOklab(a: Rgb, b: Rgb, t: number): Rgb {
  const A = rgbToOklab(a)
  const B = rgbToOklab(b)
  return linearToRgb(oklabToLinear([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]))
}

function linearToRgb(lin: Rgb): Rgb {
  return lin.map((v) => toGamma(Math.min(1, Math.max(0, v)))) as Rgb
}

export function toOklch(hex: string): Oklch {
  const [L, a, b] = rgbToOklab(hexToRgb(hex))
  const h = (Math.atan2(b, a) * 180) / Math.PI
  return { l: L, c: Math.hypot(a, b), h: (h + 360) % 360 }
}

function oklchToLinear({ l, c, h }: Oklch): Rgb {
  const r = (h * Math.PI) / 180
  return oklabToLinear([l, c * Math.cos(r), c * Math.sin(r)])
}
const inGamut = (lin: Rgb) => lin.every((v) => v >= -1e-6 && v <= 1 + 1e-6)

/**
 * The two ways a browser may show an out-of-gamut OKLCH colour on an sRGB screen: clip each
 * channel, or lower chroma at the same lightness and hue. The test requires both to pass.
 */
export function displayed(color: Oklch, method: 'clip' | 'chroma'): Rgb {
  if (method === 'clip' || inGamut(oklchToLinear(color))) return linearToRgb(oklchToLinear(color))
  let lo = 0
  let hi = color.c
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (inGamut(oklchToLinear({ ...color, c: mid }))) lo = mid
    else hi = mid
  }
  return linearToRgb(oklchToLinear({ ...color, c: lo }))
}

export function luminance([r, g, b]: Rgb): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Source-over: `top` at `alpha` on an opaque `bottom`, in gamma sRGB as browsers composite. */
function over(top: Rgb, alpha: number, bottom: Rgb): Rgb {
  return top.map((v, i) => v * alpha + bottom[i] * (1 - alpha)) as Rgb
}

// ---- the tokens --------------------------------------------------------------

const clamp = (lo: number, v: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** --hour-fill (tokens.css lit-fill rule), before any gamut mapping. */
export function hourFill(lit: string, theme: Theme): Oklch {
  const { l, c, h } = toOklch(lit)
  if (theme === 'dark') return { l: Math.max(l, 0.74), c, h }
  return { l: Math.min(l, 0.56), c: Math.max(c, 0.12), h: h - clamp(0, h - 80, 35) + clamp(0, h - 115, 35) }
}

/**
 * --hour-accent: --hour-fill turned 50deg back round the wheel (golds to coral, blues to
 * violet, indigos to blue), chroma kept at or above the fill's, and lightness moved away from
 * the passed fill. Light theme: darker, l - 0.15, kept within 0.2 to 0.42. Dark theme:
 * lighter, l + 0.2, capped at 0.99, so the current hour is the brightest thing on the ring.
 */
export function hourAccent(fill: Oklch, theme: Theme): Oklch {
  const c = Math.max(fill.c, 0.12)
  const h = (fill.h - 50 + 360) % 360
  if (theme === 'light') return { l: clamp(0.2, fill.l - 0.15, 0.42), c, h }
  return { l: Math.min(0.99, fill.l + 0.2), c, h }
}

/**
 * True when no usable accent lightness (at the accent's hue and chroma) clears both floors:
 * no passing window at least 0.02 wide, since a narrower one is inside the error of the halo
 * model. This happens only in the dark theme around midday: the dark lit-fill is pale there
 * (l 0.8 to 0.89) and the dark halo under the ring is bright, so nothing fits 3:1 above the
 * ring and 1.5:1 away from the fill on either side.
 */
export function accentInfeasible(sky: Sky, hour: number, theme: Theme): boolean {
  let run = 0
  for (let l = 0.2; l <= 0.995; l += 0.005) {
    const r = accentContrastWith(sky, hour, theme, (fill) => ({ ...hourAccent(fill, theme), l }))
    run = r.ring >= ACCENT_MIN_RING && r.fill >= ACCENT_MIN_FILL ? run + 1 : 0
    if (run > 4) return false
  }
  return true
}

/**
 * How strong the halo is under the lit ring section, as a share of its peak. The halo
 * (surfaces.css) is 160% of the clock box with its centre 16% of that box toward the lit
 * section, i.e. 0.26 clock widths out; the ring sits about 0.43 out, so about 0.19 from the
 * centre of a gradient whose farthest-corner radius is about 1.3: 15% along it, between the
 * 0% (x1) and 18% (x.62) stops.
 */
export const HALO_AT_RING = 0.68

/** The page behind the ring: bare paper, and paper under the halo at the ring (--hour-glow at --halo-alpha). */
function pages(hour: string, theme: Theme): Rgb[] {
  const p = PAGE[theme]
  const paper = hexToRgb(p.paper)
  const white: Rgb = [1, 1, 1]
  const hue = hexToRgb(hour)
  // Light: color-mix(hour 26%, white). Dark: color-mix(hour 70%, white 6%), which sums to 76%, so alpha .76.
  const glow = theme === 'light' ? mixOklab(white, hue, 0.26) : mixOklab(white, hue, 70 / 76)
  const glowAlpha = (theme === 'light' ? 1 : 0.76) * p.haloAlpha * HALO_AT_RING
  return [paper, over(glow, glowAlpha, paper)]
}

/** The unlit Sector ring (tint.ts ringTint): the stop 55% into slate, at --ring-tint over the page. */
function unlitRings(stop: string, hour: string, theme: Theme): Rgb[] {
  const p = PAGE[theme]
  const tint = mixOklab(hexToRgb(p.slate), hexToRgb(stop), 0.55)
  return pages(hour, theme).map((page) => over(tint, p.ringTint, page))
}

export type AccentCase = { sky: string; hour: number; theme: Theme; ring: number; fill: number }

/**
 * Worst-case contrast of the accent hour against the unlit ring and against the passed fill
 * for one sky, hour and theme, over both pages (bare and haloed) and both gamut mappings.
 */
export function accentContrast(sky: Sky, hour: number, theme: Theme): AccentCase {
  return accentContrastWith(sky, hour, theme, (fill) => hourAccent(fill, theme))
}

export function accentContrastWith(sky: Sky, hour: number, theme: Theme, rule: (fill: Oklch) => Oklch): AccentCase {
  const fill = hourFill(litHue(sky, hour), theme)
  const accent = rule(fill)
  let ring = Infinity
  let passed = Infinity
  for (const method of ['clip', 'chroma'] as const) {
    const a = displayed(accent, method)
    passed = Math.min(passed, contrast(a, displayed(fill, method)))
    for (const r of unlitRings(sky.hours[hour], hourHue(sky, hour), theme)) ring = Math.min(ring, contrast(a, r))
  }
  return { sky: sky.id, hour, theme, ring, fill: passed }
}

/** All 24 hours x every sky x light and dark. */
export function allAccentCases(): AccentCase[] {
  return SKIES.flatMap((sky) =>
    (['light', 'dark'] as const).flatMap((theme) => Array.from({ length: 24 }, (_, hour) => accentContrast(sky, hour, theme))),
  )
}
