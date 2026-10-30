import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { formatTimer, formatTimerDigits, timerDigits } from '../lib/timer'
import { TIME_UP, type Timer } from '../state/useTimer'
import { timerLabelName } from './timerVisuals'

/**
 * The "00:00" above the 12 (DESIGN.md §6, Timer). Press it to type a time: digits only, up
 * to four, the colon added as you type (`5` is 5:00, `530` is 5:30);
 * pressing it while running pauses first. Paused and closed, the time pulses beside two small
 * lit bars; open, the field has priority and the cue hides.
 */
export function TimerLabel({ timer, reduceMotion }: { timer: Timer; reduceMotion: boolean }) {
  /** The field holds digits only (at most four); the colon is display. */
  const [digits, setDigits] = useState('')
  const [invalid, setInvalid] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  /** Enter or Escape closed the field: focus goes back to the label. A blur leaves focus be. */
  const refocus = useRef(false)
  /** Set by typing, so the caret lands after the last digit once the colon reflows. */
  const caretToEnd = useRef(false)
  const { phase, editing } = timer

  useLayoutEffect(() => {
    const el = inputRef.current
    if (!caretToEnd.current || !el) return
    caretToEnd.current = false
    const end = el.value.length
    el.setSelectionRange(end, end)
  }, [digits])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    } else if (refocus.current) {
      refocus.current = false
      buttonRef.current?.focus()
    }
  }, [editing])

  const open = () => {
    // Prefilled in the same digit format: a paused 14:32 is 1432, idle is 0000.
    setDigits(timerDigits(phase === 'idle' || phase === 'done' ? '00:00' : formatTimer(timer.remainingMs)))
    setInvalid(false)
    timer.openEdit()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (timer.submit(digits)) refocus.current = true
      else setInvalid(true)
    } else if (e.key === 'Escape') {
      // Rail closes panels on a document Escape; this one only closes the field.
      e.stopPropagation()
      e.preventDefault()
      refocus.current = true
      timer.closeEdit()
    }
  }

  // Typed characters that are not digits never reach the field. Pasted, IME and mobile-keyboard
  // text is sanitized in onChange instead (the browser has already inserted it by then).
  const onBeforeInput = (e: FormEvent<HTMLInputElement>) => {
    const data = (e.nativeEvent as InputEvent).data
    if (typeof data === 'string' && data.length === 1 && !/\d/.test(data)) e.preventDefault()
  }

  const cue = phase === 'paused' && !editing
  const shown = phase === 'idle' || phase === 'done' ? '00:00' : formatTimer(timer.remainingMs)

  return (
    <div className="timer-label" data-phase={phase}>
      {editing ? (
        <input
          ref={inputRef}
          className="timer-input"
          type="text"
          inputMode="numeric"
          value={formatTimerDigits(digits)}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
          aria-label="Timer, minutes and seconds"
          aria-invalid={invalid || undefined}
          onBeforeInput={onBeforeInput}
          onChange={(e) => {
            // Strip everything but 0-9 and keep the first four digits, so a fifth is ignored.
            const next = timerDigits(e.target.value)
            caretToEnd.current = true
            setDigits(next)
            setInvalid(false)
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (timer.editing) timer.closeEdit()
          }}
        />
      ) : (
        <button ref={buttonRef} type="button" className="timer-button press" aria-label={timerLabelName(timer)} onClick={open}>
          <span className={cue && !reduceMotion ? 'timer-time timer-pulse' : 'timer-time'}>{shown}</span>
          {cue && (
            <span className="timer-cue" aria-hidden="true">
              <i />
              <i />
            </span>
          )}
        </button>
      )}
      {/* Always rendered so the announcement lands; empty except at time up. Never every second. */}
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {phase === 'done' ? TIME_UP : ''}
      </p>
    </div>
  )
}
