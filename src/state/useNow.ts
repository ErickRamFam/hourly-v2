import { useEffect, useState } from 'react'
import { devTimeOffset } from '../lib/devTime'
import { msUntilNextMinute, msUntilNextSecond } from '../lib/time'

export type NowMode = 'second' | 'frame' | 'minute'

/**
 * The current time as a Date, re-rendering on a schedule:
 * - 'second': aligned to the wall-clock second boundary (setTimeout to the next boundary,
 *   then setInterval every 1000ms), so ticks land on :00 ms rather than drifting.
 * - 'minute': the same, aligned to the minute boundary.
 * - 'frame': requestAnimationFrame, for a sweeping second hand.
 * All modes pause while document.hidden and re-align when the tab becomes visible.
 * In dev builds `?at=HH:MM` shifts the clock (see lib/devTime).
 */
export function useNow(mode: NowMode = 'second'): Date {
  const [offset] = useState(() => devTimeOffset())
  const [now, setNow] = useState(() => new Date(Date.now() + offset))

  useEffect(() => {
    const read = () => new Date(Date.now() + offset)
    let timeout: ReturnType<typeof setTimeout> | null = null
    let interval: ReturnType<typeof setInterval> | null = null
    let frame: number | null = null
    let stopped = false

    const stop = () => {
      if (timeout !== null) clearTimeout(timeout)
      if (interval !== null) clearInterval(interval)
      if (frame !== null) cancelAnimationFrame(frame)
      timeout = null
      interval = null
      frame = null
    }

    const start = () => {
      stop()
      if (stopped || document.hidden) return
      setNow(read())
      if (mode === 'frame') {
        const loop = () => {
          setNow(read())
          frame = requestAnimationFrame(loop)
        }
        frame = requestAnimationFrame(loop)
        return
      }
      const period = mode === 'minute' ? 60_000 : 1000
      const wait = mode === 'minute' ? msUntilNextMinute(read()) : msUntilNextSecond(read())
      timeout = setTimeout(() => {
        timeout = null
        setNow(read())
        interval = setInterval(() => setNow(read()), period)
      }, wait)
    }

    const onVisibility = () => {
      if (document.hidden) stop()
      else start()
    }

    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stopped = true
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [mode, offset])

  return now
}
