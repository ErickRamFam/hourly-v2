import { useEffect, useRef, useState } from 'react'
import { createBeeper, type Beeper } from '../lib/beep'
import type { StorageLike } from '../lib/storage'
import {
  defaultTimerStorage,
  formatTimer,
  loadTimer,
  parseTimerInput,
  pauseTimer,
  remainingMs,
  resumeTimer,
  saveTimer,
  startTimer,
  type TimerStored,
} from '../lib/timer'

export type TimerPhase = 'idle' | 'running' | 'paused' | 'done'

/** How long the time-up ring shows: three fades over 2.4s, or a brief static ring with reduced motion. */
export const DONE_MS = 2400
export const DONE_REDUCED_MS = 1000
export const TIME_UP = 'Time is up'
/** At time up, a beep further than this ahead on the audio clock is stale and dropped. */
const FINISH_GRACE_S = 1

export type TimerOptions = {
  /** Length the P key starts with no timer (Settings → Default timer). */
  defaultMs: number
  reduceMotion: boolean
  /** Injected in tests. */
  storage?: StorageLike | null
  beeper?: Beeper
}

export type Timer = {
  phase: TimerPhase
  remainingMs: number
  /** True while the inline field is open. */
  editing: boolean
  /** Label click: opens the field, freezing a running countdown where it is. */
  openEdit(): void
  /**
   * Escape or blur, no new time: closes the field and restores what the timer was doing when it
   * opened (a frozen running timer resumes from the frozen time; a paused one stays paused; idle
   * input is discarded).
   */
  closeEdit(): void
  /** Enter. True when the input was accepted (the field closes); false keeps it open as invalid. */
  submit(text: string): boolean
  /** P / MediaPlayPause. */
  toggle(): void
  /** The pause button: pauses at the current remaining time and cancels the beep. */
  pause(): void
  /** The play button: resumes, from the user gesture so the beep can be booked. */
  resume(): void
  /** Clear all data: cancels sound, timeouts and the notification, clears the key, restores the title. */
  reset(): void
}

type NotificationCtor = typeof Notification | undefined

/** Inputs, textareas, selects and contenteditable: where P is a letter, not a shortcut. */
function isTextControl(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true
  // isContentEditable is missing in some environments (jsdom); the attribute check covers them.
  return el.isContentEditable === true || el.closest('[contenteditable=""], [contenteditable="true"]') !== null
}

function notificationApi(): NotificationCtor {
  return typeof Notification === 'undefined' ? undefined : Notification
}

/**
 * The countdown. Call exactly once (TimerProvider), so there is one interval, one key
 * listener and one booked beep. Separate from the clock: it never touches `now` or AppState.
 */
export function useTimer({ defaultMs, reduceMotion, storage = defaultTimerStorage(), beeper: injected }: TimerOptions): Timer {
  const [beeper] = useState(() => injected ?? createBeeper())
  const [timer, setTimer] = useState<TimerStored | null>(() => loadTimer(storage, Date.now()))
  const [now, setNow] = useState(() => Date.now())
  const [editing, setEditing] = useState(false)
  const [done, setDone] = useState(false)
  /**
   * True while the field is open on a timer that was running when it opened: it is frozen (stored
   * as paused, beep cancelled) and resumes when the field closes without a new time.
   */
  const [frozen, setFrozenState] = useState(false)
  const frozenRef = useRef(false)
  const timerRef = useRef(timer)
  const editingRef = useRef(editing)
  const storageRef = useRef(storage)
  const notification = useRef<Notification | null>(null)
  const asked = useRef(false)
  const defaultRef = useRef(defaultMs)
  const finishRef = useRef<() => void>(() => {})

  useEffect(() => {
    storageRef.current = storage
  })

  const commit = (next: TimerStored | null) => {
    timerRef.current = next
    setTimer(next)
    setNow(Date.now())
    saveTimer(storageRef.current, next)
  }
  const setEdit = (on: boolean) => {
    editingRef.current = on
    setEditing(on)
  }
  const setFrozen = (on: boolean) => {
    frozenRef.current = on
    setFrozenState(on)
  }

  /** Inside the gesture that first starts a timer: ask once whether we may notify. */
  const askToNotify = () => {
    if (asked.current) return
    asked.current = true
    const api = notificationApi()
    if (!api || api.permission !== 'default' || typeof api.requestPermission !== 'function') return
    try {
      void Promise.resolve(api.requestPermission()).catch(() => {})
    } catch {
      // older callback-only implementations; ignore
    }
  }

  const closeNotification = () => {
    try {
      notification.current?.close()
    } catch {
      // ignore
    }
    notification.current = null
  }

  /**
   * Time is up and the user is away: a system notification. Background timers can be
   * throttled to about once a minute, so this (unlike the beep) can be late.
   */
  const notify = () => {
    const api = notificationApi()
    if (!api || api.permission !== 'granted') return
    const away = document.hidden || (typeof document.hasFocus === 'function' && !document.hasFocus())
    if (!away) return
    try {
      notification.current = new api(TIME_UP)
    } catch {
      // Android Chrome throws on the constructor (it wants a service worker); ignore.
    }
  }

  // The beep was booked on the audio clock at start, so finishing never plays a sound. It does
  // drop a beep the audio clock is still far from (slept or suspended), so it cannot sound later.
  const finish = () => {
    beeper.cancelPending(FINISH_GRACE_S)
    commit(null)
    setFrozen(false)
    setEdit(false)
    setDone(true)
    notify()
  }

  useEffect(() => {
    finishRef.current = finish
  })

  const start = (ms: number) => {
    beeper.prepare()
    askToNotify()
    closeNotification()
    setDone(false)
    commit(startTimer(ms, Date.now()))
    beeper.schedule(ms)
  }
  const pause = () => {
    const t = timerRef.current
    if (!t || t.status !== 'running') return
    beeper.cancel()
    commit(pauseTimer(t, Date.now()))
  }
  const resume = () => {
    const t = timerRef.current
    if (!t || t.status !== 'paused') return
    beeper.prepare()
    const next = resumeTimer(t, Date.now())
    commit(next)
    beeper.schedule(t.remainingMs)
  }

  const api: Timer = {
    phase: timer ? timer.status : done ? 'done' : 'idle',
    remainingMs: remainingMs(timer, now),
    editing,
    openEdit() {
      if (editingRef.current) return
      // Remember what to restore on a close without a new time, then freeze: no beep, no ticking.
      setFrozen(timerRef.current?.status === 'running')
      pause()
      setDone(false)
      setEdit(true)
    },
    closeEdit() {
      if (!editingRef.current) return
      const wasRunning = frozenRef.current
      setFrozen(false)
      setEdit(false)
      // From the exact frozen remaining time; the beep is booked again from this gesture.
      if (wasRunning) resume()
    },
    submit(text) {
      const parsed = parseTimerInput(text)
      if (parsed.kind === 'time') {
        // A new time always runs, whether it was running or paused before.
        setFrozen(false)
        start(parsed.ms)
        setEdit(false)
        return true
      }
      if (parsed.kind === 'zero' && timerRef.current?.status === 'paused') {
        // Cancel an active (frozen or paused) timer: back to idle, no beep.
        setFrozen(false)
        beeper.cancel()
        commit(null)
        setEdit(false)
        return true
      }
      return false
    },
    toggle() {
      const t = timerRef.current
      if (editingRef.current) {
        setFrozen(false)
        setEdit(false)
      }
      if (!t) start(defaultRef.current)
      else if (t.status === 'running') pause()
      else resume()
    },
    pause() {
      pause()
    },
    resume() {
      resume()
    },
    reset() {
      beeper.cancel()
      closeNotification()
      setFrozen(false)
      setEdit(false)
      setDone(false)
      commit(null)
    },
  }
  const apiRef = useRef(api)
  useEffect(() => {
    defaultRef.current = defaultMs
    apiRef.current = api
  })

  // Tick: wake at each whole-second boundary of the remaining time (always read from endsAt,
  // so a late wake never drifts) and finish at 0:00. One timeout chain per running timer.
  const running = timer?.status === 'running'
  useEffect(() => {
    if (!running) return
    let id: ReturnType<typeof setTimeout> | null = null
    const arm = () => {
      const left = remainingMs(timerRef.current, Date.now())
      // A timeout that fires a little early just lands on the same second and re-arms.
      id = setTimeout(check, left <= 0 ? 0 : left % 1000 || 1000)
    }
    const check = () => {
      id = null
      const t = Date.now()
      if (remainingMs(timerRef.current, t) <= 0) {
        finishRef.current()
        return
      }
      setNow(t)
      arm()
    }
    arm()
    // Back from the background: resync the label at once (timeouts were throttled meanwhile).
    const onVisible = () => {
      if (document.hidden) return
      if (id !== null) clearTimeout(id)
      check()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      if (id !== null) clearTimeout(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [running, timer])

  // The time-up ring, then idle.
  useEffect(() => {
    if (!done) return
    const id = setTimeout(() => setDone(false), reduceMotion ? DONE_REDUCED_MS : DONE_MS)
    return () => clearTimeout(id)
  }, [done, reduceMotion])

  // After a reload the timer runs but no AudioContext exists (it needs a gesture): book the
  // beep on the first gesture. A touch pointerdown is not a user activation (only a mouse one
  // is), so pointerup and touchend are listened for too; schedule() replaces, so repeats are safe.
  useEffect(() => {
    if (!running) return
    const onGesture = () => {
      const t = timerRef.current
      if (!t || t.status !== 'running' || (beeper.scheduled && beeper.ready)) return
      if (!beeper.prepare()) return
      beeper.schedule(remainingMs(t, Date.now()))
    }
    const events = ['pointerdown', 'pointerup', 'touchend', 'keydown'] as const
    for (const e of events) window.addEventListener(e, onGesture, true)
    return () => {
      for (const e of events) window.removeEventListener(e, onGesture, true)
    }
  }, [running, beeper])

  // P (any case) and MediaPlayPause toggle pause and resume, start the Default timer when idle,
  // and resume and close an open field. P is a plain key, so it works in every browser; it is
  // ignored while typing in a text control, with Ctrl, Cmd or Alt held (Cmd+P / Ctrl+P still
  // print) and while the Clear all data dialog is open. MediaPlayPause is best effort: browsers
  // often never see media keys because the OS or another player takes them.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isP = e.key.length === 1 && e.key.toLowerCase() === 'p'
      if (!isP && e.key !== 'MediaPlayPause') return
      if (isP && (e.ctrlKey || e.metaKey || e.altKey || isTextControl(e.target) || isTextControl(document.activeElement))) return
      if (isP && document.querySelector('[data-modal]')) return
      if (e.repeat) return
      e.preventDefault()
      apiRef.current.toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Tab title: the countdown while running (held still at the frozen time while the field is
  // open on it), the original title otherwise. Background tabs may throttle these updates to
  // about once a minute.
  const originalTitle = useRef<string | null>(null)
  const label = running || (frozen && editing) ? formatTimer(remainingMs(timer, now)) : null
  useEffect(() => {
    if (originalTitle.current === null) originalTitle.current = document.title
    const base = originalTitle.current
    document.title = label ? `${label} · ${base}` : base
  }, [label])
  useEffect(
    () => () => {
      if (originalTitle.current !== null) document.title = originalTitle.current
      originalTitle.current = null
    },
    [],
  )

  // Unmount: nothing booked may outlive the hook (the stored timer stays for the next load).
  useEffect(
    () => () => {
      beeper.cancel()
    },
    [beeper],
  )

  return api
}
