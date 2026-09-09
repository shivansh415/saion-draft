/**
 * The lifestyle chapter never smooths the page itself: the application's one
 * Lenis instance owns that. These are the shared page-scroll helpers, kept as
 * a re-export so the chapter's own call sites read unchanged.
 */
export { glideTo, jumpTo, pageTop } from '../../../lib/pageScroll'
