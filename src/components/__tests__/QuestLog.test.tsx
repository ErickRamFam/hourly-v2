import { useEffect } from 'react'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
    expect(screen.getByRole('button', { name: 'Remove B' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('checkbox', { name: 'C' })).toHaveFocus()
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
