/// <reference types="node" />
// Node fs, not a ?raw import: vitest's css: false empties CSS modules, raw ones included.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getSky } from '../../../lib/skies'
import { ACCENT_MIN_FILL, ACCENT_MIN_RING, PAGE, accentInfeasible, allAccentCases, contrast, displayed, toOklch } from '../contrast'

const cases = allAccentCases()
const key = (c: { sky: string; hour: number; theme: string }) => `${c.theme} ${c.sky} ${c.hour}`

/**
 * Dark theme around midday: no lightness clears both floors (see accentInfeasible). Listed so
 * the set can never grow silently; each one is proven infeasible below, and the rule still
 * puts the accent above the passed fill there.
 */
const INFEASIBLE = new Set([
  ...[12, 13, 14].map((h) => `dark daylight ${h}`),
  ...[11, 12, 13].map((h) => `dark ember ${h}`),
  ...[11, 12, 13, 14].map((h) => `dark tide ${h}`),
  ...[12, 13, 14].map((h) => `dark graphite ${h}`),
])

describe('Accent hour contrast (24 hours x 4 skies x light and dark)', () => {
  it('covers all 192 combinations', () => {
    expect(cases).toHaveLength(192)
  })

  it(`clears ${ACCENT_MIN_RING}:1 against the unlit ring and ${ACCENT_MIN_FILL}:1 against the passed fill`, () => {
    const failing = cases
      .filter((c) => !INFEASIBLE.has(key(c)))
      .filter((c) => c.ring < ACCENT_MIN_RING || c.fill < ACCENT_MIN_FILL)
      .map((c) => `${key(c)}: ring ${c.ring.toFixed(2)}, fill ${c.fill.toFixed(2)}`)
    expect(failing).toEqual([])
  })

  it('the exceptions are exactly these, and no usable lightness could satisfy any of them', () => {
    const failing = cases.filter((c) => c.ring < ACCENT_MIN_RING || c.fill < ACCENT_MIN_FILL)
    expect(new Set(failing.map(key))).toEqual(INFEASIBLE)
    expect(failing.filter((c) => !accentInfeasible(getSky(c.sky), c.hour, c.theme)).map(key)).toEqual([])
    // Where it cannot reach both floors it still sits clearly away from the passed fill.
    expect(failing.every((c) => c.fill >= 1.2)).toBe(true)
  })

  it('every light-theme combination passes, Graphite included (it borrows the Daylight lit colour)', () => {
    const light = cases.filter((c) => c.theme === 'light')
    expect(light.every((c) => c.ring >= ACCENT_MIN_RING && c.fill >= ACCENT_MIN_FILL)).toBe(true)
    const graphite = cases.filter((c) => c.sky === 'graphite')
    expect(graphite.every((c) => c.fill > 1.2)).toBe(true) // coloured, never on top of the fill
  })
})

describe('contrast maths', () => {
  it('matches known WCAG ratios', () => {
    const black = displayed(toOklch('#000000'), 'clip')
    const white = displayed(toOklch('#ffffff'), 'clip')
    expect(contrast(black, white)).toBeCloseTo(21, 1)
    expect(contrast(displayed(toOklch('#777777'), 'clip'), white)).toBeCloseTo(4.48, 1)
  })
})

describe('the model matches tokens.css', () => {
  const css = readFileSync('src/styles/tokens.css', 'utf8') // vitest runs from the repo root
  const squash = (s: string) => s.replace(/\s+/g, ' ')
  const flat = squash(css)
  it('uses the same lit-fill and accent rules', () => {
    // contrast.ts hourFill / hourAccent mirror these exactly; change both together.
    expect(flat).toContain('--hour-fill: oklch(from var(--hour-lit, var(--hour)) min(l, 0.56) max(c, 0.12) calc(h - clamp(0, h - 80, 35) + clamp(0, h - 115, 35)));')
    expect(flat).toContain('--hour-fill: oklch(from var(--hour-lit, var(--hour)) max(l, 0.74) c h);')
    expect(flat).toContain('--hour-accent: oklch(from var(--hour-fill) clamp(0.2, calc(l - 0.15), 0.42) max(c, 0.12) calc(h - 50));')
    expect(flat.match(/--hour-accent: oklch\(from var\(--hour-fill\) min\(0\.99, calc\(l \+ 0\.2\)\) max\(c, 0\.12\) calc\(h - 50\)\);/g)).toHaveLength(2) // dark and Auto
  })
  it('uses the same page, slate, ring tint and halo strength', () => {
    for (const theme of ['light', 'dark'] as const) {
      const p = PAGE[theme]
      expect(flat).toContain(`--paper: ${p.paper};`)
      expect(flat).toContain(`--slate: ${p.slate};`)
      expect(flat).toContain(`--ring-tint: ${Math.round(p.ringTint * 100)}%;`)
      expect(flat).toContain(`--halo-alpha: ${p.haloAlpha};`)
    }
  })
})
