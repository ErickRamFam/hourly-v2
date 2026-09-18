import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNow, type NowMode } from '../useNow'

function Probe({ mode }: { mode: NowMode }) {
  const now = useNow(mode)
  return <output data-testid="ms">{now.getTime()}</output>
}

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 17, 12, 0, 0, 250))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("'second' waits for the wall-clock boundary, then ticks every second", () => {
    render(<Probe mode="second" />)
    const start = new Date(2026, 8, 17, 12, 0, 0, 250).getTime()
    expect(screen.getByTestId('ms')).toHaveTextContent(String(start))

    act(() => vi.advanceTimersByTime(749))
    expect(screen.getByTestId('ms')).toHaveTextContent(String(start))

    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByTestId('ms')).toHaveTextContent(String(start + 750))

    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByTestId('ms')).toHaveTextContent(String(start + 1750))
  })

  it("'minute' aligns to the minute boundary", () => {
    render(<Probe mode="minute" />)
    const start = new Date(2026, 8, 17, 12, 0, 0, 250).getTime()
    act(() => vi.advanceTimersByTime(59_749))
    expect(screen.getByTestId('ms')).toHaveTextContent(String(start))
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByTestId('ms')).toHaveTextContent(String(start + 59_750))
  })

  it('pauses while the document is hidden and re-aligns when visible', () => {
    render(<Probe mode="second" />)
    const start = new Date(2026, 8, 17, 12, 0, 0, 250).getTime()
    act(() => vi.advanceTimersByTime(750))
    expect(screen.getByTestId('ms')).toHaveTextContent(String(start + 750))

    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByTestId('ms')).toHaveTextContent(String(start + 750))

    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(screen.getByTestId('ms')).toHaveTextContent(String(start + 5750))
  })
})
