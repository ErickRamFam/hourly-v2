/**
 * The time-up sound, scheduled on the Web Audio clock rather than fired from a setTimeout at
 * the end. A setTimeout in a background tab can be throttled to about once a minute; a node
 * scheduled at `ctx.currentTime + remaining` plays on time while the user is on another tab or
 * app. So the beep is booked when the timer starts or resumes, cancelled on pause, edit,
 * cancel and reset, and a late JS handler at 0:00 never plays a second one.
 *
 * Browsers only let an AudioContext start inside a user gesture, so `prepare()` must be called
 * from the click, Enter or key press that starts or resumes the timer. After a reload the
 * context does not exist yet; the caller prepares and reschedules on the first pointerdown or
 * keydown. iOS may still suspend or silence Web Audio (silent switch, backgrounded Safari);
 * that is out of our hands.
 */

/** Three soft beeps, timed with the three fades of the bar (DESIGN.md §9, about 2.4s). */
const PULSES = [0, 0.8, 1.6]
const PULSE_S = 0.32
const FREQ = 880
const PEAK = 0.18

type AudioCtor = new () => AudioContext

function audioCtor(): AudioCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor }
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

export type Beeper = {
  /** Creates or resumes the context. Call only inside a user gesture. False without Web Audio. */
  prepare(): boolean
  /** Books the beep `delayMs` from now, replacing any booked one. False if nothing could be booked. */
  schedule(delayMs: number): boolean
  /** Cancels the booked beep, if any. */
  cancel(): void
  /**
   * Cancels the booked beep only if it is still more than `graceS` away on the audio clock.
   * At time up the audio clock should be at the beep; if it is far behind (the machine slept,
   * the context was suspended), the beep would sound minutes after the timer ended.
   */
  cancelPending(graceS: number): void
  /** True while a beep is booked and has not finished. */
  readonly scheduled: boolean
  /** True once a context exists and is running (so a booked beep will actually play). */
  readonly ready: boolean
}

export function createBeeper(Ctor: AudioCtor | null = audioCtor()): Beeper {
  let ctx: AudioContext | null = null
  let osc: OscillatorNode | null = null
  let gain: GainNode | null = null
  let endsAt = 0
  let startsAt = 0

  const cancel = () => {
    if (osc) {
      try {
        osc.onended = null
        osc.stop()
      } catch {
        // already stopped or never started
      }
      try {
        osc.disconnect()
        gain?.disconnect()
      } catch {
        // ignore
      }
    }
    osc = null
    gain = null
    endsAt = 0
    startsAt = 0
  }

  return {
    prepare() {
      if (!Ctor) return false
      try {
        if (!ctx) ctx = new Ctor()
        // Never closed: StrictMode double effects would leave a closed context behind.
        // iOS reports 'interrupted' after a call or Siri; resume that too.
        if (ctx.state !== 'running') void ctx.resume().catch(() => {})
        return true
      } catch {
        ctx = null
        return false
      }
    },
    schedule(delayMs) {
      cancel()
      if (!ctx || delayMs <= 0) return false
      try {
        const t0 = ctx.currentTime + delayMs / 1000
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.type = 'sine'
        o.frequency.value = FREQ
        g.gain.setValueAtTime(0, ctx.currentTime)
        for (const at of PULSES) {
          const t = t0 + at
          g.gain.setValueAtTime(0, t)
          g.gain.linearRampToValueAtTime(PEAK, t + 0.02)
          g.gain.exponentialRampToValueAtTime(0.0001, t + PULSE_S)
          g.gain.setValueAtTime(0, t + PULSE_S + 0.01)
        }
        o.connect(g)
        g.connect(ctx.destination)
        const stopAt = t0 + PULSES[PULSES.length - 1] + PULSE_S + 0.05
        o.start(t0)
        o.stop(stopAt)
        o.onended = () => {
          if (osc === o) {
            osc = null
            gain = null
            endsAt = 0
          }
        }
        osc = o
        gain = g
        endsAt = stopAt
        startsAt = t0
        return true
      } catch {
        cancel()
        return false
      }
    },
    cancel,
    cancelPending(graceS) {
      if (osc && ctx && ctx.currentTime < startsAt - graceS) cancel()
    },
    get scheduled() {
      return osc !== null && (!ctx || ctx.currentTime < endsAt)
    },
    get ready() {
      return ctx !== null && ctx.state === 'running'
    },
  }
}
