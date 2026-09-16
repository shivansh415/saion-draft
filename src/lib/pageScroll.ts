import { getSmoothScroll } from './scrollLock'

/**
 * Moving the page, for everything on it.
 *
 * The application has ONE Lenis instance (see `hooks/useSmoothScroll`), and
 * under reduced motion it has none and the page scrolls natively. Everything
 * that moves the page goes through here so neither case has to be handled
 * twice — `repose/motion/hostScroll` re-exports these rather than restating
 * them.
 */

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Document position of an element's top edge. */
export const pageTop = (element: Element): number => element.getBoundingClientRect().top + window.scrollY

/**
 * Puts the page at `top` this instant.
 *
 * Only ever used behind cover — under a loader, or behind the fully expanded
 * arch — so nothing is seen to move. A jump in the open is exactly what the
 * continuous journey is not.
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

/**
 * Lenis's own default easing for `scrollTo` — `1.001 - 2^(-10t)` — is a sharp
 * ease-OUT: it spends about ninety percent of the scroll distance in the
 * first third of the duration and creeps through the rest. For a plain jump
 * to a section that is invisible. It is not invisible here: several chapters
 * — the reception's walk to the door chief among them — read scroll position
 * straight off the page as animation progress, so whatever curve the glide's
 * distance follows, the picture follows exactly. Under that default curve the
 * zoom and the doors finish almost the instant the press lands, and the
 * duration is spent creeping through a scene that has already arrived — which
 * is the "ek dam se" jump this was written to fix. An ease that spends its
 * time evenly on the way in and the way out keeps the choreography spread
 * across the whole of the duration a caller asks for, so a press reads as the
 * same continuous glide a scroll does, just one that drives itself.
 */
const glideEase = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/**
 * Glides the page to `top`.
 *
 * This is what a pressed control does — "Enter inside", "Explore Reposé",
 * "Back to building", a chapter in the menu. The journey is one scroll
 * document, so a control's job is to travel it, not to switch to a state the
 * scroll knows nothing about.
 */
export function glideTo(top: number, duration = 1.15): void {
  const lenis = getSmoothScroll()
  if (lenis && !reduced()) {
    lenis.scrollTo(top, { duration, force: true, easing: glideEase })
    return
  }
  window.scrollTo({ top, behavior: reduced() ? 'instant' : 'smooth' })
}
