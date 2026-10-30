import type { ReactNode } from 'react'
import { TimerContext } from './timerContext'
import { useReducedMotion } from './useReducedMotion'
import { useAppState } from './useStore'
import { useTimer } from './useTimer'

/** Default length for F8 with no timer, until Settings → Default timer lands. */
const DEFAULT_TIMER_MS = 30 * 60 * 1000

/** Owns the single useTimer call, inside StoreProvider, so there is one interval and one beep. */
export function TimerProvider({ children }: { children: ReactNode }) {
  const { settings } = useAppState()
  const reduceMotion = useReducedMotion(settings)
  const timer = useTimer({ defaultMs: DEFAULT_TIMER_MS, reduceMotion })
  return <TimerContext.Provider value={timer}>{children}</TimerContext.Provider>
}
