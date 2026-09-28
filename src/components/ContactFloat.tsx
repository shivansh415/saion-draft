import { WHATSAPP_HREF, WHATSAPP_LABEL } from '../data/contact'
import '../styles/contact-float.css'

interface Props {
  /**
   * True once the construction film has finished and the completed building is
   * standing. Before that the page is a film and has nothing to sell yet.
   */
  shown: boolean
}

/**
 * The one persistent call to action: WhatsApp, low in the right-hand corner.
 *
 * It lives at App level rather than inside a chapter on purpose. The journey
 * is one document and the visitor crosses four chapters in it; a cue mounted
 * inside any of them would come and go with that chapter's own scroll. Here it
 * is raised once, when the building completes, and is on screen for everything
 * that follows — the explorer, the lobby, the amenities, the closing screen.
 *
 * It is `position: fixed`, so it is outside every chapter's sticky viewport and
 * every pin; and it sits under the films and the preloader (z-index 600 against
 * their 9000 and 9999), so nothing that takes the whole screen has to fight it.
 *
 * Kept in the tree while hidden rather than unmounted: it fades and lifts into
 * place, and an element that is not there cannot do either. `inert` takes it
 * out of hit-testing and the Tab order while it is down.
 */
export function ContactFloat({ shown }: Props) {
  return (
    <a
      className="wa"
      data-shown={shown || undefined}
      href={WHATSAPP_HREF}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={WHATSAPP_LABEL}
      title={WHATSAPP_LABEL}
      inert={!shown || undefined}
    >
      <span className="wa__pulse" aria-hidden="true" />
      <svg className="wa__glyph" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        {/* WhatsApp's mark, as one path: the speech bubble with the handset. */}
        <path d="M16.04 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.26.59 4.47 1.72 6.42L3.2 28.8l6.55-1.71a12.74 12.74 0 0 0 6.29 1.64h.01c7.06 0 12.8-5.74 12.8-12.8 0-3.42-1.33-6.63-3.75-9.05a12.71 12.71 0 0 0-9.06-3.68Zm0 23.31h-.01a10.63 10.63 0 0 1-5.42-1.48l-.39-.23-4.03 1.05 1.08-3.93-.25-.4a10.6 10.6 0 0 1-1.63-5.67c0-5.87 4.78-10.64 10.65-10.64 2.85 0 5.52 1.11 7.53 3.12a10.57 10.57 0 0 1 3.12 7.53c0 5.87-4.78 10.65-10.65 10.65Zm5.84-7.97c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.5-.16-.71.16-.21.32-.82 1.04-1 1.25-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.89-1.78-2.21-.19-.32-.02-.5.14-.66.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.71-1.73-.98-2.37-.26-.62-.52-.53-.71-.54l-.61-.01c-.21 0-.56.08-.85.4-.29.32-1.11 1.09-1.11 2.65s1.14 3.08 1.3 3.29c.16.21 2.24 3.42 5.43 4.8.76.33 1.35.52 1.81.67.76.24 1.45.21 2 .13.61-.09 1.89-.77 2.15-1.52.27-.74.27-1.38.19-1.52-.08-.13-.29-.21-.61-.37Z" />
      </svg>
    </a>
  )
}
