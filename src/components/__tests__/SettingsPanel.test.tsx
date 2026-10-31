import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { STORAGE_KEY, initialState, load } from '../../lib/storage'
import { StoreProvider } from '../../state/StoreProvider'
import type { AppState } from '../../state/types'
import { TimerContext } from '../../state/timerContext'
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

describe('Default timer', () => {
  it('sits between Night begins and Second hand, steps a minute and clamps at 1:00 and 60:00', async () => {
    const user = userEvent.setup()
    renderSettings({ defaultTimerSec: 120 })
    const labels = Array.from(document.querySelectorAll('.srow > span:first-child')).map((el) => el.textContent)
    expect(labels.slice(2, 5)).toEqual(['Night begins', 'Default timer', 'Second hand'])
    const group = screen.getByRole('group', { name: 'Default timer' })
    const shorter = within(group).getByRole('button', { name: 'Shorter' })
    const longer = within(group).getByRole('button', { name: 'Longer' })
    expect(group).toHaveTextContent('2:00')
    await user.click(shorter)
    expect(group).toHaveTextContent('1:00')
    await user.click(shorter)
    expect(group).toHaveTextContent('1:00') // no wrap
    expect(shorter).toHaveFocus()
    expect(shorter).not.toBeDisabled()
    await user.click(longer)
    expect(group).toHaveTextContent('2:00')
  })

  it('stops at 60:00', async () => {
    const user = userEvent.setup()
    renderSettings({ defaultTimerSec: 3540 })
    const group = screen.getByRole('group', { name: 'Default timer' })
    const longer = within(group).getByRole('button', { name: 'Longer' })
    await user.click(longer)
    expect(group).toHaveTextContent('60:00')
    await user.click(longer)
    expect(group).toHaveTextContent('60:00')
    expect(longer).toHaveFocus()
  })
})

const rowLabels = () => Array.from(document.querySelectorAll('.srow > span:first-child')).map((el) => el.textContent)

describe('Clock display', () => {
  it('sits after Clock labels, defaults to Blend and describes the selected mode', async () => {
    const user = userEvent.setup()
    renderSettings()
    const labels = rowLabels()
    expect(labels[labels.indexOf('Clock labels') + 1]).toBe('Clock display')
    const group = screen.getByRole('radiogroup', { name: 'Clock display' })
    expect(within(group).getAllByRole('radio').map((r) => r.textContent)).toEqual(['Blend', 'Hour only', 'Solid', 'Accent'])
    expect(within(group).getByRole('radio', { name: 'Blend' })).toHaveAttribute('aria-checked', 'true')
    const row = group.closest('.srow')!
    expect(row.querySelector('.srow-helper')).toHaveTextContent('Each hour fills in, and the current hour fades into the fill.')
    await user.click(within(group).getByRole('radio', { name: 'Hour only' }))
    expect(row.querySelector('.srow-helper')).toHaveTextContent('Only the current hour is lit.')
    expect(group).toHaveAccessibleDescription('Only the current hour is lit.')
    await user.click(within(group).getByRole('radio', { name: 'Solid' }))
    expect(row.querySelector('.srow-helper')).toHaveTextContent('Each hour fills in as one solid color.')
    await user.click(within(group).getByRole('radio', { name: 'Accent' }))
    expect(row.querySelector('.srow-helper')).toHaveTextContent('The current hour stands out in its own color.')
  })

  it('is one tab stop with arrows, Home and End', async () => {
    const user = userEvent.setup()
    renderSettings({ clockFill: 'solid' })
    const group = screen.getByRole('radiogroup', { name: 'Clock display' })
    const radios = within(group).getAllByRole('radio')
    expect(radios.filter((r) => r.tabIndex === 0)).toEqual([radios[2]])
    radios[2].focus()
    await user.keyboard('{ArrowRight}')
    expect(radios[3]).toHaveFocus()
    expect(radios[3]).toHaveAttribute('aria-checked', 'true')
    await user.keyboard('{ArrowRight}')
    expect(radios[0]).toHaveFocus()
    await user.keyboard('{End}')
    expect(radios[3]).toHaveAttribute('aria-checked', 'true')
    await user.keyboard('{Home}')
    expect(radios[0]).toHaveAttribute('aria-checked', 'true')
    await user.keyboard('{ArrowLeft}')
    expect(radios[3]).toHaveFocus()
  })

  it('persists the selection', async () => {
    localStorage.clear()
    const user = userEvent.setup()
    render(
      <StoreProvider initial={initialState()}>
        <SettingsPanel />
      </StoreProvider>,
    )
    await user.click(screen.getByRole('radio', { name: 'Hour only' }))
    await waitFor(() => expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').settings?.clockFill).toBe('hour'))
    expect(load().settings.clockFill).toBe('hour')
  })
})

describe('Lumens', () => {
  it('sits after Reduce motion, before Clear all data, with a helper only while Off', async () => {
    const user = userEvent.setup()
    renderSettings()
    const labels = rowLabels()
    expect(labels.at(-2)).toBe('Reduce motion')
    expect(labels.at(-1)).toBe('Lumens')
    const group = screen.getByRole('radiogroup', { name: 'Lumens' })
    const row = group.closest('.srow')!
    expect(within(group).getByRole('radio', { name: 'On' })).toHaveAttribute('aria-checked', 'true')
    expect(row.querySelector('.srow-helper')).toBeNull()
    within(group).getByRole('radio', { name: 'On' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(within(group).getByRole('radio', { name: 'Off' })).toHaveFocus()
    expect(within(group).getByRole('radio', { name: 'Off' })).toHaveAttribute('aria-checked', 'true')
    expect(row.querySelector('.srow-helper')).toHaveTextContent('Everything in your collection is unlocked.')
    expect(group).toHaveAccessibleDescription('Everything in your collection is unlocked.')
    await user.keyboard('{Home}')
    expect(within(group).getByRole('radio', { name: 'On' })).toHaveAttribute('aria-checked', 'true')
    expect(row.querySelector('.srow-helper')).toBeNull()
  })
})

describe('Clear all data dialog', () => {
  it('keeps focus where the user put it when the panel re-renders (a running timer ticks)', async () => {
    const user = userEvent.setup()
    const ui = (n: number) => (
      <StoreProvider persist={false}>
        <TimerContext.Provider value={{ n, reset() {} } as never}>
          <SettingsPanel />
        </TimerContext.Provider>
      </StoreProvider>
    )
    const { rerender } = render(ui(1))
    await user.click(screen.getByRole('button', { name: 'Clear all data' }))
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Clear everything' })).toHaveFocus()
    rerender(ui(2))
    expect(screen.getByRole('button', { name: 'Clear everything' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Clear all data' })).toHaveFocus()
  })

  it('does not mention lumens while Lumens is off', async () => {
    const user = userEvent.setup()
    renderSettings({ lumensEnabled: false })
    await user.click(screen.getByRole('button', { name: 'Clear all data' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Quests and your collection will be removed from this browser.')
    expect(screen.getByRole('dialog').textContent).not.toMatch(/lumen/i)
  })
})
