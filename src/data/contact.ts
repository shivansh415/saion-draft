/**
 * How the site asks to be contacted.
 *
 * One place, because the same number is offered twice — the floating cue that
 * appears once the building is standing, and "Contact us" on the closing
 * screen — and a sales line that is right in one place and stale in the other
 * is worse than no line at all.
 */

/** As it is written for a human to read. */
export const WHATSAPP_DISPLAY = '+971 56 396 0318'

/** As `wa.me` wants it: digits only, country code first, no `+`. */
const WHATSAPP_DIGITS = '971563960318'

/** What the visitor's message is already filled in with; they can replace it. */
const WHATSAPP_GREETING = 'Hello, I would like to know more about Reposé Residence.'

export const WHATSAPP_HREF = `https://wa.me/${WHATSAPP_DIGITS}?text=${encodeURIComponent(WHATSAPP_GREETING)}`

export const WHATSAPP_LABEL = 'Talk to us on WhatsApp'
