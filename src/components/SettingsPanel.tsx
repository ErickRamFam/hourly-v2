import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { rovingIndex } from '../lib/roving'
import { MAX_TIMER_SEC, MIN_TIMER_SEC } from '../lib/storage'
import { formatHourStop } from '../lib/time'
import { useTimerContext } from '../state/timerContext'
import type { ClockFill, ReduceMotion, SecondHandMode, Settings, ThemeOverride } from '../state/types'
import { useAppState, useDispatch } from '../state/useStore'
import { ConfirmDialog } from './ConfirmDialog'

/**
 * Plain-text choices; the selected one is ink with a lit underline (DESIGN.md §8).
 * A radiogroup is one tab stop: only the checked option is tabbable, arrows move the
 * selection and focus together (roving tabindex), Home/End jump to the ends.
 */
function Choice<T extends string>({ label, value, options, onChange, describedBy }: {
  label: string
  /** Id of the row's helper line, read out with the group. */
  describedBy?: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const current = Math.max(0, options.findIndex((o) => o.value === value))
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const next = rovingIndex(e.key, current, options.length)
    if (next === null) return
    e.preventDefault()
    onChange(options[next].value)
    refs.current[next]?.focus()
  }
  return (
    <div className="seg flex flex-wrap gap-x-[18px] gap-y-1" role="radiogroup" aria-label={label} aria-describedby={describedBy} onKeyDown={onKeyDown}>
      {options.map((o, i) => {
        const on = i === current
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            className={`seg-opt pt-1 pb-2 text-[15px] leading-none font-medium ${on ? 'lit-underline text-ink' : 'text-slate'}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function Stepper({ labelId, value, use24h, onChange }: { labelId: string; value: number; use24h: boolean; onChange: (hour: number) => void }) {
  const step = (delta: number) => onChange((value + delta + 24) % 24)
  return (
    <div className="step flex h-9 items-center rounded-control shadow-[inset_0_0_0_1px_var(--line-strong)]" role="group" aria-labelledby={labelId}>
      <button type="button" className="press hover-wash h-9 w-8 rounded-l-control text-[18px] leading-none text-slate" aria-label="Earlier" onClick={() => step(-1)}>
        −
      </button>
      <span className="min-w-14 text-center text-[15px] font-medium tracking-[0.01em] tabular-nums text-ink" aria-live="polite">
        {formatHourStop(value, use24h)}
      </span>
      <button type="button" className="press hover-wash h-9 w-8 rounded-r-control text-[18px] leading-none text-slate" aria-label="Later" onClick={() => step(1)}>
        +
      </button>
    </div>
  )
}

/**
 * Same box as Stepper, but clamped instead of wrapping: one minute per press, 1:00 to 60:00.
 * At a limit the button stays enabled and does nothing (disabled would drop focus).
 */
function MinuteStepper({ labelId, value, onChange }: { labelId: string; value: number; onChange: (sec: number) => void }) {
  const step = (delta: number) => {
    const next = Math.min(MAX_TIMER_SEC, Math.max(MIN_TIMER_SEC, value + delta * 60))
    if (next !== value) onChange(next)
  }
  return (
    <div className="step flex h-9 items-center rounded-control shadow-[inset_0_0_0_1px_var(--line-strong)]" role="group" aria-labelledby={labelId}>
      <button type="button" className="press hover-wash h-9 w-8 rounded-l-control text-[18px] leading-none text-slate" aria-label="Shorter" onClick={() => step(-1)}>
        −
      </button>
      <span className="min-w-14 text-center text-[15px] font-medium tracking-[0.01em] tabular-nums text-ink" aria-live="polite">
        {`${Math.round(value / 60)}:00`}
      </span>
      <button type="button" className="press hover-wash h-9 w-8 rounded-r-control text-[18px] leading-none text-slate" aria-label="Longer" onClick={() => step(1)}>
        +
      </button>
    </div>
  )
}

/**
 * A settings row. It wraps: a control too wide to sit beside its label drops under it (the
 * four Clock display options at 360px), and `helper` is one small line under the row.
 */
function Row({ label, labelId, helper, helperId, children }: { label: string; labelId?: string; helper?: string; helperId?: string; children: React.ReactNode }) {
  return (
    <li className="srow flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-line py-2">
      <span id={labelId} className="text-body text-ink">
        {label}
      </span>
      {children}
      {helper && (
        <p id={helperId} className="srow-helper m-0 basis-full pb-1 text-small text-slate">
          {helper}
        </p>
      )}
    </li>
  )
}

/**
 * A titled set of rows (DESIGN.md §8): the same serif group title as Collection's "Dials" and
 * "Skies", so the panel reads Appearance, Clock, General, then Clear all data. Groups are
 * separated by space alone; the hairlines stay between rows, so a group reads as one block.
 */
function Group({ title, first = false, children }: { title: string; first?: boolean; children: React.ReactNode }) {
  const id = useId()
  return (
    <section className="sgroup" aria-labelledby={id}>
      <h3
        id={id}
        className={`group-title mb-0.5 font-serif text-group font-normal text-ink ${first ? 'mt-5' : 'mt-8'}`}
      >
        {title}
      </h3>
      <ul className="srows m-0 list-none p-0">{children}</ul>
    </section>
  )
}

const CLOCK_FILL_OPTIONS: readonly { value: ClockFill; label: string; helper: string }[] = [
  { value: 'blend', label: 'Blend', helper: 'Each hour fills in, and the current hour fades into the fill.' },
  { value: 'hour', label: 'Hour only', helper: 'Only the current hour is lit.' },
  { value: 'solid', label: 'Solid', helper: 'Each hour fills in as one solid color.' },
  { value: 'accent', label: 'Accent', helper: 'The current hour stands out in its own color.' },
]

export function SettingsPanel() {
  const { settings } = useAppState()
  const dispatch = useDispatch()
  const timer = useTimerContext()
  const [confirming, setConfirming] = useState(false)
  const dayId = useId()
  const nightId = useId()
  const timerId = useId()
  const fillHelpId = useId()
  const lumensHelpId = useId()
  const set = (patch: Partial<Settings>) => dispatch({ type: 'updateSettings', patch })

  return (
    <div className="settings flex flex-1 flex-col">
      <Group title="Appearance" first>
          <Row label="Theme">
            <Choice<ThemeOverride>
              label="Theme"
              value={settings.themeOverride}
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
              onChange={(themeOverride) => set({ themeOverride })}
            />
          </Row>
          <Row label="Day begins" labelId={dayId}>
            <Stepper labelId={dayId} value={settings.dayStart} use24h={settings.use24h} onChange={(dayStart) => set({ dayStart })} />
          </Row>
          <Row label="Night begins" labelId={nightId}>
            <Stepper labelId={nightId} value={settings.nightStart} use24h={settings.use24h} onChange={(nightStart) => set({ nightStart })} />
          </Row>
      </Group>
      <Group title="Clock">
          <Row label="Clock display" helper={CLOCK_FILL_OPTIONS.find((o) => o.value === settings.clockFill)?.helper} helperId={fillHelpId}>
            <Choice<ClockFill>
              label="Clock display"
              value={settings.clockFill}
              options={CLOCK_FILL_OPTIONS}
              describedBy={fillHelpId}
              onChange={(clockFill) => set({ clockFill })}
            />
          </Row>
          <Row label="Second hand">
            <Choice<SecondHandMode>
              label="Second hand"
              value={settings.secondHand}
              options={[
                { value: 'sweep', label: 'Sweep' },
                { value: 'tick', label: 'Tick' },
                { value: 'hidden', label: 'Hidden' },
              ]}
              onChange={(secondHand) => set({ secondHand })}
            />
          </Row>
          <Row label="Clock labels">
            <Choice<'12h' | '24h'>
              label="Clock labels"
              value={settings.use24h ? '24h' : '12h'}
              options={[
                { value: '12h', label: '12h' },
                { value: '24h', label: '24h' },
              ]}
              onChange={(v) => set({ use24h: v === '24h' })}
            />
          </Row>
          <Row label="Default timer" labelId={timerId}>
            <MinuteStepper labelId={timerId} value={settings.defaultTimerSec} onChange={(defaultTimerSec) => set({ defaultTimerSec })} />
          </Row>
      </Group>
      <Group title="General">
          <Row label="Reduce motion">
            <Choice<ReduceMotion>
              label="Reduce motion"
              value={settings.reduceMotion}
              options={[
                { value: 'system', label: 'Off' },
                { value: 'on', label: 'On' },
              ]}
              onChange={(reduceMotion) => set({ reduceMotion })}
            />
          </Row>
          <Row label="Lumens" helper={settings.lumensEnabled ? undefined : 'Everything in your collection is unlocked.'} helperId={lumensHelpId}>
            <Choice<'on' | 'off'>
              label="Lumens"
              describedBy={settings.lumensEnabled ? undefined : lumensHelpId}
              value={settings.lumensEnabled ? 'on' : 'off'}
              options={[
                { value: 'on', label: 'On' },
                { value: 'off', label: 'Off' },
              ]}
              onChange={(v) => set({ lumensEnabled: v === 'on' })}
            />
          </Row>
      </Group>

      <div className="danger mt-8 border-t border-line pt-4">
        <button type="button" className="press text-[15px] font-medium text-pewter" onClick={() => setConfirming(true)}>
          Clear all data
        </button>
      </div>
      <div className="mt-auto pt-6">
        <span className="font-serif text-[15px] leading-[1.4] italic text-slate">Every hour gets its own color.</span>
      </div>

      {confirming && (
        <ConfirmDialog
          title="Clear all data?"
          body={
            settings.lumensEnabled
              ? 'Quests, lumens, and your collection will be removed from this browser.'
              : 'Quests and your collection will be removed from this browser.'
          }
          confirmLabel="Clear everything"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            dispatch({ type: 'clearAll' })
            // The timer is not in AppState: stop its sound, notification and title, and clear its key.
            timer?.reset()
            setConfirming(false)
          }}
        />
      )}
    </div>
  )
}
