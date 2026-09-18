/**
 * Dev-only clock override for screenshots and review: `?at=HH:MM` pins the app to that
 * local time today. Seconds still advance from :00 so the hands move.
 */
export type AtOverride = { hour: number; minute: number }

export function parseAt(search: string): AtOverride | null {
  let raw: string | null
  try {
    raw = new URLSearchParams(search).get('at')
  } catch {
    return null
  }
  if (!raw) return null
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw.trim())
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return null
  return { hour, minute }
}

/**
 * Milliseconds to add to the real clock so that "now" reads `at` (today, :00 seconds) at
 * the moment of the call. The real clock's sub-second phase is kept so second-boundary
 * ticks stay aligned.
 */
export function overrideOffsetMs(at: AtOverride, realNow: number): number {
  const base = new Date(realNow)
  const target = new Date(base.getFullYear(), base.getMonth(), base.getDate(), at.hour, at.minute, 0, 0)
  return target.getTime() - Math.floor(realNow / 1000) * 1000
}

/** Offset for the current page, or 0 outside dev builds / without `?at=`. */
export function devTimeOffset(): number {
  if (!import.meta.env.DEV) return 0
  if (typeof location === 'undefined') return 0
  const at = parseAt(location.search)
  return at ? overrideOffsetMs(at, Date.now()) : 0
}
