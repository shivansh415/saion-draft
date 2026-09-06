import type Lenis from 'lenis'

/**
 * A single, counted scroll lock shared by anything that needs the page held
 * still — the floorplate view uses it so a wheel over a plan never rewinds the
 * film underneath.
 *
 * Deliberately NOT `overflow: hidden` on the root: with the chapter's sticky
 * viewport, Chrome answers any scroll-into-view request (a focus, a click
 * helper) on an element inside an overflow-hidden root by scrolling the page
 * to the top, which would rewind the whole film behind the plan. Instead the
 * lock holds the position itself:
 *
 *   - Lenis is stopped, which swallows wheel and touch input (except inside
 *     `data-lenis-prevent`, which Lenis leaves alone);
 *   - wheel and single-finger touch are also cancelled directly, for the
 *     reduced-motion path that runs without Lenis — except inside
 *     `data-scroll-lock-allow`, and never a pinch;
 *   - the scrolling keys are cancelled;
 *   - and should anything still move the page, the very next scroll event
 *     puts it back where it was.
 */

let lenis: Lenis | null = null
let holds = 0
let heldAt = 0
let releaseListeners: (() => void) | null = null

const SCROLL_KEYS = new Set([' ', 'Spacebar', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'])

export function registerSmoothScroll(instance: Lenis | null): void {
  lenis = instance
  if (holds > 0 && lenis) lenis.stop()
}

/**
 * The one Lenis instance the page runs on (null under reduced motion, where
 * the page scrolls natively). Chapters that need to move the page — the
 * lifestyle chapter's navigation and its return to the building — go through
 * this rather than creating a smoothing layer of their own.
 */
export function getSmoothScroll(): Lenis | null {
  return lenis
}

export function lockScroll(): void {
  holds += 1
  if (holds === 1) engage()
}

export function unlockScroll(): void {
  holds = Math.max(0, holds - 1)
  if (holds === 0) release()
}

function engage(): void {
  heldAt = window.scrollY
  lenis?.stop()
  document.documentElement.classList.add('scroll-locked')

  // Wheel and touch are cancelled everywhere except inside an element that
  // opts in (`data-scroll-lock-allow`): a scrollable plan on a phone keeps
  // its own panning, and it contains its overscroll so nothing reaches the
  // page. A pinch (two fingers) is never cancelled — zoom stays native.
  const cancel = (event: Event) => {
    if (!event.cancelable) return
    if (typeof TouchEvent !== 'undefined' && event instanceof TouchEvent && event.touches.length > 1) return
    const path = event.composedPath()
    if (path.some((node) => node instanceof Element && node.hasAttribute('data-scroll-lock-allow'))) return
    event.preventDefault()
  }
  const onKey = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null
    const editing =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target?.isContentEditable === true
    if (!editing && SCROLL_KEYS.has(event.key)) event.preventDefault()
  }
  const onScroll = () => {
    if (window.scrollY !== heldAt) window.scrollTo(0, heldAt)
  }

  window.addEventListener('wheel', cancel, { passive: false })
  window.addEventListener('touchmove', cancel, { passive: false })
  window.addEventListener('keydown', onKey)
  window.addEventListener('scroll', onScroll)

  releaseListeners = () => {
    window.removeEventListener('wheel', cancel)
    window.removeEventListener('touchmove', cancel)
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('scroll', onScroll)
  }
}

function release(): void {
  releaseListeners?.()
  releaseListeners = null
  document.documentElement.classList.remove('scroll-locked')
  if (window.scrollY !== heldAt) window.scrollTo(0, heldAt)
  lenis?.start()
}
