import { createContext, useContext } from 'react'
import type { Timer } from './useTimer'

export const TimerContext = createContext<Timer | null>(null)

/** The one timer (TimerProvider), or null outside it (isolated component tests). */
export function useTimerContext(): Timer | null {
  return useContext(TimerContext)
}
