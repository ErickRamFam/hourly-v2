import { formatLongDate, formatTime } from '../lib/time'

export function Header({ now, use24h }: { now: Date; use24h: boolean }) {
  return (
    <header className="top flex h-14 items-center justify-between border-b border-line">
      <span className="wordmark font-serif text-[22px] leading-none tracking-[-0.01em] text-ink">Hourly</span>
      <span className="flex items-baseline gap-5">
        <span className="date text-small font-medium text-slate">{formatLongDate(now)}</span>
        <time className="time text-numeral font-medium tracking-[0.01em] tabular-nums text-ink" dateTime={now.toISOString()}>
          {formatTime(now, use24h)}
        </time>
      </span>
    </header>
  )
}
