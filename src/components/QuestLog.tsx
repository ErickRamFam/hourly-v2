import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  MAX_TITLE_LENGTH,
  dayProgress,
  isDone,
  questsForDay,
  removedQuest,
  toggleQuest,
  type RemovedQuest,
} from '../lib/quests'
import { useMediaQuery } from '../state/useMediaQuery'
import { useAppState, useDispatch } from '../state/useStore'

const TOAST_MS = 3200
const UNDO_MS = 5000
const FLOAT_MS = 900

type Preview = { quest: number; cleanDay: boolean }
/** One message at a time in the log head's toast slot; `removed` makes it the undo toast. */
type Toast = { key: number; text: string; removed?: RemovedQuest }

export function QuestLog({ today }: { today: string }) {
  const { quests, completions, ledger } = useAppState()
  const dispatch = useDispatch()
  const [title, setTitle] = useState('')
  const [repeats, setRepeats] = useState(false)
  const [justChecked, setJustChecked] = useState<string | null>(null)
  const [float, setFloat] = useState<{ id: string; key: number } | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  // Touch screens have no hover: tapping a title selects its row, which reveals "Remove".
  const touch = useMediaQuery('(hover: none)')
  const [selected, setSelected] = useState<string | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastKey = useRef(0)
  const floatKey = useRef(0)
  const rowsRef = useRef<HTMLUListElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const checks = useRef(new Map<string, HTMLButtonElement>())
  /** Where focus goes once the next render lands: a quest's checkbox, or the add-quest input. */
  const focusAfter = useRef<{ quest: string } | 'input' | null>(null)

  useEffect(() => {
    const list = timers.current
    const toastTimers = toastTimer
    return () => {
      list.forEach(clearTimeout)
      if (toastTimers.current !== null) clearTimeout(toastTimers.current)
    }
  }, [])

  useEffect(() => {
    const target = focusAfter.current
    if (target === null) return
    focusAfter.current = null
    if (target === 'input') inputRef.current?.focus()
    else checks.current.get(target.quest)?.focus()
  })

  // Tapping anywhere outside the selected row deselects it (another row's tap then selects that one).
  useEffect(() => {
    if (selected === null) return
    const onDown = (e: PointerEvent) => {
      const row = rowsRef.current?.querySelector('[data-selected]')
      if (row && e.target instanceof Node && row.contains(e.target)) return
      setSelected(null)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [selected])

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms))
  }

  /** (Re)starts the expiry of toast `key`; a newer toast is never cleared by an older timer. */
  const expireToast = (key: number, ms: number) => {
    if (toastTimer.current !== null) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => {
      toastTimer.current = null
      setToast((t) => (t && t.key === key ? null : t))
    }, ms)
  }

  const holdToast = () => {
    if (toastTimer.current !== null) clearTimeout(toastTimer.current)
    toastTimer.current = null
  }

  const showToast = (next: Omit<Toast, 'key'>, ms: number) => {
    toastKey.current += 1
    setToast({ ...next, key: toastKey.current })
    expireToast(toastKey.current, ms)
  }

  const todays = questsForDay(quests, today)
  const progress = dayProgress(quests, completions, today)
  const cleared = progress.total > 0 && progress.done === progress.total

  /** What the toggle will award, computed with the same pure function the reducer uses. */
  const preview = (id: string, now: number): Preview => {
    const next = toggleQuest(quests, completions, ledger, today, id, now)
    const added = next.ledger.slice(ledger.length)
    return { quest: added.filter((e) => e.reason === 'quest').length, cleanDay: added.some((e) => e.reason === 'clean-day') }
  }

  const onToggle = (id: string, now: number) => {
    const wasDone = isDone(completions, today, id)
    const award = wasDone ? null : preview(id, now)
    dispatch({ type: 'toggleQuest', id, now })
    if (wasDone) {
      setJustChecked(null)
      return
    }
    setJustChecked(id)
    if (award && award.quest > 0) {
      floatKey.current += 1
      setFloat({ id, key: floatKey.current })
      later(() => setFloat((f) => (f && f.id === id ? null : f)), FLOAT_MS)
    }
    if (award && award.cleanDay) {
      showToast({ text: 'A clean day. +2 lumens.' }, TOAST_MS)
    }
  }

  const onRemove = (id: string) => {
    const removed = removedQuest(quests, completions, id)
    if (!removed) return
    const next = todays[todays.findIndex((q) => q.id === id) + 1]
    // Focus follows the log: the next row's checkbox, else the add-quest input. Not the input on
    // touch, where focusing it would raise the on-screen keyboard after a tap.
    focusAfter.current = next ? { quest: next.id } : touch ? null : 'input'
    setSelected(null)
    dispatch({ type: 'removeQuest', id })
    showToast({ text: 'Removed.', removed }, UNDO_MS)
  }

  const onUndo = (removed: RemovedQuest) => {
    holdToast()
    toastKey.current += 1
    setToast(null)
    dispatch({ type: 'restoreQuest', removed })
    focusAfter.current = { quest: removed.quest.id }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    dispatch({ type: 'addQuest', title: trimmed, repeats, now: Date.now() })
    setTitle('')
    setRepeats(false)
  }

  return (
    <div className="quest-log">
      <div className="log-head flex items-baseline justify-between pb-3">
        <h2 id="log-title" className="m-0 font-serif text-title font-normal text-ink">
          Today&rsquo;s log
        </h2>
        {/* The toasts (clean day; "Removed. Undo") take the count's place and crossfade back: no new
            line box (critique 02 m2). The faded count (opacity < 1 paints on top) lets taps through to Undo. */}
        <span className="count-slot grid justify-items-end text-numeral font-medium tracking-[0.01em] tabular-nums" data-cleared={cleared || undefined}>
          <span className={`count col-start-1 row-start-1 text-slate transition-opacity duration-200 ${toast ? 'pointer-events-none opacity-0' : 'opacity-100'}`} aria-hidden={toast ? true : undefined}>
            {progress.total === 0 ? '' : cleared ? 'Cleared.' : `${progress.done} of ${progress.total}`}
          </span>
          <span className={`toast-slot col-start-1 row-start-1 text-hour-ink transition-opacity duration-200 ${toast ? 'opacity-100' : 'opacity-0'}`} role="status">
            {toast?.text ?? ''}
            {toast?.removed && (
              <>
                {' '}
                {/* Held while focused, so a keyboard user is not raced by the 5s expiry. */}
                <button
                  type="button"
                  className="undo font-semibold"
                  onClick={() => toast.removed && onUndo(toast.removed)}
                  onFocus={holdToast}
                  onBlur={() => {
                    if (toastKey.current === toast.key) expireToast(toast.key, UNDO_MS)
                  }}
                >
                  Undo
                </button>
              </>
            )}
          </span>
        </span>
      </div>

      {todays.length === 0 ? (
        <p className="quest-empty m-0 py-3 text-body text-slate">Nothing on the log yet.</p>
      ) : (
        <ul ref={rowsRef} className="rows m-0 list-none p-0" aria-label="Quests for today">
          {todays.map((q) => {
            const done = isDone(completions, today, q.id)
            const animate = justChecked === q.id && done
            return (
              <li
                key={q.id}
                className="row relative flex min-h-[52px] items-start gap-3.5"
                data-done={done || undefined}
                data-repeats={q.repeats || undefined}
                data-selected={(touch && selected === q.id) || undefined}
              >
                <span className="check-wrap relative flex-none">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    aria-label={q.title}
                    ref={(el) => {
                      if (el) checks.current.set(q.id, el)
                      else checks.current.delete(q.id)
                    }}
                    className={`check grid size-[22px] place-items-center rounded-check ${animate ? 'check-fill' : ''}`}
                    onClick={() => onToggle(q.id, Date.now())}
                  >
                    <svg viewBox="0 0 14 14" width={14} height={14} aria-hidden="true">
                      <path
                        className={animate ? 'check-draw' : undefined}
                        d="M2.5 7.5l3 3 6-7"
                        fill="none"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  {float && float.id === q.id && (
                    <span key={float.key} className="lumen-float lumen-rise" aria-hidden="true">
                      +1
                    </span>
                  )}
                </span>
                <span
                  className={`qtitle flex-1 text-quest font-[450] ${done ? 'text-slate' : 'text-ink'}`}
                  onClick={touch ? () => setSelected((s) => (s === q.id ? null : q.id)) : undefined}
                >
                  {q.title}
                </span>
                {q.repeats && (
                  <span className="meta text-small font-medium text-pewter">repeats daily</span>
                )}
                <button
                  type="button"
                  className="remove text-small font-medium text-pewter"
                  aria-label={`Remove ${q.title}`}
                  onClick={() => onRemove(q.id)}
                >
                  Remove
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <form className="add relative mt-4 flex flex-wrap items-center gap-2" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="quest-title">
          Quest title
        </label>
        <div className="well flex h-11 flex-1 basis-full items-center rounded-control bg-surface px-3.5">
          <input
            id="quest-title"
            ref={inputRef}
            className="h-full w-full flex-1 text-body text-ink"
            type="text"
            value={title}
            maxLength={MAX_TITLE_LENGTH}
            placeholder="Add a quest"
            autoComplete="off"
            enterKeyHint="done"
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="chip press rounded-pill px-2.5 py-1 text-small font-medium text-slate"
          aria-pressed={repeats}
          onClick={() => setRepeats((r) => !r)}
        >
          Repeats daily
        </button>
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">
          Add
        </button>
      </form>
    </div>
  )
}
