import { useMediaQuery } from './useMediaQuery'
import type { Settings } from './types'

/** True when motion should be reduced: the system asks for it, or the user forced it on. */
export function useReducedMotion(settings: Pick<Settings, 'reduceMotion'>): boolean {
  const system = useMediaQuery('(prefers-reduced-motion: reduce)')
  return settings.reduceMotion === 'on' || system
}
