import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { initialState } from '../../lib/storage'
import { StoreProvider } from '../../state/StoreProvider'
import type { AppState } from '../../state/types'
import { SettingsPanel } from '../SettingsPanel'

function renderSettings(patch: Partial<AppState['settings']> = {}) {
  const base = initialState()
  return render(
    <StoreProvider persist={false} initial={{ ...base, settings: { ...base.settings, ...patch } }}>
      <SettingsPanel />
    </StoreProvider>,
  )
}

describe('Settings radiogroups (roving tabindex)', () => {
  it('makes each group a single tab stop on its checked option', async () => {
    const user = userEvent.setup()
    renderSettings()
    await user.tab()
    expect(screen.getByRole('radio', { name: 'Auto' })).toHaveFocus()
    // Next tab leaves the Theme group entirely: the Day begins stepper's first button.
    await user.tab()
    expect(screen.getByRole('group', { name: 'Day begins' }).contains(document.activeElement)).toBe(true)
    const theme = screen.getByRole('radiogroup', { name: 'Theme' })
    const tabbable = within(theme)
      .getAllByRole('radio')
      .filter((r) => r.tabIndex === 0)
    expect(tabbable).toHaveLength(1)
  })

  it('moves selection and focus together with the arrow keys, wrapping, and Home/End', async () => {
    const user = userEvent.setup()
    renderSettings()
    const theme = screen.getByRole('radiogroup', { name: 'Theme' })
    const auto = within(theme).getByRole('radio', { name: 'Auto' })
    const light = within(theme).getByRole('radio', { name: 'Light' })
    const dark = within(theme).getByRole('radio', { name: 'Dark' })
    auto.focus()

    await user.keyboard('{ArrowRight}')
    expect(light).toHaveFocus()
    expect(light).toHaveAttribute('aria-checked', 'true')
    expect(light).toHaveAttribute('tabindex', '0')
    expect(auto).toHaveAttribute('tabindex', '-1')
    expect(document.documentElement.dataset.theme).toBeUndefined() // no useHourHue here; state is what matters

    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(auto).toHaveFocus()
    expect(auto).toHaveAttribute('aria-checked', 'true')

    await user.keyboard('{ArrowLeft}')
    expect(dark).toHaveFocus()
    expect(dark).toHaveAttribute('aria-checked', 'true')

    await user.keyboard('{Home}')
    expect(auto).toHaveAttribute('aria-checked', 'true')
    await user.keyboard('{End}')
    expect(dark).toHaveAttribute('aria-checked', 'true')
  })

  it('offers Reduce motion as Off / On in the same control', async () => {
    const user = userEvent.setup()
    renderSettings()
    const motion = screen.getByRole('radiogroup', { name: 'Reduce motion' })
    const off = within(motion).getByRole('radio', { name: 'Off' })
    expect(off).toHaveAttribute('aria-checked', 'true')
    off.focus()
    await user.keyboard('{ArrowRight}')
    expect(within(motion).getByRole('radio', { name: 'On' })).toHaveAttribute('aria-checked', 'true')
  })
})

describe('day/night steppers', () => {
  it('follow the 12h setting', () => {
    renderSettings({ use24h: false, dayStart: 6, nightStart: 19 })
    expect(within(screen.getByRole('group', { name: 'Day begins' })).getByText('6 am')).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Night begins' })).getByText('7 pm')).toBeInTheDocument()
  })

  it('follow the 24h setting', () => {
    renderSettings({ use24h: true, dayStart: 6, nightStart: 19 })
    expect(within(screen.getByRole('group', { name: 'Day begins' })).getByText('6:00')).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Night begins' })).getByText('19:00')).toBeInTheDocument()
  })

  it('switch label format live when Clock labels changes, and step by an hour with wrap', async () => {
    const user = userEvent.setup()
    renderSettings({ use24h: false, dayStart: 23, nightStart: 19 })
    const day = screen.getByRole('group', { name: 'Day begins' })
    expect(within(day).getByText('11 pm')).toBeInTheDocument()
    await user.click(within(day).getByRole('button', { name: 'Later' }))
    expect(within(day).getByText('12 am')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: '24h' }))
    expect(within(day).getByText('0:00')).toBeInTheDocument()
  })
})
