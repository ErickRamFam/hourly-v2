import type { ReactNode } from 'react'
import { TimerContext } from './timerContext'
import { useReducedMotion } from './useReducedMotion'
import { useAppState } from './useStore'
import { useTimer } from './useTimer'

/** Owns the single useTimer call, inside StoreProvider, so there is one interval and one beep. */
export function TimerProvider({ children }: { children: ReactNode }) {
  const { settings } = useAppState()
  const reduceMotion = useReducedMotion(settings)
  const timer = useTimer({ defaultMs: settings.defaultTimerSec * 1000, reduceMotion })
  return <TimerContext.Provider value={timer}>{children}</TimerContext.Provider>
}
