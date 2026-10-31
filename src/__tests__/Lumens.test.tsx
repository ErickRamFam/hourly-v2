import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../components/App'
import { DIALS } from '../lib/dials'
import { SKIES } from '../lib/skies'
import { STORAGE_KEY, initialState, load } from '../lib/storage'
import type { AppState } from '../state/types'

const rail = () => screen.getByRole('navigation', { name: 'Sections' })
const clock = () => screen.getByRole('img', { name: /^Clock showing/ })
const lumensOff = (): AppState => ({ ...initialState(), settings: { ...initialState().settings, lumensEnabled: false } })

async function openPanel(user: ReturnType<typeof userEvent.setup>, name: 'Collection' | 'Settings') {
  await user.click(within(rail()).getByRole('button', { name }))
  return screen.getByRole('complementary', { name })
}

beforeEach(() => {
  localStorage.clear()
})

describe('Lumens off', () => {
  it('removes every lumen number and message from the DOM, but keeps Cleared and the count', async () => {
    const user = userEvent.setup()
    render(<App persist={false} initial={lumensOff()} />)
    expect(within(rail()).queryByRole('img')).toBeNull()
    expect(document.querySelector('.lumens')).toBeNull()
    await user.type(screen.getByLabelText('Quest title'), 'a{Enter}')
    await user.type(screen.getByLabelText('Quest title'), 'b{Enter}')
    expect(screen.getByText('0 of 2')).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'a' }))
    expect(document.querySelector('.lumen-float')).toBeNull()
    expect(screen.getByText('1 of 2')).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'b' }))
    expect(screen.getByText('A clean day.')).toBeInTheDocument()
    expect(screen.getByText('Cleared.')).toBeInTheDocument()
    const panel = await openPanel(user, 'Collection')
    expect(panel.querySelector('.balance')).toBeNull()
    expect(document.body.textContent).not.toMatch(/lumen|\+1|\+2/i)
    expect(screen.queryAllByRole('button', { name: /^Buy / })).toHaveLength(0)
  })

  it('a clean-day toast shown while on drops "+2 lumens" as soon as lumens go off', async () => {
    const user = userEvent.setup()
    render(<App persist={false} />)
    await user.type(screen.getByLabelText('Quest title'), 'a{Enter}')
    await user.click(screen.getByRole('checkbox', { name: 'a' }))
    expect(screen.getByText('A clean day. +2 lumens.')).toBeInTheDocument()
    const settings = await openPanel(user, 'Settings')
    await user.click(within(within(settings).getByRole('radiogroup', { name: 'Lumens' })).getByRole('radio', { name: 'Off' }))
    expect(screen.queryByText('A clean day. +2 lumens.')).toBeNull()
    expect(screen.getByText('A clean day.')).toBeInTheDocument()
    expect(document.querySelector('.lumen-float')).toBeNull()
  })

  it('shows Equip on every dial and sky, and equips a locked one for free', async () => {
    const user = userEvent.setup()
    render(<App persist={false} initial={lumensOff()} />)
    const panel = await openPanel(user, 'Collection')
    for (const d of DIALS.filter((d) => d.id !== 'lantern')) expect(within(panel).getByRole('button', { name: `Equip ${d.name}` })).toBeInTheDocument()
    for (const s of SKIES.filter((s) => s.id !== 'daylight')) expect(within(panel).getByRole('button', { name: `Equip ${s.name}` })).toBeInTheDocument()
    expect(panel.querySelectorAll('.locked, [data-status="locked"]')).toHaveLength(0)
    await user.click(within(panel).getByRole('button', { name: 'Equip Orbit' }))
    expect(clock()).toHaveAttribute('data-dial', 'orbit')
    expect(panel.querySelector('.preview')).toHaveAttribute('data-dial', 'orbit')
  })

  it('keeps earning silently, and the balance is right when turned back on', async () => {
    const user = userEvent.setup()
    render(<App persist={false} initial={lumensOff()} />)
    await user.type(screen.getByLabelText('Quest title'), 'a{Enter}')
    await user.click(screen.getByRole('checkbox', { name: 'a' }))
    const settings = await openPanel(user, 'Settings')
    await user.click(within(within(settings).getByRole('radiogroup', { name: 'Lumens' })).getByRole('radio', { name: 'On' }))
    expect(within(rail()).getByRole('img', { name: '3 lumens' })).toBeInTheDocument()
  })
})

describe('Lumens back on', () => {
  it('resets an unbought dial and sky to the defaults at once, and a reload keeps the reset', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App initial={lumensOff()} />)
    let panel = await openPanel(user, 'Collection')
    await user.click(within(panel).getByRole('button', { name: 'Equip Sector' }))
    await user.click(within(panel).getByRole('button', { name: 'Equip Tide' }))
    expect(clock()).toHaveAttribute('data-dial', 'sector')
    expect(document.documentElement.dataset.sky).toBe('tide')

    const settings = await openPanel(user, 'Settings')
    await user.click(within(within(settings).getByRole('radiogroup', { name: 'Lumens' })).getByRole('radio', { name: 'On' }))
    expect(clock()).toHaveAttribute('data-dial', 'lantern')
    expect(document.documentElement.dataset.sky).toBe('daylight')
    panel = await openPanel(user, 'Collection')
    expect(panel.querySelector('.preview')).toHaveAttribute('data-dial', 'lantern')
    expect(panel.querySelector('[data-status="locked"]')).not.toBeNull() // priced and locked again
    expect(within(panel).queryByRole('button', { name: 'Equip Sector' })).toBeNull()
    expect(within(panel).getByText(/^You have 0 lumens/)).toBeInTheDocument()

    await waitFor(() => expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').settings?.lumensEnabled).toBe(true))
    unmount()
    expect(load().equipped).toEqual({ dial: 'lantern', sky: 'daylight' })
    render(<App />)
    expect(clock()).toHaveAttribute('data-dial', 'lantern')
  })

  it('a reload while off keeps the free pick', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App initial={lumensOff()} />)
    const panel = await openPanel(user, 'Collection')
    await user.click(within(panel).getByRole('button', { name: 'Equip Rays' }))
    await waitFor(() => expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').equipped?.dial).toBe('rays'))
    unmount()
    render(<App />)
    expect(clock()).toHaveAttribute('data-dial', 'rays')
  })

  it('Clear all data turns lumens back on', async () => {
    const user = userEvent.setup()
    render(<App persist={false} initial={lumensOff()} />)
    const settings = await openPanel(user, 'Settings')
    await user.click(within(settings).getByRole('button', { name: 'Clear all data' }))
    await user.click(screen.getByRole('button', { name: 'Clear everything' }))
    expect(within(rail()).getByRole('img', { name: '0 lumens' })).toBeInTheDocument()
  })
})
