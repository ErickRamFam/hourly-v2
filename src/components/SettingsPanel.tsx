import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { rovingIndex } from '../lib/roving'
import { formatHourStop } from '../lib/time'
import type { ReduceMotion, SecondHandMode, Settings, ThemeOverride } from '../state/types'
import { useAppState, useDispatch } from '../state/useStore'
import { ConfirmDialog } from './ConfirmDialog'

/**
 * Plain-text choices; the selected one is ink with a lit underline (DESIGN.md §8).
 * A radiogroup is one tab stop: only the checked option is tabbable, arrows move the
 * selection and focus together (roving tabindex), Home/End jump to the ends.
 */
function Choice<T extends string>({ label, value, options, onChange }: {
  label: string
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
    <div className="seg flex gap-[18px]" role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
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

function Row({ label, labelId, children }: { label: string; labelId?: string; children: React.ReactNode }) {
  return (
    <li className="srow flex min-h-14 items-center justify-between gap-4 border-t border-line py-2">
      <span id={labelId} className="text-body text-ink">
        {label}
      </span>
      {children}
    </li>
  )
}

export function SettingsPanel() {
  const { settings } = useAppState()
  const dispatch = useDispatch()
  const [confirming, setConfirming] = useState(false)
  const dayId = useId()
  const nightId = useId()
  const set = (patch: Partial<Settings>) => dispatch({ type: 'updateSettings', patch })

  return (
    <div className="settings flex flex-1 flex-col">
      <ul className="srows m-0 mt-2 list-none p-0">
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
      </ul>

      <div className="danger mt-7 border-t border-line pt-4">
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
          body="Quests, lumens, and your collection will be removed from this browser."
          confirmLabel="Clear everything"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            dispatch({ type: 'clearAll' })
            setConfirming(false)
          }}
        />
      )}
    </div>
  )
}
