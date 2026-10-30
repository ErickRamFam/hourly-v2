import { StrictMode, useEffect } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { StorageLike } from '../../lib/storage'
import { TIMER_KEY, saveTimer, startTimer } from '../../lib/timer'
import { FakeAudioContext, FakeNotification, allBeeps, liveBeeps } from '../../test/fakes'
import { DONE_MS, DONE_REDUCED_MS, useTimer, type Timer } from '../../state/useTimer'
import { TimerBar } from '../TimerBar'
import { TimerLabel } from '../TimerLabel'

const T0 = new Date(2026, 9, 29, 10, 0, 0).getTime()

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) }
}

let api: Timer
function Harness({ storage, reduceMotion = false, defaultMs = 60_000 }: { storage: StorageLike; reduceMotion?: boolean; defaultMs?: number }) {
  const timer = useTimer({ defaultMs, reduceMotion, storage })
  useEffect(() => {
    api = timer
  })
  return (
    <div className="clock-wrap">
      <TimerBar timer={timer} reduceMotion={reduceMotion} />
      <TimerLabel timer={timer} reduceMotion={reduceMotion} />
    </div>
  )
}

let storage: ReturnType<typeof memoryStorage>
function setup(opts: { reduceMotion?: boolean; strict?: boolean; defaultMs?: number } = {}) {
  const ui = <Harness storage={storage} reduceMotion={opts.reduceMotion} defaultMs={opts.defaultMs} />
  return render(opts.strict ? <StrictMode>{ui}</StrictMode> : ui)
}

const label = () => screen.getByRole('button', { name: /^Timer/ })
const field = () => screen.getByRole<HTMLInputElement>('textbox', { name: 'Timer, minutes and seconds' })
const bar = () => document.querySelector('.timer-bar')
const status = () => document.querySelector('.timer-label [role="status"]')!
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms))
const press = (key: string, init: KeyboardEventInit = {}) => {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  act(() => {
    window.dispatchEvent(e)
  })
  return e
}

function type(text: string) {
  fireEvent.change(field(), { target: { value: text } })
  fireEvent.keyDown(field(), { key: 'Enter' })
}
function startWith(text: string) {
  fireEvent.click(label())
  type(text)
}

beforeEach(() => {
  vi.useFakeTimers({ now: T0 })
  storage = memoryStorage()
  document.title = 'Hourly'
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('timer label and field', () => {
  it('idle: 00:00, the field opens with it selected, 0 is an error and clicking away discards', () => {
    setup()
    expect(label()).toHaveAccessibleName('Timer, 00:00. Press to set a time')
    expect(label()).toHaveTextContent('00:00')
    expect(bar()).toBeNull()
    fireEvent.click(label())
    expect(field()).toHaveFocus()
    expect(field()).toHaveValue('00:00')
    expect([field().selectionStart, field().selectionEnd]).toEqual([0, 5])
    type('00:00')
    expect(field()).toHaveAttribute('aria-invalid', 'true')
    fireEvent.change(field(), { target: { value: '0' } })
    expect(field()).not.toHaveAttribute('aria-invalid')
    fireEvent.keyDown(field(), { key: 'Enter' })
    expect(field()).toHaveAttribute('aria-invalid', 'true')
    type('5:75')
    expect(field()).toHaveAttribute('aria-invalid', 'true')
    fireEvent.blur(field())
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(api.phase).toBe('idle')
    expect(storage.data.has(TIMER_KEY)).toBe(false)
  })

  it('Enter starts the countdown, which updates each second from endsAt', () => {
    setup()
    startWith(' 5 ')
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(label()).toHaveFocus()
    expect(label()).toHaveAccessibleName('Timer, 05:00 left. Press to pause and edit')
    expect(JSON.parse(storage.data.get(TIMER_KEY)!)).toEqual({ status: 'running', endsAt: T0 + 300_000, totalMs: 300_000 })
    expect(bar()).toHaveAttribute('data-sweep', '30')
    advance(1000)
    expect(label()).toHaveTextContent('04:59')
    advance(59_000)
    expect(label()).toHaveTextContent('04:00')
    expect(bar()).toHaveAttribute('data-sweep', '24')
  })

  it('pressing while running pauses and opens the field; Escape keeps it paused and stays in the field', () => {
    setup()
    startWith('10')
    advance(3000)
    const onDocKey = vi.fn()
    document.addEventListener('keydown', onDocKey)
    fireEvent.click(label())
    expect(api.phase).toBe('paused')
    expect(field()).toHaveValue('09:57')
    expect(document.querySelector('.timer-cue')).toBeNull() // the field has priority
    fireEvent.keyDown(field(), { key: 'Escape' })
    expect(onDocKey).not.toHaveBeenCalled()
    document.removeEventListener('keydown', onDocKey)
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(label()).toHaveAccessibleName('Timer paused, 09:57 left. Press to edit')
    advance(5000)
    expect(label()).toHaveTextContent('09:57')
    expect(JSON.parse(storage.data.get(TIMER_KEY)!)).toMatchObject({ status: 'paused', remainingMs: 597_000 })
  })

  it('paused cue: pulse and two bars only while paused with the field closed', () => {
    setup()
    expect(document.querySelector('.timer-cue')).toBeNull()
    startWith('10')
    expect(document.querySelector('.timer-cue')).toBeNull()
    expect(document.querySelector('.timer-pulse')).toBeNull()
    fireEvent.click(label())
    fireEvent.blur(field())
    expect(api.phase).toBe('paused')
    expect(document.querySelectorAll('.timer-cue i')).toHaveLength(2)
    expect(document.querySelector('.timer-pulse')).not.toBeNull()
    fireEvent.click(label())
    expect(document.querySelector('.timer-cue')).toBeNull()
  })

  it('clicking away from a paused field keeps the original remaining time', () => {
    setup()
    startWith('10')
    fireEvent.click(label())
    fireEvent.change(field(), { target: { value: '3' } })
    fireEvent.blur(field())
    expect(api.phase).toBe('paused')
    expect(label()).toHaveTextContent('10:00')
  })

  it('a new time on a paused timer resumes from it and redraws the bar', () => {
    setup()
    startWith('10')
    fireEvent.click(label())
    type('2:00')
    expect(api.phase).toBe('running')
    expect(label()).toHaveTextContent('02:00')
    expect(bar()).toHaveAttribute('data-sweep', '12')
    expect(liveBeeps()).toHaveLength(1)
    expect(liveBeeps()[0].startAt).toBe(120)
  })

  it('0 on a paused timer cancels it with no beep', () => {
    setup()
    startWith('10')
    fireEvent.click(label())
    type('0')
    expect(api.phase).toBe('idle')
    expect(label()).toHaveTextContent('00:00')
    expect(liveBeeps()).toHaveLength(0)
    expect(storage.data.has(TIMER_KEY)).toBe(false)
    advance(700_000)
    expect(status()).toHaveTextContent('')
  })
})

describe('time up', () => {
  it('fades the full ring three times, announces, clears, then returns to idle with one beep', () => {
    setup()
    startWith('00:03')
    expect(liveBeeps()).toHaveLength(1)
    expect(liveBeeps()[0].startAt).toBe(3)
    advance(3000)
    expect(api.phase).toBe('done')
    expect(status()).toHaveTextContent('Time is up')
    expect(bar()).toHaveClass('timer-done')
    expect(bar()).toHaveAttribute('data-sweep', '360')
    expect(storage.data.has(TIMER_KEY)).toBe(false)
    expect(document.title).toBe('Hourly')
    advance(DONE_MS)
    expect(api.phase).toBe('idle')
    expect(bar()).toBeNull()
    expect(status()).toHaveTextContent('')
    expect(label()).toHaveTextContent('00:00')
    // The JS finish never books a second sound.
    expect(allBeeps()).toHaveLength(1)
  })

  it('with reduced motion: no fades or pulse, a brief static ring, still the beep', () => {
    setup({ reduceMotion: true })
    startWith('10')
    fireEvent.click(label())
    fireEvent.blur(field())
    expect(document.querySelector('.timer-cue')).not.toBeNull()
    expect(document.querySelector('.timer-pulse')).toBeNull()
    fireEvent.click(label())
    type('00:02')
    advance(2000)
    expect(bar()).not.toHaveClass('timer-done')
    expect(bar()).toHaveAttribute('data-sweep', '360')
    advance(DONE_REDUCED_MS)
    expect(bar()).toBeNull()
    expect(liveBeeps()).toHaveLength(1)
  })

  it('notifies only when the page is hidden or unfocused, and asks permission once on the first start', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    setup()
    startWith('00:02')
    expect(FakeNotification.requests).toBe(1)
    FakeNotification.permission = 'granted'
    advance(2000)
    expect(FakeNotification.shown).toHaveLength(0) // visible and focused
    advance(DONE_MS)

    startWith('00:02')
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    advance(2000)
    expect(FakeNotification.shown.map((n) => n.title)).toEqual(['Time is up'])
    expect(FakeNotification.requests).toBe(1)
    hidden.mockRestore()
  })

  it('survives a Notification constructor that throws', () => {
    class Throwing {
      static permission = 'granted'
      constructor() {
        throw new TypeError('Illegal constructor')
      }
    }
    vi.stubGlobal('Notification', Throwing)
    vi.spyOn(document, 'hasFocus').mockReturnValue(false)
    setup()
    startWith('00:01')
    expect(() => advance(1000)).not.toThrow()
    expect(api.phase).toBe('done')
    vi.unstubAllGlobals()
  })
})

describe('keys', () => {
  it('F8 with no timer starts the default; F8 and MediaPlayPause toggle; repeats are ignored', () => {
    setup({ defaultMs: 90_000 })
    const e = press('F8')
    expect(e.defaultPrevented).toBe(true)
    expect(api.phase).toBe('running')
    expect(label()).toHaveTextContent('01:30')
    expect(liveBeeps()).toHaveLength(1)
    press('F8')
    expect(api.phase).toBe('paused')
    expect(liveBeeps()).toHaveLength(0)
    const r = press('F8', { repeat: true })
    expect(r.defaultPrevented).toBe(true)
    expect(api.phase).toBe('paused')
    press('MediaPlayPause')
    expect(api.phase).toBe('running')
    expect(liveBeeps()).toHaveLength(1)
    press('F7')
    expect(api.phase).toBe('running')
  })

  it('F8 while the field is open resumes and closes it', () => {
    setup()
    startWith('10')
    fireEvent.click(label())
    expect(field()).toBeInTheDocument()
    press('F8')
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(api.phase).toBe('running')
  })
})

describe('sound scheduling', () => {
  it('books one beep per start or resume on the audio clock and cancels it on pause', () => {
    setup()
    startWith('10')
    expect(FakeAudioContext.instances).toHaveLength(1)
    expect(liveBeeps().map((o) => o.startAt)).toEqual([600])
    advance(100_000)
    fireEvent.click(label()) // pause
    expect(liveBeeps()).toHaveLength(0)
    fireEvent.blur(field())
    FakeAudioContext.instances[0].currentTime = 100
    press('F8') // resume
    expect(liveBeeps().map((o) => o.startAt)).toEqual([600])
    expect(FakeAudioContext.instances).toHaveLength(1)
    expect(FakeAudioContext.instances[0].closed).toBe(false)
  })
})

describe('persistence and background', () => {
  it('a reload while running resumes with the right time and books the beep on the first gesture', () => {
    saveTimer(storage, startTimer(120_000, T0 - 30_000))
    setup()
    expect(label()).toHaveTextContent('01:30')
    expect(api.phase).toBe('running')
    expect(FakeAudioContext.instances).toHaveLength(0)
    act(() => {
      window.dispatchEvent(new Event('pointerdown'))
    })
    expect(liveBeeps().map((o) => o.startAt)).toEqual([90])
    act(() => {
      window.dispatchEvent(new Event('pointerdown'))
    })
    expect(allBeeps()).toHaveLength(1)
  })

  it('a timer that ended while the tab was closed is cleared silently', () => {
    saveTimer(storage, startTimer(60_000, T0 - 120_000))
    setup()
    expect(api.phase).toBe('idle')
    expect(storage.data.has(TIMER_KEY)).toBe(false)
    expect(status()).toHaveTextContent('')
    act(() => {
      window.dispatchEvent(new Event('pointerdown'))
    })
    expect(allBeeps()).toHaveLength(0)
  })

  it('resyncs the label when the tab becomes visible', () => {
    setup()
    startWith('10')
    vi.setSystemTime(T0 + 200_000) // timers did not run: a throttled background tab
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(label()).toHaveTextContent('06:40')
  })

  it('reset (Clear all data) cancels sound and notification, clears the key and restores the title', () => {
    setup()
    startWith('10')
    expect(document.title).toBe('10:00 · Hourly')
    act(() => api.reset())
    expect(api.phase).toBe('idle')
    expect(liveBeeps()).toHaveLength(0)
    expect(storage.data.has(TIMER_KEY)).toBe(false)
    expect(document.title).toBe('Hourly')
    advance(700_000)
    expect(status()).toHaveTextContent('')
  })
})

describe('tab title', () => {
  it('shows the countdown while running and restores the original on pause, cancel and unmount', () => {
    document.title = 'Hourly test'
    const { unmount } = setup()
    startWith('14:32')
    expect(document.title).toBe('14:32 · Hourly test')
    advance(1000)
    expect(document.title).toBe('14:31 · Hourly test')
    fireEvent.click(label())
    expect(document.title).toBe('Hourly test')
    fireEvent.keyDown(field(), { key: 'Escape' })
    press('F8')
    expect(document.title).toBe('14:31 · Hourly test')
    unmount()
    expect(document.title).toBe('Hourly test')
  })
})

describe('StrictMode', () => {
  it('leaves one key listener and one ticking timeout', () => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    setup({ strict: true })
    const keyListeners = (spy: typeof add) => spy.mock.calls.filter(([type, , opts]) => type === 'keydown' && !opts).length
    expect(keyListeners(add) - keyListeners(remove)).toBe(1)
    press('F8')
    expect(api.phase).toBe('running')
    expect(label()).toHaveTextContent('01:00')
    advance(1000)
    expect(label()).toHaveTextContent('00:59')
    expect(vi.getTimerCount()).toBe(1)
    expect(liveBeeps()).toHaveLength(1)
  })
})
