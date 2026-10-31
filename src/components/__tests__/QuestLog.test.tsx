import { useEffect } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MAX_TITLE_LENGTH } from '../../lib/quests'
import { initialState } from '../../lib/storage'
import { dayKey } from '../../lib/time'
import { StoreProvider } from '../../state/StoreProvider'
import type { AppState } from '../../state/types'
import { useAppState } from '../../state/useStore'
import { QuestLog } from '../QuestLog'

const TODAY = dayKey(new Date())

/** Three quests for today; B is done and has earned its lumen. */
function seeded(): AppState {
  const base = initialState()
  return {
    ...base,
    quests: [
      { id: 'a', title: 'A', repeats: true, createdDay: TODAY },
      { id: 'b', title: 'B', repeats: false, createdDay: TODAY },
      { id: 'c', title: 'C', repeats: false, createdDay: TODAY },
    ],
    completions: { [TODAY]: ['b'] },
    ledger: [{ id: 'e1', at: 1, delta: 1, reason: 'quest', ref: `${TODAY}/b` }],
  }
}

/** The store's state after the last commit. */
let latest: AppState
function Probe() {
  const state = useAppState()
  useEffect(() => {
    latest = state
  })
  return null
}

function renderLog(initial: AppState = seeded()) {
  return render(
    <StoreProvider persist={false} initial={initial}>
      <QuestLog today={TODAY} />
      <Probe />
    </StoreProvider>,
  )
}

const titles = () => within(screen.getByRole('list', { name: 'Quests for today' })).getAllByRole('checkbox').map((c) => c.getAttribute('aria-label'))
const rowOf = (title: string) => screen.getByRole('checkbox', { name: title }).closest('li')!

/** jsdom has no matchMedia; this reports a touch screen (no hover). */
function mockTouch() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query === '(hover: none)',
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })),
  )
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('removing a quest', () => {
  it('shows "Removed. Undo" in the log head and undo restores position and completion', async () => {
    const user = userEvent.setup()
    renderLog()
    const ledger = latest.ledger
    await user.click(screen.getByRole('button', { name: 'Remove B' }))
    expect(titles()).toEqual(['A', 'C'])
    const status = within(document.querySelector('.log-head') as HTMLElement).getByRole('status')
    expect(status).toHaveTextContent('Removed. Undo')
    expect(latest.ledger).toBe(ledger)

    await user.click(within(status).getByRole('button', { name: 'Undo' }))
    expect(titles()).toEqual(['A', 'B', 'C'])
    expect(screen.getByRole('checkbox', { name: 'B' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('checkbox', { name: 'B' })).toHaveFocus()
    expect(status).toHaveTextContent('')
    expect(latest.ledger).toBe(ledger)
    expect(latest.completions).toEqual({ [TODAY]: ['b'] })
  })

  it('a second "Removed." replaces the message node, so the status region announces it again', async () => {
    const user = userEvent.setup()
    renderLog()
    const status = within(document.querySelector('.log-head') as HTMLElement).getByRole('status')
    await user.click(screen.getByRole('button', { name: 'Remove A' }))
    const first = status.querySelector('.toast-text')
    expect(first).toHaveTextContent('Removed.')
    await user.click(screen.getByRole('button', { name: 'Remove C' }))
    const second = status.querySelector('.toast-text')
    expect(second).toHaveTextContent('Removed.')
    expect(second).not.toBe(first)
  })

  it('expires the undo message after about five seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderLog()
    await user.click(screen.getByRole('button', { name: 'Remove A' }))
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(4000))
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1200))
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
    expect(screen.queryByText('Removed.')).not.toBeInTheDocument()
    expect(titles()).toEqual(['B', 'C'])
  })

  it('is keyboard reachable and moves focus to the next checkbox, then to the add-quest input', async () => {
    const user = userEvent.setup()
    renderLog()
    screen.getByRole('checkbox', { name: 'B' }).focus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Edit B' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Remove B' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('checkbox', { name: 'C' })).toHaveFocus()
    await user.tab()
    await user.tab()
    await user.keyboard('{Enter}')
    expect(screen.getByLabelText('Quest title')).toHaveFocus()
    expect(titles()).toEqual(['A'])
  })
})

describe('touch (no hover)', () => {
  it('tapping a title selects its row; elsewhere or another row deselects; the checkbox only toggles', async () => {
    mockTouch()
    const user = userEvent.setup()
    renderLog()
    expect(document.querySelector('[data-selected]')).toBeNull()

    await user.click(screen.getByText('A'))
    expect(rowOf('A')).toHaveAttribute('data-selected')

    await user.click(screen.getByRole('checkbox', { name: 'A' }))
    expect(screen.getByRole('checkbox', { name: 'A' })).toHaveAttribute('aria-checked', 'true')
    expect(rowOf('A')).toHaveAttribute('data-selected')

    await user.click(screen.getByText('C'))
    expect(rowOf('A')).not.toHaveAttribute('data-selected')
    expect(rowOf('C')).toHaveAttribute('data-selected')

    await user.click(document.body)
    expect(document.querySelector('[data-selected]')).toBeNull()

    await user.click(screen.getByText('C'))
    await user.click(within(rowOf('C')).getByRole('button', { name: 'Remove C' }))
    expect(titles()).toEqual(['A', 'B'])
    expect(document.querySelector('[data-selected]')).toBeNull()
  })

  it('does not select rows on hover-capable devices', async () => {
    const user = userEvent.setup()
    renderLog()
    await user.click(screen.getByText('A'))
    expect(document.querySelector('[data-selected]')).toBeNull()
  })
})

describe('editing a quest', () => {
  const field = () => screen.getByRole<HTMLInputElement>('textbox', { name: 'Edit quest title' })

  it('puts Edit before Remove in one actions container', () => {
    renderLog()
    const actions = rowOf('A').querySelector('.row-actions')!
    expect(Array.from(actions.querySelectorAll('button')).map((b) => b.getAttribute('aria-label'))).toEqual(['Edit A', 'Remove A'])
  })

  it('Enter saves, keeps state, repeats and the ledger, and returns focus to the checkbox', async () => {
    const user = userEvent.setup()
    renderLog()
    const ledger = latest.ledger
    const completions = latest.completions
    await user.click(screen.getByRole('button', { name: 'Edit B' }))
    expect(field()).toHaveFocus()
    expect(field()).toHaveValue('B')
    expect([field().selectionStart, field().selectionEnd]).toEqual([0, 1])
    expect(field()).toHaveAttribute('maxLength', String(MAX_TITLE_LENGTH))
    expect(within(rowOf('B')).queryByRole('button', { name: /^(Edit|Remove)/ })).toBeNull()
    await user.keyboard('Bake bread{Enter}')
    expect(titles()).toEqual(['A', 'Bake bread', 'C'])
    expect(screen.getByRole('checkbox', { name: 'Bake bread' })).toHaveFocus()
    expect(screen.getByRole('checkbox', { name: 'Bake bread' })).toHaveAttribute('aria-checked', 'true')
    expect(latest.ledger).toBe(ledger)
    expect(latest.completions).toBe(completions)
    expect(latest.quests[1]).toEqual({ id: 'b', title: 'Bake bread', repeats: false, createdDay: TODAY })
  })

  it('blur saves and leaves focus where the user put it', async () => {
    const user = userEvent.setup()
    renderLog()
    await user.click(screen.getByRole('button', { name: 'Edit A' }))
    await user.keyboard('Arise')
    await user.click(screen.getByLabelText('Quest title'))
    expect(titles()).toEqual(['Arise', 'B', 'C'])
    expect(screen.getByLabelText('Quest title')).toHaveFocus()
    expect(rowOf('Arise')).toHaveAttribute('data-repeats')
    expect(within(rowOf('Arise')).getByText('repeats daily')).toBeInTheDocument()
  })

  it('Escape cancels, restores the title and stays inside the log', async () => {
    const user = userEvent.setup()
    renderLog()
    const onDocKey = vi.fn()
    document.addEventListener('keydown', onDocKey)
    await user.click(screen.getByRole('button', { name: 'Edit C' }))
    await user.keyboard('Something else{Escape}')
    document.removeEventListener('keydown', onDocKey)
    expect(onDocKey.mock.calls.filter(([e]) => (e as KeyboardEvent).key === 'Escape')).toHaveLength(0)
    expect(titles()).toEqual(['A', 'B', 'C'])
    expect(screen.queryByRole('textbox', { name: 'Edit quest title' })).toBeNull()
    expect(screen.getByRole('checkbox', { name: 'C' })).toHaveFocus()
  })

  it('Enter that ends an IME composition does not save the edit', async () => {
    const user = userEvent.setup()
    renderLog()
    await user.click(screen.getByRole('button', { name: 'Edit A' }))
    fireEvent.change(field(), { target: { value: 'にほん' } })
    fireEvent.keyDown(field(), { key: 'Enter', isComposing: true })
    expect(field()).toBeInTheDocument()
    expect(latest.quests[0].title).toBe('A')
    fireEvent.keyDown(field(), { key: 'Enter' })
    expect(latest.quests[0].title).toBe('にほん')
  })

  it('an empty edit keeps the original title', async () => {
    const user = userEvent.setup()
    renderLog()
    const before = latest
    await user.click(screen.getByRole('button', { name: 'Edit A' }))
    await user.clear(field())
    await user.keyboard('{Enter}')
    expect(titles()).toEqual(['A', 'B', 'C'])
    expect(latest).toBe(before)
  })

  it('the checkbox still works while editing', async () => {
    const user = userEvent.setup()
    renderLog()
    await user.click(screen.getByRole('button', { name: 'Edit A' }))
    await user.keyboard('A2')
    await user.click(screen.getByRole('checkbox', { name: 'A' }))
    expect(screen.getByRole('checkbox', { name: 'A2' })).toHaveAttribute('aria-checked', 'true')
  })

  it('only one row edits at a time: starting a second edit saves the first', async () => {
    const user = userEvent.setup()
    renderLog()
    await user.click(screen.getByRole('button', { name: 'Edit A' }))
    await user.keyboard('First')
    await user.click(screen.getByRole('button', { name: 'Edit C' }))
    expect(screen.getAllByRole('textbox', { name: 'Edit quest title' })).toHaveLength(1)
    expect(field()).toHaveValue('C')
    expect(titles()).toEqual(['First', 'B', 'C'])
  })

  it('drops the edit safely when the quest leaves the log, and Undo still works', async () => {
    const user = userEvent.setup()
    renderLog()
    await user.click(screen.getByRole('button', { name: 'Remove B' }))
    await user.click(screen.getByRole('button', { name: 'Edit C' }))
    await user.keyboard('Cee')
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(titles()).toEqual(['A', 'B', 'Cee'])
    expect(screen.getByRole('checkbox', { name: 'B' })).toHaveAttribute('aria-checked', 'true')
  })

  it('clears the editing state when the edited quest is removed from under it', () => {
    const { rerender } = renderLog()
    fireEvent.click(screen.getByRole('button', { name: 'Edit A' }))
    expect(field()).toBeInTheDocument()
    const next = { ...seeded(), quests: seeded().quests.filter((q) => q.id !== 'a') }
    rerender(
      <StoreProvider persist={false} initial={next} key="next">
        <QuestLog today={TODAY} />
        <Probe />
      </StoreProvider>,
    )
    expect(screen.queryByRole('textbox', { name: 'Edit quest title' })).toBeNull()
    expect(titles()).toEqual(['B', 'C'])
  })

  it('on touch, tapping a title reveals Edit and Remove for that row', async () => {
    mockTouch()
    const user = userEvent.setup()
    renderLog()
    await user.click(screen.getByText('B'))
    expect(rowOf('B')).toHaveAttribute('data-selected')
    await user.click(within(rowOf('B')).getByRole('button', { name: 'Edit B' }))
    expect(field()).toHaveValue('B')
    await user.keyboard('Bee{Enter}')
    expect(titles()).toEqual(['A', 'Bee', 'C'])
  })
})
