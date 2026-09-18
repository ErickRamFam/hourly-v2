import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DIALS } from '../../../lib/dials'
import { getSky } from '../../../lib/skies'
import { Clock } from '../Clock'

const props = { sky: getSky('daylight'), secondHand: 'sweep' as const, reduceMotion: false, use24h: false }

function litMarks(container: HTMLElement, layer: string) {
  return Array.from(container.querySelectorAll(`.${layer} > .clock-lit`))
}

describe('Clock lit-mark handoff (every dial crossfades)', () => {
  for (const { id } of DIALS) {
    it(`${id}: renders all 12 lit marks and blooms, exactly one visible, and moves it at the hour`, () => {
      const { container, rerender } = render(<Clock {...props} dial={id} now={new Date(2026, 8, 17, 10, 59, 59)} />)
      for (const layer of ['clock-lit-layer', 'clock-glow']) {
        const marks = litMarks(container, layer)
        expect(marks).toHaveLength(12)
        expect(marks.filter((m) => m.getAttribute('opacity') === '1')).toHaveLength(1)
        expect(marks[10]).toHaveAttribute('opacity', '1')
      }
      rerender(<Clock {...props} dial={id} now={new Date(2026, 8, 17, 11, 0, 0)} />)
      const marks = litMarks(container, 'clock-lit-layer')
      // Same elements, so the opacity transition runs instead of a remount cut.
      expect(marks[10]).toHaveAttribute('opacity', '0')
      expect(marks[11]).toHaveAttribute('opacity', '1')
    })
  }

  it('orbit swells the new dot from the unlit size', () => {
    const { container, rerender } = render(<Clock {...props} dial="orbit" now={new Date(2026, 8, 17, 10, 30)} />)
    const swell = () => Array.from(container.querySelectorAll<SVGGElement>('.orbit-swell'))
    expect(swell()[10].style.transform).toBe('scale(1)')
    expect(swell()[11].style.transform).toMatch(/^scale\(0\.61/) // r 5.5 / 9
    rerender(<Clock {...props} dial="orbit" now={new Date(2026, 8, 17, 11, 0)} />)
    expect(swell()[11].style.transform).toBe('scale(1)')
    expect(swell()[11].querySelector('circle')).toHaveClass('orbit-breathe')
  })
})
