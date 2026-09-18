import type { DialId } from '../lib/dials'
import { getSky } from '../lib/skies'
import { dayKey, formatTime } from '../lib/time'
import { StoreProvider, type StoreProviderProps } from '../state/StoreProvider'
import { useHourHue } from '../state/useHourHue'
import { useNow } from '../state/useNow'
import { useReducedMotion } from '../state/useReducedMotion'
import { useAppState } from '../state/useStore'
import { Clock } from './clock/Clock'
import { Header } from './Header'
import { HourWord } from './HourWord'
import { QuestLog } from './QuestLog'
import { Rail } from './Rail'
import { WeekRow } from './WeekRow'

function ClockHero() {
  const { settings, equipped } = useAppState()
  const reduceMotion = useReducedMotion(settings)
  const sweep = settings.secondHand === 'sweep' && !reduceMotion
  const now = useNow(settings.secondHand === 'hidden' ? 'minute' : sweep ? 'frame' : 'second')
  return (
    <div className="clock-wrap relative aspect-square">
      <div className="halo light-on" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <Clock
        now={now}
        dial={equipped.dial as DialId}
        sky={getSky(equipped.sky)}
        secondHand={settings.secondHand}
        reduceMotion={reduceMotion}
        use24h={settings.use24h}
      />
    </div>
  )
}

/** Visually hidden live region; announces the time once a minute. */
function TimeAnnouncer({ now, use24h }: { now: Date; use24h: boolean }) {
  return (
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {formatTime(now, use24h)}
    </p>
  )
}

function Shell() {
  const { settings, equipped, ui } = useAppState()
  const now = useNow('minute')
  const reduceMotion = useReducedMotion(settings)
  useHourHue(now, getSky(equipped.sky), settings, reduceMotion)
  const today = dayKey(now)

  return (
    <>
      <div className="page-bg" aria-hidden="true" />
      <div className="aurora light-on" aria-hidden="true">
        <i className="aurora-a" />
        <i className="aurora-b" />
        <i className="aurora-c" />
      </div>
      <div className="shell relative mx-auto min-h-dvh" data-panel={ui.panel}>
        <Header now={now} use24h={settings.use24h} />
        <main id="main" className="columns">
          <section className="hero relative" aria-label="Clock">
            <ClockHero />
            <HourWord now={now} />
          </section>
          <section className="log" aria-labelledby="log-title">
            <QuestLog today={today} />
            <WeekRow today={today} />
          </section>
        </main>
      </div>
      <Rail />
      <TimeAnnouncer now={now} use24h={settings.use24h} />
    </>
  )
}

export type AppProps = Pick<StoreProviderProps, 'initial' | 'persist'>

export function App(props: AppProps) {
  return (
    <StoreProvider {...props}>
      <Shell />
    </StoreProvider>
  )
}
