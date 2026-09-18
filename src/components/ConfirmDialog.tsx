import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

export type ConfirmDialogProps = {
  title: string
  body: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

/** Centered confirm (DESIGN.md §7): opaque paper, dialog shadow, backdrop; Escape cancels; focus returns to the opener. */
export function ConfirmDialog({ title, body, confirmLabel, cancelLabel = 'Cancel', onConfirm, onCancel }: ConfirmDialogProps) {
  const titleId = useId()
  const bodyId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCancel()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      opener?.focus()
    }
  }, [onCancel])

  return createPortal(
    <div className="dialog-in fixed inset-0 z-40 grid place-items-center p-4">
      <div className="fixed inset-0 bg-[var(--dialog-backdrop)]" onClick={onCancel} aria-hidden="true" />
      <div
        className="dialog relative w-[360px] max-w-[calc(100vw-32px)] rounded-dialog bg-paper px-6 pt-6 pb-5 shadow-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
      >
        <h2 id={titleId} className="m-0 font-serif text-title font-normal text-ink">
          {title}
        </h2>
        <p id={bodyId} className="mt-2 mb-0 text-body text-slate">
          {body}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button ref={cancelRef} type="button" className="press hover-wash inline-flex h-10 items-center rounded-control px-3.5 text-[15px] font-medium text-slate" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="press inline-flex h-10 items-center rounded-control bg-ink px-3.5 text-[15px] font-medium text-paper" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
