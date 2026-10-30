import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../components/App'

const panel = () => screen.queryByRole('complementary')
const railButton = (name: string) => within(screen.getByRole('navigation', { name: 'Sections' })).getByRole('button', { name })
const outside = () => document.querySelector('.hourword') ?? document.body

/** Waits out the 200ms exit animation so the panel is unmounted. */
async function closed() {
  await waitFor(() => expect(panel()).not.toBeInTheDocument())
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('closing panels by clicking outside', () => {
  for (const name of ['Collection', 'Settings']) {
    it(`an outside pointerdown closes ${name} and returns focus to the opener`, async () => {
      const user = userEvent.setup()
      render(<App persist={false} />)
      await user.click(railButton(name))
      expect(screen.getByRole('complementary', { name })).toBeInTheDocument()
      fireEvent.pointerDown(outside())
      expect(railButton(name)).toHaveAttribute('aria-pressed', 'false')
      await closed()
      expect(railButton(name)).toHaveFocus()
    })
  }

  it('a pointerdown inside the panel does not close it', async () => {
    const user = userEvent.setup()
    render(<App persist={false} />)
    await user.click(railButton('Settings'))
    const p = screen.getByRole('complementary', { name: 'Settings' })
    fireEvent.pointerDown(within(p).getByRole('radio', { name: 'Dark' }))
    fireEvent.pointerDown(p)
    expect(railButton('Settings')).toHaveAttribute('aria-pressed', 'true')
    expect(panel()).toBeInTheDocument()
  })

  it('rail buttons still toggle and switch panels with no double close', async () => {
    const user = userEvent.setup()
    render(<App persist={false} />)
    await user.click(railButton('Collection'))
    await user.click(railButton('Settings'))
    expect(screen.getByRole('complementary', { name: 'Settings' })).toBeInTheDocument()
    expect(railButton('Settings')).toHaveAttribute('aria-pressed', 'true')
    await user.click(railButton('Settings'))
    expect(railButton('Settings')).toHaveAttribute('aria-pressed', 'false')
    await closed()
    await user.click(railButton('Collection'))
    expect(screen.getByRole('complementary', { name: 'Collection' })).toBeInTheDocument()
  })

  it('the X and Escape still close', async () => {
    const user = userEvent.setup()
    render(<App persist={false} />)
    await user.click(railButton('Collection'))
    await user.click(within(panel()!).getByRole('button', { name: 'Close' }))
    await closed()
    await user.click(railButton('Collection'))
    await user.keyboard('{Escape}')
    await closed()
  })

  it('does not close Settings while the Clear all data dialog is open, including clicks on the dialog', async () => {
    const user = userEvent.setup()
    render(<App persist={false} />)
    await user.click(railButton('Settings'))
    await user.click(screen.getByRole('button', { name: 'Clear all data' }))
    const dialog = screen.getByRole('dialog', { name: 'Clear all data?' })
    fireEvent.pointerDown(within(dialog).getByRole('button', { name: 'Cancel' }))
    fireEvent.pointerDown(outside())
    expect(railButton('Settings')).toHaveAttribute('aria-pressed', 'true')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(panel()).toBeInTheDocument()
  })

  it('leaves the outside click alone and keeps focus on a focusable target', async () => {
    const user = userEvent.setup()
    render(<App persist={false} />)
    await user.click(railButton('Collection'))
    const input = screen.getByLabelText('Quest title')
    const down = new PointerEvent('pointerdown', { bubbles: true, cancelable: true })
    const stop = vi.spyOn(down, 'stopPropagation')
    act(() => {
      input.dispatchEvent(down)
    })
    expect(down.defaultPrevented).toBe(false)
    expect(stop).not.toHaveBeenCalled()
    input.focus()
    await closed()
    expect(input).toHaveFocus()
  })

  it('removes the listener once closed', async () => {
    const add = vi.spyOn(document, 'addEventListener')
    const remove = vi.spyOn(document, 'removeEventListener')
    const user = userEvent.setup()
    render(<App persist={false} />)
    const count = (spy: typeof add) => spy.mock.calls.filter(([type]) => type === 'pointerdown').length
    const before = count(add) - count(remove)
    await user.click(railButton('Settings'))
    expect(count(add) - count(remove)).toBe(before + 1)
    fireEvent.pointerDown(outside())
    await closed()
    expect(count(add) - count(remove)).toBe(before)
  })
})
