import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../components/App'
import { STORAGE_KEY, initialState } from '../lib/storage'
import { getSky, hourHue } from '../lib/skies'
import { hourLine, hourWord } from '../lib/time'

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the clock, hour word, quest log and rail', () => {
    render(<App persist={false} />)
    const hour = new Date().getHours()
    expect(screen.getByRole('img', { name: /^Clock showing/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: hourWord(hour) })).toBeInTheDocument()
    expect(screen.getByText(hourLine(hour))).toBeInTheDocument()
    expect(screen.getByText('Nothing on the log yet.')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Sections' })).toBeInTheDocument()
    // Two polite live regions: the minute time announcer and the log's toast slot.
    const statuses = screen.getAllByRole('status')
    expect(statuses).toHaveLength(2)
    expect(statuses.some((el) => /\d:\d\d/.test(el.textContent ?? ''))).toBe(true)
    const root = document.documentElement
    expect(root.style.getPropertyValue('--hour')).toMatch(/^#/)
    // --hour-lit is only set for skies that borrow their lit colour (Graphite).
    expect(root.style.getPropertyValue('--hour-lit')).toBe('')
    expect(root.style.getPropertyValue('--halo-x')).toMatch(/%$/)
    expect(root.dataset.theme).toMatch(/^(light|dark)$/)
    expect(screen.getByRole('list', { name: 'Last seven days' }).children).toHaveLength(7)
    expect(screen.getByRole('img', { name: '0 lumens' })).toBeInTheDocument()
  })

  it('adds, completes and removes a quest, earning lumens', async () => {
    const user = userEvent.setup()
    render(<App persist={false} />)
    await user.type(screen.getByLabelText('Quest title'), 'Water the plants{Enter}')
    const check = screen.getByRole('checkbox', { name: 'Water the plants' })
    expect(check).toHaveAttribute('aria-checked', 'false')
    await user.click(check)
    expect(check).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Cleared.')).toBeInTheDocument()
    // The toast takes the count's slot in the log head instead of adding a line (critique 02 m2).
    const status = screen.getByText('A clean day. +2 lumens.')
    expect(status).toHaveAttribute('role', 'status')
    expect(status.closest('.log-head')).not.toBeNull()
    expect(screen.getByRole('img', { name: '3 lumens' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Collection' }))
    const panel = screen.getByRole('complementary', { name: 'Collection' })
    expect(within(panel).getByText('You have 3 lumens, 3 earned in all.')).toBeInTheDocument()
    expect(within(panel).getByText('6 lumens')).toBeInTheDocument()
    expect(within(panel).queryByRole('button', { name: /Buy Hairline/ })).not.toBeInTheDocument()
    expect(within(panel).getAllByText('Equipped')).toHaveLength(2)

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Remove Water the plants' }))
    expect(screen.getByText('Nothing on the log yet.')).toBeInTheDocument()
  })

  it('sets --hour-lit from Daylight when Graphite is equipped', () => {
    const initial = initialState()
    render(<App persist={false} initial={{ ...initial, owned: { ...initial.owned, skies: ['daylight', 'graphite'] }, equipped: { ...initial.equipped, sky: 'graphite' } }} />)
    const hour = new Date().getHours()
    const root = document.documentElement
    expect(root.style.getPropertyValue('--hour')).toBe(hourHue(getSky('graphite'), hour))
    expect(root.style.getPropertyValue('--hour-lit')).toBe(hourHue(getSky('daylight'), hour))
    expect(root.dataset.sky).toBe('graphite')
  })

  it('buys and equips a dial once affordable', async () => {
    const user = userEvent.setup()
    render(<App persist={false} />)
    // Four quests cleared today: 4 × 1 + a clean day (2) = 6 lumens, exactly Hairline's price.
    for (const t of ['a', 'b', 'c', 'd']) await user.type(screen.getByLabelText('Quest title'), `${t}{Enter}`)
    for (const t of ['a', 'b', 'c', 'd']) await user.click(screen.getByRole('checkbox', { name: t }))
    expect(screen.getByRole('img', { name: '6 lumens' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Collection' }))
    const panel = screen.getByRole('complementary', { name: 'Collection' })
    await user.click(within(panel).getByRole('button', { name: 'Buy Hairline for 6 lumens' }))
    expect(screen.getByRole('img', { name: '0 lumens' })).toBeInTheDocument()
    await user.click(within(panel).getByRole('button', { name: 'Equip Hairline' }))
    expect(screen.getByRole('img', { name: /^Clock showing/ })).toHaveAttribute('data-dial', 'hairline')
    // The equipped dial moves into the live preview; Sector goes back into the list as owned.
    expect(panel.querySelector('.preview')).toHaveAttribute('data-dial', 'hairline')
    expect(within(panel).getByRole('button', { name: 'Equip Sector' })).toBeInTheDocument()
  })

  it('moves focus into the panel and back to the opener', async () => {
    const user = userEvent.setup()
    render(<App persist={false} />)
    const settingsButton = screen.getByRole('button', { name: 'Settings' })
    await user.click(settingsButton)
    const panel = screen.getByRole('complementary', { name: 'Settings' })
    expect(panel).toHaveFocus()
    expect(within(panel).getByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument()
    await user.click(within(panel).getByRole('radio', { name: 'Dark' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    const motion = within(panel).getByRole('radiogroup', { name: 'Reduce motion' })
    await user.click(within(motion).getByRole('radio', { name: 'On' }))
    expect(document.documentElement.dataset.reduceMotion).toBe('true')
    await user.click(within(motion).getByRole('radio', { name: 'Off' }))
    expect(document.documentElement.dataset.reduceMotion).toBeUndefined()
    await user.click(within(panel).getByRole('button', { name: 'Close' }))
    expect(settingsButton).toHaveFocus()
  })

  it('clears all data through the confirm dialog and persists', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Quest title'), 'Stretch{Enter}')
    await new Promise((r) => setTimeout(r, 300))
    expect(localStorage.getItem(STORAGE_KEY)).toContain('Stretch')

    await user.click(screen.getByRole('button', { name: 'Settings' }))
    await user.click(screen.getByRole('button', { name: 'Clear all data' }))
    const dialog = screen.getByRole('dialog', { name: 'Clear all data?' })
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    await user.click(within(dialog).getByRole('button', { name: 'Clear everything' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Nothing on the log yet.')).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 300))
    expect(localStorage.getItem(STORAGE_KEY) ?? '').not.toContain('Stretch')
  })
})
