import { useSyncExternalStore } from 'react'

function canQuery(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
}

/** True when `query` matches; re-renders on change. False without matchMedia (jsdom, SSR). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (!canQuery()) return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => (canQuery() ? window.matchMedia(query).matches : false),
    () => false,
  )
}
