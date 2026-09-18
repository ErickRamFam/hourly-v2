import { useEffect, useRef, useState } from 'react'
import { useMediaQuery } from '../state/useMediaQuery'
import { useAppState, useDispatch, useLumens } from '../state/useStore'
import type { Panel } from '../state/types'
import { CollectionPanel } from './CollectionPanel'
import { SettingsPanel } from './SettingsPanel'

type OpenPanel = Exclude<Panel, 'none'>

const PANEL_TITLES: Record<OpenPanel, string> = { collection: 'Collection', settings: 'Settings' }
const CLOSE_MS = 200

function TodayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}
/** A dial and its lit hour (DESIGN.md §8): circle r 8.5, a 3px lit arc 10→11, a dot at 315°. */
function CollectionIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M4.64 7.75 A8.5 8.5 0 0 1 7.75 4.64" stroke="var(--hour-fill)" strokeWidth="3" />
      <circle cx="9.17" cy="9.17" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}
function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="9" cy="7" r="2" fill="var(--paper)" />
      <circle cx="15" cy="12" r="2" fill="var(--paper)" />
      <circle cx="8" cy="17" r="2" fill="var(--paper)" />
    </svg>
  )
}

export function Rail() {
  const { ui } = useAppState()
  const dispatch = useDispatch()
  const { balance } = useLumens()
  const panel = ui.panel
  const narrow = useMediaQuery('(max-width: 760px)')

  // The panel stays mounted for its exit animation: `lastOpen` remembers what to draw while closing.
  const [lastOpen, setLastOpen] = useState<OpenPanel | null>(panel === 'none' ? null : panel)
  const [closing, setClosing] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current)
  }, [])
  const shown: OpenPanel | null = panel !== 'none' ? panel : closing ? lastOpen : null

  // Focus moves into the panel when it opens and back to the opener when it closes.
  const panelRef = useRef<HTMLElement>(null)
  const returnTo = useRef<HTMLElement | null>(null)
  const previous = useRef<Panel>(panel)
  useEffect(() => {
    const was = previous.current
    previous.current = panel
    if (panel !== 'none') {
      if (was === 'none') returnTo.current = document.activeElement as HTMLElement | null
      panelRef.current?.focus()
    } else if (was !== 'none') {
      returnTo.current?.focus()
      returnTo.current = null
    }
  }, [panel])


  const close = () => {
    if (panel === 'none') return
    dispatch({ type: 'setPanel', panel: 'none' })
    setClosing(true)
    if (closeTimer.current !== null) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null
      setClosing(false)
    }, CLOSE_MS)
  }
  const open = (target: OpenPanel) => {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current)
    closeTimer.current = null
    setClosing(false)
    setLastOpen(target)
    dispatch({ type: 'setPanel', panel: target })
  }
  const toggle = (target: OpenPanel) => (panel === target ? close() : open(target))
  const lumenLabel = balance === 1 ? '1 lumen' : `${balance} lumens`

  const items: { id: Panel; label: string; icon: React.ReactNode }[] = [
    { id: 'none', label: 'Today', icon: <TodayIcon /> },
    { id: 'collection', label: 'Collection', icon: <CollectionIcon /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
  ]

  const closeRef = useRef(close)
  useEffect(() => {
    closeRef.current = close
  })

  const enterClass = narrow ? 'sheet-in' : 'panel-in'

  useEffect(() => {
    if (panel === 'none') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [panel])

  return (
    <>
      {shown && !closing && <div className="scrim pointer-events-none fixed inset-0 z-10" aria-hidden="true" />}
      {shown && (
        <aside
          ref={panelRef}
          id="rail-panel"
          className={`panel glass fixed z-20 flex flex-col overflow-y-auto ${closing ? 'panel-out' : enterClass}`}
          aria-labelledby="rail-panel-title"
          aria-hidden={closing || undefined}
          tabIndex={-1}
        >
          <div className="panel-head flex items-baseline justify-between">
            <h2 id="rail-panel-title" className="m-0 font-serif text-title font-normal text-ink">
              {PANEL_TITLES[shown]}
            </h2>
            <button type="button" className="close grid size-7 place-items-center rounded-control text-[22px] leading-none text-slate hover-wash" aria-label="Close" onClick={close}>
              ×
            </button>
          </div>
          {shown === 'collection' ? <CollectionPanel /> : <SettingsPanel />}
        </aside>
      )}
      <nav
        className="rail fixed inset-y-0 right-0 z-30 flex flex-col items-center"
        aria-label="Sections"
      >
        {items.map((item) => {
          const active = panel === item.id
          return (
            <button
              key={item.label}
              type="button"
              className={`rail-btn press hover-wash grid place-items-center rounded-control ${active ? 'active' : ''}`}
              aria-label={item.label}
              title={item.label}
              aria-pressed={active}
              aria-expanded={item.id === 'none' ? undefined : active}
              aria-controls={item.id === 'none' ? undefined : 'rail-panel'}
              onClick={() => (item.id === 'none' ? close() : toggle(item.id))}
            >
              {item.icon}
            </button>
          )
        })}
        {/* The balance is the count with the rail's own lit dot above it, not a badge (§8, critique 02 n6). */}
        <span
          className="lumens mt-auto flex flex-col items-center gap-1.5 text-small leading-none font-medium tabular-nums text-slate"
          title={lumenLabel}
          aria-label={lumenLabel}
          role="img"
        >
          <i className="lumen-dot block size-1 rounded-pill bg-hour-fill" aria-hidden="true" />
          {balance}
        </span>
      </nav>
    </>
  )
}
