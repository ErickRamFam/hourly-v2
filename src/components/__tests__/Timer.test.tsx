import { StrictMode, useEffect } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
const play = () => screen.queryByRole('button', { name: 'Resume timer' })
const pauseButton = () => screen.queryByRole('button', { name: 'Pause timer' })
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
    expect(label()).toHaveAccessibleName('Timer, 05:00 left. Press to edit')
    expect(JSON.parse(storage.data.get(TIMER_KEY)!)).toEqual({ status: 'running', endsAt: T0 + 300_000, totalMs: 300_000 })
    expect(bar()).toHaveAttribute('data-sweep', '30')
    advance(1000)
    expect(label()).toHaveTextContent('04:59')
    advance(59_000)
    expect(label()).toHaveTextContent('04:00')
    expect(bar()).toHaveAttribute('data-sweep', '24')
  })

  it('opening the field freezes a running timer: no ticking, no beep, title held, no buttons', () => {
    document.title = 'Hourly'
    setup()
    startWith('10')
    advance(3000)
    fireEvent.click(label())
    expect(field()).toHaveValue('09:57')
    expect(liveBeeps()).toHaveLength(0)
    expect(play()).toBeNull()
    expect(pauseButton()).toBeNull()
    expect(document.title).toBe('09:57 · Hourly')
    // Longer than what was left: frozen, so nothing ends and nothing sounds.
    advance(700_000)
    expect(api.phase).toBe('paused')
    expect(field()).toBeInTheDocument()
    expect(document.title).toBe('09:57 · Hourly')
    expect(status()).toHaveTextContent('')
    expect(allBeeps().filter((o) => !o.cancelled)).toHaveLength(0)
  })

  it('clicking away from a field opened on a running timer resumes from the frozen time', () => {
    setup()
    startWith('10')
    advance(3000)
    fireEvent.click(label())
    advance(60_000)
    fireEvent.change(field(), { target: { value: '3' } })
    FakeAudioContext.instances[0].currentTime = 63
    fireEvent.blur(field())
    expect(api.phase).toBe('running')
    expect(label()).toHaveTextContent('09:57')
    expect(JSON.parse(storage.data.get(TIMER_KEY)!)).toMatchObject({ status: 'running', endsAt: T0 + 63_000 + 597_000 })
    // Booked again from the frozen remaining time, on the audio clock.
    expect(liveBeeps().map((o) => o.startAt)).toEqual([63 + 597])
    expect(bar()).toHaveAttribute('data-sweep', '59.7')
    advance(1000)
    expect(label()).toHaveTextContent('09:56')
  })

  it('Escape restores the same way, and stays inside the field', () => {
    setup()
    startWith('10')
    advance(3000)
    const onDocKey = vi.fn()
    document.addEventListener('keydown', onDocKey)
    fireEvent.click(label())
    advance(5000)
    FakeAudioContext.instances[0].currentTime = 8
    fireEvent.keyDown(field(), { key: 'Escape' })
    document.removeEventListener('keydown', onDocKey)
    expect(onDocKey).not.toHaveBeenCalled()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(api.phase).toBe('running')
    expect(label()).toHaveAccessibleName('Timer, 09:57 left. Press to edit')
    expect(liveBeeps().map((o) => o.startAt)).toEqual([8 + 597])
  })

  it('Enter with a new time on a running timer runs from the new time', () => {
    setup()
    startWith('10')
    advance(3000)
    fireEvent.click(label())
    type('2:00')
    expect(api.phase).toBe('running')
    expect(label()).toHaveTextContent('02:00')
    expect(bar()).toHaveAttribute('data-sweep', '12')
    expect(liveBeeps()).toHaveLength(1)
  })

  it('a field opened on a paused timer stays paused when it closes without a new time', () => {
    setup()
    startWith('10')
    fireEvent.click(pauseButton()!)
    fireEvent.click(label())
    fireEvent.change(field(), { target: { value: '3' } })
    fireEvent.blur(field())
    expect(api.phase).toBe('paused')
    expect(label()).toHaveTextContent('10:00')
    expect(liveBeeps()).toHaveLength(0)
    fireEvent.click(label())
    fireEvent.keyDown(field(), { key: 'Escape' })
    expect(api.phase).toBe('paused')
  })

  it('a new time on a paused timer resumes from it and redraws the bar', () => {
    setup()
    startWith('10')
    press('p')
    fireEvent.click(label())
    type('2:00')
    expect(api.phase).toBe('running')
    expect(label()).toHaveTextContent('02:00')
    expect(bar()).toHaveAttribute('data-sweep', '12')
    expect(liveBeeps()).toHaveLength(1)
    expect(liveBeeps()[0].startAt).toBe(120)
  })

  it('0 cancels an active timer with no beep, from running or paused', () => {
    setup()
    startWith('10')
    fireEvent.click(label())
    type('0')
    expect(api.phase).toBe('idle')
    expect(label()).toHaveTextContent('00:00')
    expect(liveBeeps()).toHaveLength(0)
    expect(storage.data.has(TIMER_KEY)).toBe(false)
    startWith('10')
    press('p')
    fireEvent.click(label())
    type('0000')
    expect(api.phase).toBe('idle')
    advance(700_000)
    expect(status()).toHaveTextContent('')
    expect(liveBeeps()).toHaveLength(0)
  })
})

describe('focus indicator on the label', () => {
  it('after a pointer-started edit, Enter returns focus to the label quietly until Tab', () => {
    setup()
    fireEvent.click(label(), { detail: 1 })
    fireEvent.change(field(), { target: { value: '5' } })
    fireEvent.keyDown(field(), { key: 'Enter' })
    expect(label()).toHaveFocus()
    expect(label()).toHaveAttribute('data-quiet-focus')
    press('Tab')
    expect(label()).not.toHaveAttribute('data-quiet-focus')
  })

  it('Escape after a pointer-started edit is quiet too, and focus leaving clears it', () => {
    setup()
    startWith('10')
    fireEvent.click(label(), { detail: 1 })
    fireEvent.keyDown(field(), { key: 'Escape' })
    expect(label()).toHaveAttribute('data-quiet-focus')
    fireEvent.blur(label())
    expect(label()).not.toHaveAttribute('data-quiet-focus')
  })

  it('a keyboard-started edit keeps the keyboard indicator', () => {
    setup()
    fireEvent.click(label(), { detail: 0 }) // Enter or Space on the button
    fireEvent.change(field(), { target: { value: '5' } })
    fireEvent.keyDown(field(), { key: 'Enter' })
    expect(label()).toHaveFocus()
    expect(label()).not.toHaveAttribute('data-quiet-focus')
  })
})

describe('pause and play buttons', () => {
  it('one slot: pause while running, play while paused, nothing idle or with the field open', () => {
    setup()
    expect(pauseButton()).toBeNull()
    expect(play()).toBeNull()
    startWith('10')
    expect(pauseButton()).toBeInTheDocument()
    expect(play()).toBeNull()
    expect(document.querySelector('.timer-pulse')).toBeNull()
    fireEvent.click(pauseButton()!)
    expect(play()).toBeInTheDocument()
    expect(pauseButton()).toBeNull()
    expect(document.querySelector('.timer-pulse')).not.toBeNull()
    fireEvent.click(label())
    expect(play()).toBeNull()
    expect(pauseButton()).toBeNull()
  })

  it('pause pauses at the current time without opening the field, and keeps focus on the slot', () => {
    document.title = 'Hourly'
    setup()
    startWith('10')
    advance(4000)
    const button = pauseButton()!
    button.focus()
    fireEvent.click(button)
    expect(api.phase).toBe('paused')
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(label()).toHaveTextContent('09:56')
    expect(liveBeeps()).toHaveLength(0)
    expect(document.title).toBe('Hourly')
    expect(play()).toBe(button) // the same element, so focus stays
    expect(play()).toHaveFocus()
    advance(5000)
    expect(label()).toHaveTextContent('09:56')
  })

  it('play resumes without opening the field and books the beep again from the gesture', () => {
    setup()
    startWith('10')
    advance(4000)
    fireEvent.click(pauseButton()!)
    FakeAudioContext.instances[0].currentTime = 4
    fireEvent.click(play()!)
    expect(api.phase).toBe('running')
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(pauseButton()).toBeInTheDocument()
    expect(liveBeeps().map((o) => o.startAt)).toEqual([600])
  })

  it('P and MediaPlayPause do what the buttons do', () => {
    setup()
    startWith('10')
    press('p')
    expect(play()).toBeInTheDocument()
    press('MediaPlayPause')
    expect(pauseButton()).toBeInTheDocument()
    press('P')
    expect(api.phase).toBe('paused')
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('names: the slot sits right after the time, and the label announces P', () => {
    setup()
    startWith('10')
    expect(label()).toHaveAttribute('aria-keyshortcuts', 'P')
    const names = () => Array.from(document.querySelectorAll('.timer-label button')).map((b) => b.getAttribute('aria-label'))
    expect(names()).toEqual(['Timer, 10:00 left. Press to edit', 'Pause timer'])
    press('p')
    expect(names()).toEqual(['Timer paused, 10:00 left. Press to edit', 'Resume timer'])
  })
})

describe('digits-only field', () => {
  // userEvent needs real timers; nothing here waits on the countdown.
  beforeEach(() => {
    vi.useRealTimers()
  })
  const user = () => userEvent.setup()
  async function openEmpty(u: ReturnType<typeof userEvent.setup>) {
    await u.click(label())
    await u.clear(field())
  }

  it('is a numeric text field, not type=number', async () => {
    const u = user()
    setup()
    await u.click(label())
    expect(field()).toHaveAttribute('type', 'text')
    expect(field()).toHaveAttribute('inputmode', 'numeric')
    expect(field()).toHaveAttribute('autocomplete', 'off')
  })

  it.each([
    ['abc', ''],
    ['5a3', '53'],
    ['1e2', '12'],
    ['-', ''],
    ['.', ''],
    ['!@#5', '5'],
  ])('typing %j leaves %j', async (typed, shown) => {
    const u = user()
    setup()
    await openEmpty(u)
    await u.type(field(), typed)
    expect(field()).toHaveValue(shown)
  })

  it('adds the colon at three and four digits and keeps the caret at the end', async () => {
    const u = user()
    setup()
    await openEmpty(u)
    const seen: string[] = []
    for (const d of '1500') {
      await u.keyboard(d)
      seen.push(field().value)
      expect(field().selectionStart).toBe(field().value.length)
    }
    expect(seen).toEqual(['1', '15', '1:50', '15:00'])
  })

  it('ignores a fifth digit', async () => {
    const u = user()
    setup()
    await openEmpty(u)
    await u.keyboard('15009')
    expect(field()).toHaveValue('15:00')
  })

  it('backspace removes the last digit and the colon reflows', async () => {
    const u = user()
    setup()
    await openEmpty(u)
    await u.keyboard('530')
    expect(field()).toHaveValue('5:30')
    await u.keyboard('{Backspace}')
    expect(field()).toHaveValue('53')
    await u.keyboard('{Backspace}{Backspace}')
    expect(field()).toHaveValue('')
  })

  it('pasted text keeps its first four digits', async () => {
    const u = user()
    setup()
    await openEmpty(u)
    await u.paste('12abc34567')
    expect(field()).toHaveValue('12:34')
  })

  it('IME or mobile-keyboard text is sanitized too', () => {
    setup()
    fireEvent.click(label())
    fireEvent.change(field(), { target: { value: '４5x3' } })
    expect(field()).toHaveValue('53')
  })

  it('starts from typed digits: 530 is 5:30', async () => {
    const u = user()
    setup()
    await openEmpty(u)
    await u.keyboard('530{Enter}')
    expect(label()).toHaveTextContent('05:30')
  })

  it('out-of-range digits stay open as invalid', async () => {
    const u = user()
    setup()
    await openEmpty(u)
    await u.keyboard('0075{Enter}')
    expect(field()).toHaveAttribute('aria-invalid', 'true')
    await u.clear(field())
    await u.keyboard('6001{Enter}')
    expect(field()).toHaveAttribute('aria-invalid', 'true')
  })

  it('prefills a paused 14:32 as 14:32 and 0000 cancels it', async () => {
    const u = user()
    setup()
    startWith('1432')
    fireEvent.click(label())
    expect(field()).toHaveValue('14:32')
    await u.clear(field())
    await u.keyboard('0000{Enter}')
    expect(api.phase).toBe('idle')
    expect(liveBeeps()).toHaveLength(0)
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

  it('drops a beep still booked far ahead when the timer ends on a frozen audio clock (sleep, suspended context)', () => {
    setup()
    startWith('10')
    expect(liveBeeps().map((o) => o.startAt)).toEqual([600])
    // The audio clock stopped at 60s (lid closed); the wall clock runs on past the end.
    FakeAudioContext.instances[0].currentTime = 60
    advance(600_000)
    expect(api.phase).toBe('done')
    expect(liveBeeps()).toHaveLength(0)
  })

  it('keeps the beep when the audio clock is on time at the end', () => {
    setup()
    startWith('00:03')
    FakeAudioContext.instances[0].currentTime = 2.9 // JS can land a moment before the audio clock
    advance(3000)
    expect(api.phase).toBe('done')
    expect(liveBeeps()).toHaveLength(1)
  })

  it('after a reload, one tap (pointerup / touchend, not a mouse pointerdown) books the beep', () => {
    saveTimer(storage, startTimer(120_000, T0))
    setup()
    expect(FakeAudioContext.instances).toHaveLength(0)
    act(() => {
      window.dispatchEvent(new Event('touchend', { bubbles: true }))
    })
    expect(liveBeeps()).toHaveLength(1)
  })

  it('focus on Pause timer moves to the label when the timer ends and the button goes', () => {
    setup()
    startWith('00:03')
    pauseButton()!.focus()
    FakeAudioContext.instances[0].currentTime = 3
    advance(3000)
    expect(pauseButton()).toBeNull()
    expect(label()).toHaveFocus()
  })

  it('MediaPlayPause with the field open closes it and puts focus back on the label', () => {
    setup()
    startWith('10')
    fireEvent.click(label())
    expect(field()).toHaveFocus()
    press('MediaPlayPause')
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(label()).toHaveFocus()
  })

  it('with reduced motion: no fades or pulse, a brief static ring, still the beep', () => {
    setup({ reduceMotion: true })
    startWith('10')
    press('p')
    expect(play()).not.toBeNull()
    expect(document.querySelector('.timer-pulse')).toBeNull()
    fireEvent.click(label())
    type('00:02')
    FakeAudioContext.instances[0].currentTime = 2 // the audio clock keeps time with the wall clock
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
  it('P with no timer starts the default; P and MediaPlayPause toggle; repeats are ignored', () => {
    setup({ defaultMs: 90_000 })
    const e = press('p')
    expect(e.defaultPrevented).toBe(true)
    expect(api.phase).toBe('running')
    expect(label()).toHaveTextContent('01:30')
    expect(liveBeeps()).toHaveLength(1)
    press('P') // Shift or Caps Lock
    expect(api.phase).toBe('paused')
    expect(liveBeeps()).toHaveLength(0)
    const r = press('p', { repeat: true })
    expect(r.defaultPrevented).toBe(false)
    expect(api.phase).toBe('paused')
    press('MediaPlayPause')
    expect(api.phase).toBe('running')
    expect(liveBeeps()).toHaveLength(1)
    press('o')
    expect(api.phase).toBe('running')
  })

  it('F8 does nothing any more', () => {
    setup()
    const e = press('F8')
    expect(e.defaultPrevented).toBe(false)
    expect(api.phase).toBe('idle')
  })

  it('P is ignored with Ctrl, Cmd or Alt held, so print still works', () => {
    setup()
    for (const mod of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }]) {
      const e = press('p', mod)
      expect(e.defaultPrevented).toBe(false)
    }
    expect(api.phase).toBe('idle')
  })

  it('P is ignored while typing in a text control, including the timer field', () => {
    setup()
    const input = document.createElement('input')
    const area = document.createElement('textarea')
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    document.body.append(input, area, editable)
    for (const el of [input, area, editable]) {
      act(() => {
        el.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true, cancelable: true }))
      })
    }
    input.focus()
    press('p') // focus is in a text control even though the event comes from the window
    expect(api.phase).toBe('idle')
    input.blur()
    fireEvent.click(label())
    fireEvent.keyDown(field(), { key: 'p' })
    act(() => {
      field().dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true, cancelable: true }))
    })
    expect(api.phase).toBe('idle')
    expect(field()).toBeInTheDocument()
    input.remove()
    area.remove()
    editable.remove()
  })

  it('P is ignored while the Clear all data dialog is open', () => {
    setup()
    const modal = document.createElement('div')
    modal.setAttribute('data-modal', '')
    document.body.append(modal)
    press('p')
    expect(api.phase).toBe('idle')
    modal.remove()
    press('p')
    expect(api.phase).toBe('running')
  })

  it('MediaPlayPause while the field is open resumes and closes it', () => {
    setup()
    startWith('10')
    fireEvent.click(label())
    expect(field()).toBeInTheDocument()
    press('MediaPlayPause')
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
    fireEvent.click(pauseButton()!)
    expect(liveBeeps()).toHaveLength(0)
    FakeAudioContext.instances[0].currentTime = 100
    press('p') // resume
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
    press('p')
    expect(document.title).toBe('Hourly test')
    press('p')
    expect(document.title).toBe('14:31 · Hourly test')
    fireEvent.click(label())
    type('0')
    expect(document.title).toBe('Hourly test')
    startWith('5')
    expect(document.title).toBe('05:00 · Hourly test')
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
    press('p')
    expect(api.phase).toBe('running')
    expect(label()).toHaveTextContent('01:00')
    advance(1000)
    expect(label()).toHaveTextContent('00:59')
    expect(vi.getTimerCount()).toBe(1)
    expect(liveBeeps()).toHaveLength(1)
  })
})
