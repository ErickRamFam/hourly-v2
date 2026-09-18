import { hourLine, hourWord } from '../lib/time'

export function HourWord({ now }: { now: Date }) {
  const hour = now.getHours()
  return (
    <div key={hour} className="words word-in">
      <h1 id="hour-word" className="hourword m-0 font-serif text-hourword font-normal text-ink">
        {hourWord(hour)}
      </h1>
      <p className="personality mt-3 font-serif text-personality text-slate">{hourLine(hour)}</p>
    </div>
  )
}
