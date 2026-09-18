import { describe, expect, it } from 'vitest'
import { rovingIndex } from '../roving'

describe('rovingIndex', () => {
  it('moves forward with Right/Down and wraps', () => {
    expect(rovingIndex('ArrowRight', 0, 3)).toBe(1)
    expect(rovingIndex('ArrowDown', 1, 3)).toBe(2)
    expect(rovingIndex('ArrowRight', 2, 3)).toBe(0)
  })
  it('moves back with Left/Up and wraps', () => {
    expect(rovingIndex('ArrowLeft', 1, 3)).toBe(0)
    expect(rovingIndex('ArrowUp', 0, 3)).toBe(2)
  })
  it('jumps with Home/End', () => {
    expect(rovingIndex('Home', 2, 3)).toBe(0)
    expect(rovingIndex('End', 0, 3)).toBe(2)
  })
  it('ignores other keys', () => {
    expect(rovingIndex('Tab', 0, 3)).toBeNull()
    expect(rovingIndex('Enter', 0, 3)).toBeNull()
    expect(rovingIndex(' ', 0, 3)).toBeNull()
  })
})
