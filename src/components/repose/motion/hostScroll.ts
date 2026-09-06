import { getSmoothScroll } from '../../../lib/scrollLock'

/**
 * The lifestyle chapter never smooths the page itself: the application's one
 * Lenis instance (see `hooks/useSmoothScroll`) owns that, and under reduced
 * motion there is none and the page scrolls natively. Everything here goes
 * through whichever of the two is in charge.
 */

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Document position of an element's top edge. */
export const pageTop = (element: Element): number => element.getBoundingClientRect().top + window.scrollY

/**
 * Puts the page at `top` this instant. Used only behind cover — under the
 * loader on the way in, and behind the fully expanded arch on the way out —
 * so nothing is ever seen to move.
 */
export function jumpTo(top: number): void {
  const lenis = getSmoothScroll()
  if (lenis) {
    // The document has usually just changed height; Lenis clamps a target to
    // the limit it last measured, so it is asked to measure again first.
    lenis.resize()
    lenis.scrollTo(top, { immediate: true, force: true })
  }
  window.scrollTo(0, top)
}

/** Glides the page to `top` — chapter navigation, and the way back from the finale. */
export function glideTo(top: number): void {
  const lenis = getSmoothScroll()
  if (lenis && !reduced()) {
    lenis.scrollTo(top, { duration: 1.15, force: true })
    return
  }
  window.scrollTo({ top, behavior: reduced() ? 'instant' : 'smooth' })
}
