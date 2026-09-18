export const DEFAULT_ROLLOVER_HOUR = 4

/**
 * Local calendar date of `date`, shifted back by `rolloverHour` hours, as "YYYY-MM-DD".
 * With the default rollover of 4, 03:59 still belongs to the previous day.
 */
export function dayKey(date: Date, rolloverHour: number = DEFAULT_ROLLOVER_HOUR): string {
  const shifted = new Date(date.getTime() - rolloverHour * 3_600_000)
  return formatDayKey(shifted.getFullYear(), shifted.getMonth(), shifted.getDate())
}

function formatDayKey(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Parses a "YYYY-MM-DD" key into a local Date at noon (safe from DST edges). */
export function parseDayKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!match) return null
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Moves a day key forward/backward by whole calendar days (DST-safe). */
export function shiftDayKey(key: string, days: number): string {
  const base = parseDayKey(key) ?? new Date()
  const moved = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days, 12)
  return formatDayKey(moved.getFullYear(), moved.getMonth(), moved.getDate())
}

/**
 * True when the local hour is inside [dayStart, nightStart). If the boundaries are
 * inverted (night begins before day begins) the daytime window wraps past midnight.
 * Equal boundaries mean "never daytime".
 */
export function isDaytime(date: Date, dayStart: number, nightStart: number): boolean {
  const h = date.getHours()
  if (dayStart === nightStart) return false
  if (dayStart < nightStart) return h >= dayStart && h < nightStart
  return h >= dayStart || h < nightStart
}

/** "7:42 pm" or "19:42". */
export function formatTime(date: Date, use24h: boolean): string {
  const h = date.getHours()
  const m = String(date.getMinutes()).padStart(2, '0')
  if (use24h) return `${String(h).padStart(2, '0')}:${m}`
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m} ${h < 12 ? 'am' : 'pm'}`
}

/** "4:00 am" / "04:00" for a whole hour 0–23. */
export function formatHourLabel(hour: number, use24h: boolean): string {
  return formatTime(new Date(2000, 0, 1, hour, 0), use24h)
}

/**
 * A whole-hour stop for the settings steppers, following the clock-label setting:
 * "7 pm" / "6 am" / "12 pm" (noon) / "12 am" (midnight) in 12h, "19:00" / "6:00" in 24h.
 */
export function formatHourStop(hour: number, use24h = true): string {
  const h = ((Math.floor(hour) % 24) + 24) % 24
  if (use24h) return `${h}:00`
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12} ${h < 12 ? 'am' : 'pm'}`
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** "Wednesday, 17 September". Locale-independent so tests and copy stay stable. */
export function formatLongDate(date: Date): string {
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`
}

/** "Wed 17 Sep", for narrow headers. */
export function formatShortDate(date: Date): string {
  return `${WEEKDAYS[date.getDay()].slice(0, 3)} ${date.getDate()} ${MONTHS[date.getMonth()].slice(0, 3)}`
}

/** Single-letter weekday for the seven-day row. */
export function weekdayInitial(date: Date): string {
  return WEEKDAYS[date.getDay()][0]
}

/**
 * Hour words and personality lines, one per hour of the day (index = hour 0–23).
 * Copy from DESIGN.md §9; keep both lists here so they are easy to swap.
 */
export const HOUR_WORDS: readonly string[] = [
  'Midnight',
  'Deep night',
  'The small hours',
  'Still night',
  'Before dawn',
  'First light',
  'Dawn',
  'Sunrise',
  'Early morning',
  'Morning',
  'Late morning',
  'Almost noon',
  'Noon',
  'Early afternoon',
  'Afternoon',
  'Mid afternoon',
  'Late afternoon',
  'Golden hour',
  'Sunset',
  'Evening',
  'Dusk',
  'Night',
  'Late night',
  'Nearly midnight',
]

export const HOUR_LINES: readonly string[] = [
  'The day has changed its mind about being over.',
  'Nothing here needs you until morning.',
  'Quiet enough to hear the second hand.',
  'Whatever it is can wait for light.',
  'The log resets now. Yesterday is filed.',
  'The sky is thinking about it.',
  'The first color of the day is a soft one.',
  'Coffee first, then the log.',
  'A good hour for the hardest quest.',
  'The day is fully awake now, and so are you.',
  'The best light of the day for getting things done.',
  'One more thing before lunch.',
  'The clock strikes gold.',
  'A slow hour, on purpose.',
  'Half the day is still yours.',
  'A good moment for a short walk.',
  'The light is starting to lean.',
  'Everything looks better in this one.',
  'Finish what is small, leave what is large.',
  'The day is winding down, and the light with it.',
  'Lamps on, screens dimmer.',
  "Whatever is left can be tomorrow's.",
  'The log will still be here in the morning.',
  'Last light of the day. Rest.',
]

function wrapHour(hour: number): number {
  return ((Math.floor(hour) % 24) + 24) % 24
}

export function hourWord(hour: number): string {
  return HOUR_WORDS[wrapHour(hour)]
}

export function hourLine(hour: number): string {
  return HOUR_LINES[wrapHour(hour)]
}

export function msUntilNextSecond(date: Date): number {
  return 1000 - date.getMilliseconds()
}

export function msUntilNextMinute(date: Date): number {
  return 60_000 - (date.getSeconds() * 1000 + date.getMilliseconds())
}
