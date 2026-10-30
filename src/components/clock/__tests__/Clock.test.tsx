import { StrictMode } from 'react'
import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DIALS, type DialId } from '../../../lib/dials'
import { getSky } from '../../../lib/skies'
import { Clock, HOUR_FLASH_MS } from '../Clock'
import { DialArt } from '../DialArt'
import { currentFill, currentFillPct, hourProgress, markState } from '../fill'

const props = { sky: getSky('daylight'), secondHand: 'sweep' as const, reduceMotion: false, use24h: false }
const at = (h: number, m = 0, s = 0) => new Date(2026, 8, 17, h, m, s)

function litMarks(container: HTMLElement, layer: string) {
  return Array.from(container.querySelectorAll(`.${layer} > .clock-lit`))
}
const visible = (marks: Element[]) => marks.filter((m) => m.getAttribute('opacity') === '1')
const visibleIndexes = (container: HTMLElement) =>
  litMarks(container, 'clock-lit-layer').flatMap((m, i) => (m.getAttribute('opacity') === '1' ? [i] : []))
const flashing = (container: HTMLElement) => container.querySelectorAll('.hour-flash')

afterEach(() => {
  vi.useRealTimers()
})

describe('Clock fills hour by hour (every dial)', () => {
  for (const { id } of DIALS) {
    it(`${id}: passed and current marks lit, one glow, and the next hour joins them`, () => {
      const { container, rerender } = render(<Clock {...props} dial={id} now={at(10, 59, 59)} />)
      const marks = litMarks(container, 'clock-lit-layer')
      expect(marks).toHaveLength(12)
      expect(visible(marks)).toHaveLength(11) // lit + 1
      expect(marks.map((m) => m.getAttribute('data-state'))).toEqual([...Array(10).fill('passed'), 'current', 'future'])
      const glow = litMarks(container, 'clock-glow')
      expect(glow).toHaveLength(12)
      expect(visible(glow)).toHaveLength(1)
      expect(glow[10]).toHaveAttribute('opacity', '1')

      rerender(<Clock {...props} dial={id} now={at(11)} />)
      const after = litMarks(container, 'clock-lit-layer')
      // Same elements, so the opacity transition runs instead of a remount cut.
      expect(after[10]).toBe(marks[10])
      expect(after[10]).toHaveAttribute('opacity', '1')
      expect(after[10]).toHaveAttribute('data-state', 'passed')
      expect(after[11]).toHaveAttribute('opacity', '1')
      expect(after[11]).toHaveAttribute('data-state', 'current')
      expect(visible(litMarks(container, 'clock-glow'))).toHaveLength(1)
    })
  }

  it('loads already filled to the current hour, never from 12', () => {
    const { container } = render(<Clock {...props} dial="lantern" now={at(15, 40)} />)
    expect(visibleIndexes(container)).toEqual([0, 1, 2, 3])
  })

  it('clears at 12:00 pm', () => {
    const { container, rerender } = render(<Clock {...props} dial="sector" now={at(11, 59, 59)} />)
    expect(visibleIndexes(container)).toHaveLength(12)
    rerender(<Clock {...props} dial="sector" now={at(12)} />)
    expect(visibleIndexes(container)).toEqual([0])
  })

  it('clears at midnight', () => {
    const { container, rerender } = render(<Clock {...props} dial="rays" now={at(23, 59, 59)} />)
    expect(visibleIndexes(container)).toHaveLength(12)
    rerender(<Clock {...props} dial="rays" now={new Date(2026, 8, 18, 0, 0, 0)} />)
    expect(visibleIndexes(container)).toEqual([0])
  })

  it('orbit swells passed and current dots, breathes only the current one', () => {
    const { container, rerender } = render(<Clock {...props} dial="orbit" now={at(10, 30)} />)
    const swell = () => Array.from(container.querySelectorAll<SVGGElement>('.orbit-swell'))
    expect(swell()[3].style.transform).toBe('scale(1)')
    expect(swell()[10].style.transform).toBe('scale(1)')
    expect(swell()[11].style.transform).toMatch(/^scale\(0\.61/) // r 5.5 / 9
    expect(container.querySelectorAll('.clock-lit-layer .orbit-breathe')).toHaveLength(1)
    rerender(<Clock {...props} dial="orbit" now={at(11)} />)
    expect(swell()[11].style.transform).toBe('scale(1)')
    expect(swell()[11].querySelector('circle')).toHaveClass('orbit-breathe')
    expect(swell()[10].querySelector('circle')).not.toHaveClass('orbit-breathe')
  })

  it('passed marks share --hour-fill; the current one uses the blend', () => {
    const { container } = render(<Clock {...props} dial="rays" now={at(10, 30)} />)
    const strokes = litMarks(container, 'clock-lit-layer').map((m) => (m.querySelector('line') as SVGElement).style.stroke)
    expect(strokes[0]).toBe('var(--hour-fill)')
    expect(strokes[9]).toBe('var(--hour-fill)')
    expect(strokes[10]).toContain('var(--hour-fill)')
    expect(strokes[10]).not.toBe('var(--hour-fill)')
  })

  it('lantern gives the current wedge its own gradient', () => {
    const { container } = render(<Clock {...props} dial="lantern" now={at(3, 10)} />)
    const fills = litMarks(container, 'clock-lit-layer').map((m) => m.querySelector('path')!.getAttribute('fill'))
    expect(fills[0]).toMatch(/-lantern\)$/)
    expect(fills[3]).toMatch(/-lantern-now\)$/)
  })
})

describe('current-hour colour', () => {
  it('blends from 55% at :00 to 100% at the end of the hour', () => {
    expect(hourProgress(at(9, 0, 0))).toBe(0)
    expect(currentFillPct(hourProgress(at(9, 0, 0)))).toBe(55)
    expect(currentFillPct(hourProgress(at(9, 30, 0)))).toBe(78)
    expect(currentFillPct(hourProgress(at(9, 59, 0)))).toBe(99)
    expect(currentFillPct(hourProgress(at(9, 59, 59)))).toBe(100)
    expect(currentFill(0)).toBe('color-mix(in oklab, var(--hour-fill) 55%, white)')
    expect(currentFill(0.5)).toBe('color-mix(in oklab, var(--hour-fill) 78%, white)')
  })
  it('classifies marks', () => {
    expect([markState(2, 3), markState(3, 3), markState(4, 3)]).toEqual(['passed', 'current', 'future'])
  })
})

describe('new-hour flash', () => {
  const clock = (now: Date, extra: { reduceMotion?: boolean; dial?: DialId } = {}) => (
    <StrictMode>
      <Clock {...props} dial={extra.dial ?? 'sector'} reduceMotion={extra.reduceMotion ?? false} now={now} />
    </StrictMode>
  )

  it('does not flash on mount, even under StrictMode', () => {
    const { container, rerender } = render(clock(at(10, 59, 58)))
    expect(flashing(container)).toHaveLength(0)
    rerender(clock(at(10, 59, 59)))
    expect(flashing(container)).toHaveLength(0)
  })

  it('does not flash on a dial change', () => {
    const { container, rerender } = render(clock(at(10, 20)))
    rerender(clock(at(10, 20), { dial: 'orbit' }))
    expect(flashing(container)).toHaveLength(0)
  })

  it('flashes the new current mark when the hour turns, then stops', () => {
    vi.useFakeTimers()
    const { container, rerender } = render(clock(at(10, 59, 59)))
    rerender(clock(at(11)))
    const flash = flashing(container)
    expect(flash).toHaveLength(1)
    expect(flash[0].closest('.clock-lit')).toHaveAttribute('data-state', 'current')
    expect(flash[0].closest('.clock-lit-layer')).not.toBeNull()
    act(() => vi.advanceTimersByTime(HOUR_FLASH_MS + 200))
    expect(flashing(container)).toHaveLength(0)
  })

  it('stops on animationend', () => {
    const { container, rerender } = render(clock(at(10, 59, 59)))
    rerender(clock(at(11)))
    fireEvent.animationEnd(flashing(container)[0], { animationName: 'hour-flash' })
    expect(flashing(container)).toHaveLength(0)
  })

  it('never flashes with reduced motion', () => {
    const { container, rerender } = render(clock(at(10, 59, 59), { reduceMotion: true }))
    rerender(clock(at(11), { reduceMotion: true }))
    expect(flashing(container)).toHaveLength(0)
  })
})

describe('Collection art is filled to hour 10', () => {
  it('lantern: ten passed wedges and one current', () => {
    const { container } = render(<DialArt dial="lantern" sky={getSky('daylight')} />)
    const fills = Array.from(container.querySelectorAll('path')).map((p) => p.getAttribute('fill') ?? '')
    expect(fills.filter((f) => /-lantern\)$/.test(f))).toHaveLength(10)
    expect(fills.filter((f) => /-lantern-now\)$/.test(f))).toHaveLength(1)
  })
  for (const dial of ['sector', 'hairline', 'rays', 'orbit'] as const) {
    it(`${dial}: ten marks in --hour-fill and one blended`, () => {
      const { container } = render(<DialArt dial={dial} sky={getSky('daylight')} />)
      const colours = Array.from(container.querySelectorAll<SVGElement>('path, line, circle')).map((el) => el.style.fill || el.style.stroke)
      expect(colours.filter((c) => c === 'var(--hour-fill)')).toHaveLength(10)
      expect(colours.filter((c) => c === currentFill(0.5))).toHaveLength(1)
    })
  }
})
