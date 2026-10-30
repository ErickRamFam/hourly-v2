import '@testing-library/jest-dom/vitest'

// jsdom has no AnimationEvent; without it react-dom listens for webkitAnimationEnd instead of
// animationend, so onAnimationEnd handlers never see fireEvent.animationEnd. Defined before
// react-dom loads.
if (typeof globalThis.AnimationEvent === 'undefined') {
  class AnimationEventStub extends Event {
    readonly animationName: string
    readonly elapsedTime: number
    readonly pseudoElement: string
    constructor(type: string, init: AnimationEventInit = {}) {
      super(type, init)
      this.animationName = init.animationName ?? ''
      this.elapsedTime = init.elapsedTime ?? 0
      this.pseudoElement = init.pseudoElement ?? ''
    }
  }
  globalThis.AnimationEvent = AnimationEventStub as unknown as typeof AnimationEvent
}
