import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { formatTimer } from '../lib/timer'
import { TIME_UP, type Timer } from '../state/useTimer'
import { timerLabelName } from './timerVisuals'

/**
 * The "00:00" above the 12 (DESIGN.md §6, Timer). Press it to type a time (MM:SS or minutes);
 * pressing it while running pauses first. Paused and closed, the time pulses beside two small
 * lit bars; open, the field has priority and the cue hides.
 */
export function TimerLabel({ timer, reduceMotion }: { timer: Timer; reduceMotion: boolean }) {
  const [text, setText] = useState('')
  const [invalid, setInvalid] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  /** Enter or Escape closed the field: focus goes back to the label. A blur leaves focus be. */
  const refocus = useRef(false)
  const { phase, editing } = timer

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
    setText(phase === 'idle' || phase === 'done' ? '00:00' : formatTimer(timer.remainingMs))
    setInvalid(false)
    timer.openEdit()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (timer.submit(text)) refocus.current = true
      else setInvalid(true)
    } else if (e.key === 'Escape') {
      // Rail closes panels on a document Escape; this one only closes the field.
      e.stopPropagation()
      e.preventDefault()
      refocus.current = true
      timer.closeEdit()
    }
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
          value={text}
          maxLength={5}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
          aria-label="Timer, minutes and seconds"
          aria-invalid={invalid || undefined}
          onChange={(e) => {
            setText(e.target.value)
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
