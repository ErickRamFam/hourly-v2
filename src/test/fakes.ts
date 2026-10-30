/**
 * Minimal stand-ins for browser APIs jsdom lacks (AudioContext, Notification, matchMedia).
 * Installed by src/test-setup.ts; tests import these to inspect what was booked or shown.
 */

class FakeParam {
  value = 0
  setValueAtTime() {
    return this
  }
  linearRampToValueAtTime() {
    return this
  }
  exponentialRampToValueAtTime() {
    return this
  }
}

export class FakeOscillator {
  type = 'sine'
  frequency = new FakeParam()
  onended: (() => void) | null = null
  startAt: number | null = null
  stopAt: number | null = null
  /** True once stop() was called without a time: a cancel, not the scheduled end. */
  cancelled = false
  connect() {}
  disconnect() {}
  start(t = 0) {
    this.startAt = t
  }
  stop(t?: number) {
    if (t === undefined) this.cancelled = true
    else this.stopAt = t
  }
}

export class FakeAudioContext {
  static instances: FakeAudioContext[] = []
  state: AudioContextState = 'running'
  currentTime = 0
  destination = {}
  oscillators: FakeOscillator[] = []
  closed = false
  constructor() {
    FakeAudioContext.instances.push(this)
  }
  createOscillator() {
    const o = new FakeOscillator()
    this.oscillators.push(o)
    return o
  }
  createGain() {
    return { gain: new FakeParam(), connect() {}, disconnect() {} }
  }
  resume() {
    this.state = 'running'
    return Promise.resolve()
  }
  close() {
    this.closed = true
    return Promise.resolve()
  }
}

/** Every oscillator booked so far that has not been cancelled: one per beep that would play. */
export function liveBeeps(): FakeOscillator[] {
  return FakeAudioContext.instances.flatMap((c) => c.oscillators).filter((o) => !o.cancelled)
}
export function allBeeps(): FakeOscillator[] {
  return FakeAudioContext.instances.flatMap((c) => c.oscillators)
}

export class FakeNotification {
  static permission: NotificationPermission = 'default'
  static requests = 0
  static shown: FakeNotification[] = []
  title: string
  closed = false
  constructor(title: string) {
    this.title = title
    FakeNotification.shown.push(this)
  }
  static requestPermission() {
    FakeNotification.requests += 1
    return Promise.resolve(FakeNotification.permission)
  }
  close() {
    this.closed = true
  }
}

export function fakeMatchMedia(query: string): MediaQueryList {
  return {
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  } as MediaQueryList
}

export function resetFakes() {
  FakeAudioContext.instances = []
  FakeNotification.permission = 'default'
  FakeNotification.requests = 0
  FakeNotification.shown = []
}
