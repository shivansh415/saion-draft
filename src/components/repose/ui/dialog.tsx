import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef } from 'react'
import type { ComponentProps, MouseEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * The dialog the lifestyle chapter's panels are built on — the chapter menu,
 * the enquiry details and the two amenity readouts.
 *
 * Written here rather than pulled from a component library on purpose. The
 * library's dialog brings its own scroll lock (`react-remove-scroll`), which
 * holds the page still by putting `overflow: hidden` on the document — the one
 * thing `lib/scrollLock` deliberately does not do, because with a sticky
 * chapter viewport Chrome answers any scroll-into-view request inside an
 * overflow-hidden root by scrolling to the very top. The page already has one
 * counted scroll lock; the chapter takes it while a panel is open, and this
 * dialog does not compete with it.
 *
 * What it does provide, because a panel over the whole experience must:
 *
 *   portal       to the document, so the panel is not clipped by the chapter's
 *                `overflow-x: clip` and sits above every pinned section
 *   inert rest   the application root is inert while a panel is open, so
 *                nothing behind it can be reached, read out or focused
 *   focus        the panel takes focus on opening, Tab cycles inside it, and
 *                the control that opened it gets focus back on closing
 *   escape       Escape closes, from anywhere inside
 *   dismiss      a press on the ground outside the panel closes it
 *
 * The panel opts into its own scrolling: `data-lenis-prevent` keeps Lenis off
 * it, and `data-scroll-lock-allow` is what the page's lock reads to leave a
 * wheel or a drag inside it alone (see `lib/scrollLock`).
 *
 * Every visual decision stays in `styles/experience.css`, which keys on the
 * `data-slot` attributes below.
 */

interface DialogState {
  close: () => void
  titleId: string
  descriptionId: string
}

const DialogContext = createContext<DialogState | null>(null)

function useDialog(): DialogState {
  const state = useContext(DialogContext)
  if (!state) throw new Error('A dialog part was rendered outside <Dialog>.')
  return state
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const focusableIn = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element.offsetWidth > 0 || element.offsetHeight > 0 || element === document.activeElement,
  )

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  const id = useId()
  const close = useCallback(() => onOpenChange(false), [onOpenChange])
  const state = useMemo(
    () => ({ close, titleId: `${id}title`, descriptionId: `${id}description` }),
    [close, id],
  )

  return (
    <DialogContext.Provider value={state}>{open ? children : null}</DialogContext.Provider>
  )
}

type DialogContentProps = ComponentProps<'div'> & { showCloseButton?: boolean }

function DialogContent({ children, showCloseButton = true, ...props }: DialogContentProps) {
  const { close, titleId, descriptionId } = useDialog()
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null

    // Everything behind the panel stands down: not reachable by pointer, by
    // keyboard, or by a screen reader. The panel itself is portalled outside
    // this subtree, so it keeps working.
    const app = document.getElementById('root')
    app?.setAttribute('inert', '')
    app?.setAttribute('aria-hidden', 'true')

    // The panel first, not its first control: a panel that opens with its
    // close button already focused reads as if it is asking to be dismissed.
    panel.focus({ preventScroll: true })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        close()
        return
      }
      if (event.key !== 'Tab') return

      // `inert` already keeps focus out of the application behind the panel;
      // this keeps it out of the browser's own chrome as well, so a panel is
      // never tabbed out of by accident.
      const stops = focusableIn(panel)
      if (stops.length === 0) {
        event.preventDefault()
        return
      }
      const first = stops[0]
      const last = stops[stops.length - 1]
      const active = document.activeElement
      if (!event.shiftKey && (active === last || active === panel)) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault()
        last.focus()
      }
    }

    panel.addEventListener('keydown', onKeyDown)

    return () => {
      panel.removeEventListener('keydown', onKeyDown)
      app?.removeAttribute('inert')
      app?.removeAttribute('aria-hidden')
      // Back to the control that asked for the panel, so the journey does not
      // lose its place. `preventScroll` matters: the chapter may already be
      // gliding somewhere else by now.
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [close])

  const onGroundPress = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) close()
  }

  return createPortal(
    <>
      <div data-slot="dialog-overlay" onMouseDown={onGroundPress} />
      <div
        {...props}
        ref={panelRef}
        data-slot="dialog-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        data-lenis-prevent=""
        data-scroll-lock-allow=""
      >
        {children}
        {showCloseButton && (
          <DialogClose aria-label="Close">
            <span aria-hidden="true">×</span>
          </DialogClose>
        )}
      </div>
    </>,
    document.body,
  )
}

function DialogClose({ onClick, ...props }: ComponentProps<'button'>) {
  const { close } = useDialog()
  return (
    <button
      type="button"
      {...props}
      data-slot="dialog-close"
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) close()
      }}
    />
  )
}

function DialogTitle(props: ComponentProps<'h2'>) {
  const { titleId } = useDialog()
  return <h2 {...props} id={titleId} data-slot="dialog-title" />
}

function DialogDescription(props: ComponentProps<'p'>) {
  const { descriptionId } = useDialog()
  return <p {...props} id={descriptionId} data-slot="dialog-description" />
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle }
