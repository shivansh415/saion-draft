import { useEffect, useRef, useState } from 'react'

import './closing.css'

/**
 * The last screen of the site, and the end of its scroll.
 *
 * The journey used to be a round trip: the arch handed the frame back to the
 * building, and the building still had the whole of the rest of the opening
 * chapter below it, so scrolling on began the whole thing again. It now ends
 * here — one screen, one thing to do on it, and no document after it.
 *
 * Deliberately quiet. It follows a held building and it is the last thing
 * anyone sees, so it is the brochure's back cover rather than a banner: the
 * house olive, the display serif, one line, and one way to make contact.
 */

const EMAIL = 'info@saionproperties.com'
const PHONE = '+971 42 61 4002'
const PHONE_HREF = 'tel:+97142614002'

export function ClosingCall() {
  const ref = useRef<HTMLElement | null>(null)
  // Where the observer is unavailable the screen is simply shown: the reveal is
  // a grace note, never the thing that makes the content readable. Decided at
  // first render rather than in the effect, so there is no cascading re-render.
  const [shown, setShown] = useState(() => typeof IntersectionObserver === 'undefined')

  /**
   * Revealed on arrival rather than on a scrub.
   *
   * An IntersectionObserver rather than a ScrollTrigger on purpose: this
   * mounts in the same frame as the arch's hand-back, which is already
   * re-measuring every trigger on the page, and there is nothing to gain by
   * adding one more thing for that refresh to account for.
   */
  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true)
          observer.disconnect()
        }
      },
      { threshold: 0.25 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={ref}
      className="closing"
      data-shown={shown || undefined}
      aria-labelledby="closing-title"
    >
      <div className="closing__inner">
        <span className="closing__eyebrow">Your next chapter</span>
        <span className="closing__rule" aria-hidden="true" />

        <h2 className="closing__title" id="closing-title">
          Let&rsquo;s talk
          <br />
          <em>about Repos&eacute;.</em>
        </h2>

        <a className="closing__cta" href={`mailto:${EMAIL}`}>
          <span>Contact us</span>
          <span className="closing__arrow" aria-hidden="true">
            &#8599;
          </span>
        </a>

        <p className="closing__details">
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          <span aria-hidden="true">&middot;</span>
          <a href={PHONE_HREF}>{PHONE}</a>
        </p>
      </div>

      <span className="closing__foot">SAION PROPERTIES &middot; AL FURJAN, DUBAI</span>
    </section>
  )
}
