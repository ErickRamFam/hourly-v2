import { dayProgress } from '../lib/quests'
import { formatLongDate, parseDayKey, shiftDayKey, weekdayInitial } from '../lib/time'
import { useAppState } from '../state/useStore'
import { discOpacity } from './visuals'

const R = 8

export function WeekRow({ today }: { today: string }) {
  const { quests, completions } = useAppState()
  const days = Array.from({ length: 7 }, (_, i) => shiftDayKey(today, i - 6))

  return (
    <ol className="week m-0 mt-7 flex list-none gap-5 p-0" aria-label="Last seven days">
      {days.map((day) => {
        const { done, total } = dayProgress(quests, completions, day)
        const opacity = discOpacity(done, total)
        const date = parseDayKey(day)
        const isToday = day === today
        const label = `${date ? formatLongDate(date) : day}: ${total === 0 ? 'no quests' : `${done} of ${total} cleared`}`
        return (
          <li key={day} className="day flex w-6 flex-col items-center gap-1.5" data-today={isToday || undefined} data-share={opacity.toFixed(2)}>
            <svg className="block size-6 overflow-visible" viewBox="0 0 24 24" role="img" aria-label={label}>
              {isToday && <circle cx={12} cy={12} r={10.5} fill="none" stroke="var(--hour-soft)" strokeWidth={1} />}
              {opacity > 0 && <circle className="week-disc" cx={12} cy={12} r={R} style={{ fill: 'var(--hour-fill)', fillOpacity: opacity }} />}
              <circle cx={12} cy={12} r={R} fill="none" stroke="var(--line-strong)" strokeWidth={1.5} />
            </svg>
            <span className="text-small font-medium leading-none text-pewter" aria-hidden="true">
              {date ? weekdayInitial(date) : ''}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
