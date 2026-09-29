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

/**
 * How long the input has to be quiet before the gesture that is being held
 * through is taken to be over. Trackpad momentum arrives as a stream of
 * wheel events a few milliseconds apart; a gap this long only ever falls
 * between two gestures.
 */
const GESTURE_GAP = 160
/** No gesture lasts this long; the hold is never left engaged past it. */
const GESTURE_MAX = 2000

let gestureTimer: number | null = null
let gestureRelease: (() => void) | null = null

/**
 * Holds the page where it is until the gesture that brought it here is over.
 *
 * The arch hands the page to the arrival on a scroll that is still going: a
 * wheel flick or a trackpad's momentum is a stream of events that carries on
 * for a good while after the hand-off, and every one of them landed after
 * the page had been placed on the building — so the building slid on up
 * and the closing screen came in under it before anyone had seen the
 * selector. The rest of that stream is absorbed here, through the same lock
 * everything else uses; the next gesture, made on purpose, moves the page
 * as normal.
 *
 * Measured, not timed: the hold ends `GESTURE_GAP` after the LAST input, so
 * a gesture that has already stopped costs one short beat and a long
 * momentum is held for exactly as long as it lasts.
 */
export function holdScrollThroughGesture(): void {
  if (gestureRelease) {
    arm()
    return
  }
  lockScroll()
  const startedAt = performance.now()
  const onInput = () => {
    if (performance.now() - startedAt > GESTURE_MAX) done()
    else arm()
  }
  const options: AddEventListenerOptions = { passive: true, capture: true }
  window.addEventListener('wheel', onInput, options)
  window.addEventListener('touchmove', onInput, options)
  window.addEventListener('scroll', onInput, options)
  const done = () => {
    if (gestureTimer !== null) window.clearTimeout(gestureTimer)
    gestureTimer = null
    window.removeEventListener('wheel', onInput, options)
    window.removeEventListener('touchmove', onInput, options)
    window.removeEventListener('scroll', onInput, options)
    gestureRelease = null
    unlockScroll()
  }
  gestureRelease = done
  arm()

  function arm(): void {
    if (gestureTimer !== null) window.clearTimeout(gestureTimer)
    gestureTimer = window.setTimeout(() => gestureRelease?.(), GESTURE_GAP)
  }
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
    if (editing || !SCROLL_KEYS.has(event.key)) return
    // Space scrolls the page, but on a focused control it is also how that
    // control is pressed — and preventing the default on keydown suppresses
    // the click the browser would have synthesised. Cancelling it everywhere
    // meant a keyboard-only visitor could not press "Back to building",
    // "View in 3D" or the zoom reset at all while a plan was
    // open, since the lock is held for the whole of it.
    if (event.key === ' ' || event.key === 'Spacebar') {
      const control = target?.closest('button, a[href], [role="button"], summary, select')
      if (control) return
    }
    event.preventDefault()
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
  // Nothing was ever engaged, so there is nothing to release — and `heldAt`
  // is either 0 or a position from some earlier lock. Restoring it here would
  // hard-scroll the page to a stale place (to the very top, if nothing has
  // locked yet) on any unbalanced `unlockScroll()`.
  if (!releaseListeners) {
    lenis?.start()
    return
  }
  releaseListeners()
  releaseListeners = null
  document.documentElement.classList.remove('scroll-locked')
  if (window.scrollY !== heldAt) window.scrollTo(0, heldAt)
  lenis?.start()
}

/* ------------------------------------------------------------------ *
 * The ceiling — a floor the page may not scroll PAST, in one direction
 * ------------------------------------------------------------------ */

let ceiling: number | null = null
let ceilingBound = false
/** True while the clamp is itself moving the page, so it cannot answer itself. */
let clamping = false
/** Counts the times the visitor has pushed against it, for whoever wants to know. */
let bumps = 0
let lastBumpAt = 0
let onBump: ((count: number) => void) | null = null

/**
 * How long after a push before another one counts.
 *
 * A single flick does not produce one scroll event, it produces a stream of
 * them as the momentum decays, and every one of them lands past the ceiling.
 * Counted raw, one flick read as a dozen pushes and the way-past control
 * appeared on the visitor's very first approach — which is the opposite of
 * what it is for. A gap this long only ever falls between two gestures, and
 * a determined visitor therefore takes some seconds to surface the way past
 * rather than being handed it before they have tried the way in.
 *
 * Two seconds, not one: measured, a single hard scroll against the ceiling
 * runs for three and a half seconds of decaying momentum, and at a shorter
 * gap that one gesture alone was enough to surface the escape. At two it
 * yields at most two pushes, so the third has to be a separate decision.
 */
const BUMP_GAP_MS = 2000

/**
 * A ceiling is not a lock, and the difference is the whole point of it.
 *
 * `lockScroll` holds the page completely still, which is right for a plan
 * open over the film. It is wrong for asking a visitor to look at the
 * building before they carry on: a page that answers nothing in either
 * direction is a page that reads as broken, which is the single most
 * expensive thing this site can do to a buyer. A ceiling lets them scroll
 * back up through everything they have seen, and only declines to go further
 * down — so the page is plainly alive and plainly waiting for something.
 *
 * Implemented as a clamp rather than as cancelled input on purpose. Lenis
 * drives the scroll itself and cancels the browser's own handling to do it,
 * so preventing a wheel event does not stop Lenis; whereas whatever moves the
 * page past the ceiling — a wheel, a flick's momentum, a keypress, a
 * scroll-into-view — is undone by the very next scroll event, whoever caused
 * it. Nothing has to be enumerated, so nothing can be forgotten.
 */
export function setScrollCeiling(y: number | null, onPush?: (count: number) => void): void {
  ceiling = y === null ? null : Math.max(0, y)
  onBump = onPush ?? null
  if (ceiling === null) {
    bumps = 0
    lastBumpAt = 0
    if (ceilingBound) {
      ceilingBound = false
      window.removeEventListener('scroll', clampToCeiling)
      lenis?.off('scroll', clampToCeiling)
    }
    return
  }
  if (!ceilingBound) {
    ceilingBound = true
    // Both, and deliberately: Lenis emits its own scroll for the smoothed
    // path, and the window's fires for the reduced-motion path that runs
    // without it. Whichever arrives, the clamp is the same idempotent call.
    window.addEventListener('scroll', clampToCeiling, { passive: true })
    lenis?.on('scroll', clampToCeiling)
  }
  clampToCeiling()
}

/** How many times the visitor has pushed at the ceiling since it was set. */
export function ceilingBumps(): number {
  return bumps
}

function clampToCeiling(): void {
  if (ceiling === null || clamping) return
  // A hair of tolerance: a smoothed scroll settles asymptotically and would
  // otherwise report a few hundredths past the line for ever.
  if (window.scrollY <= ceiling + 1) return

  const now = performance.now()
  const isNewPush = now - lastBumpAt > BUMP_GAP_MS
  if (isNewPush) {
    lastBumpAt = now
    bumps += 1
  }
  clamping = true
  if (lenis) {
    lenis.scrollTo(ceiling, { immediate: true, force: true })
  } else {
    window.scrollTo(0, ceiling)
  }
  // Released on the next task, not synchronously: `scrollTo` emits the very
  // scroll event this function is answering.
  window.setTimeout(() => {
    clamping = false
  }, 0)
  if (isNewPush) onBump?.(bumps)
}
