import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react'
import { formatTimer, formatTimerDigits, timerDigits } from '../lib/timer'
import { TIME_UP, type Timer } from '../state/useTimer'
import { timerLabelName } from './timerVisuals'

/**
 * The "00:00" above the 12 (DESIGN.md §6, Timer). Press it to type a time: digits only, up
 * to four, the colon added as you type (`5` is 5:00, `530` is 5:30);
 * a running countdown freezes while the field is open and picks up again if it closes without
 * a new time. Beside the time, one toggle slot: a pause button while running, a play button
 * (and a soft pulse on the time) while paused, nothing idle or while the field is open.
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
  /** The field was opened with a pointer (mouse, touch, pen), not the keyboard. */
  const openedByPointer = useRef(false)
  /**
   * Focus came back to the label at the end of a pointer-started edit. Enter is a key press, so
   * the browser would treat that focus as keyboard focus and draw the indicator; this keeps it
   * quiet until the user actually uses the keyboard to move (Tab) or focus leaves.
   */
  const [quiet, setQuiet] = useState(false)
  /**
   * Focus is inside the label. Set on focus, cleared when focus leaves for somewhere else. A
   * focused control that is removed (the pause button at time up, the field closed by
   * MediaPlayPause) fires no blur, so focus would drop to <body>; the effect below catches that
   * and puts it on the time.
   */
  const hasFocus = useRef(false)
  const { phase, editing } = timer

  useEffect(() => {
    if (!quiet) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Tab') setQuiet(false)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [quiet])

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
      if (openedByPointer.current) setQuiet(true)
      buttonRef.current?.focus()
    }
  }, [editing])

  const open = (e: MouseEvent<HTMLButtonElement>) => {
    // detail is the click count: 0 when Enter or Space pressed the button.
    openedByPointer.current = e.detail > 0
    setQuiet(false)
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

  useEffect(() => {
    if (hasFocus.current && (document.activeElement === document.body || document.activeElement === null)) buttonRef.current?.focus()
  })

  const cue = phase === 'paused' && !editing
  /** The toggle slot: shown only while counting down or paused, and never over an open field. */
  const slot = !editing && (phase === 'running' || phase === 'paused')
  const shown = phase === 'idle' || phase === 'done' ? '00:00' : formatTimer(timer.remainingMs)

  return (
    <div
      className="timer-label"
      data-phase={phase}
      onFocus={() => {
        hasFocus.current = true
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) hasFocus.current = false
      }}
    >
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
        <>
          <button
            ref={buttonRef}
            type="button"
            className="timer-button press"
            data-quiet-focus={quiet || undefined}
            onBlur={() => setQuiet(false)}
            aria-label={timerLabelName(timer)}
            aria-keyshortcuts="P"
            onClick={open}
          >
            <span className={cue && !reduceMotion ? 'timer-time timer-pulse' : 'timer-time'}>{shown}</span>
          </button>
          {/* One button that swaps pause and play, so focus stays on it across a toggle. Its own Tab
              stop right after the time; does what P does and never opens the field. */}
          {slot && (
            <button
              type="button"
              className="timer-play press"
              aria-label={phase === 'running' ? 'Pause timer' : 'Resume timer'}
              data-action={phase === 'running' ? 'pause' : 'play'}
              onClick={() => (phase === 'running' ? timer.pause() : timer.resume())}
            >
              <svg viewBox="0 0 8 10" width={8} height={10} aria-hidden="true">
                {phase === 'running' ? (
                  <path d="M0.75 0.75 H2.85 V9.25 H0.75 Z M5.15 0.75 H7.25 V9.25 H5.15 Z" />
                ) : (
                  <path d="M0.75 0.9 L7.4 5 L0.75 9.1 Z" />
                )}
              </svg>
            </button>
          )}
        </>
      )}
      {/* Always rendered so the announcement lands; empty except at time up. Never every second. */}
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {phase === 'done' ? TIME_UP : ''}
      </p>
    </div>
  )
}
