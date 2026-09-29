import { useCallback, useEffect, useRef, useState } from 'react'

import { Attention } from '../Attention'
import { WHATSAPP_HREF, WHATSAPP_LABEL } from '../../data/contact'
import { jumpTo } from '../../lib/pageScroll'
import { Walkthrough } from './walkthrough/Walkthrough'
import { WALKTHROUGH_COPY } from './walkthrough/walkthroughData'
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
 * house olive, the display serif, one line, and the two ways on from here —
 * the films, as the one filled thing on the page, and the way to make
 * contact beside it.
 *
 * The films open over this screen (see ./walkthrough): the SAION ident
 * plays, then the stage. The page underneath is held still for the whole of
 * it and is exactly where it was when they close.
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
   * The films. Counted rather than toggled: each press mounts a fresh
   * walkthrough (keyed on the count), so its ident and its stage start
   * clean every time, and nothing from a previous sitting is carried over.
   */
  const [sitting, setSitting] = useState(0)
  const cueRef = useRef<HTMLButtonElement | null>(null)
  const openFilms = useCallback(() => setSitting((n) => n + 1), [])

  /**
   * Back to the very beginning — the clouds, before the approach.
   *
   * A jump, not a glide, and this is the one place on the site where that is
   * the right answer. Everything above here is scroll-driven: gliding the
   * page to zero would rewind the whole journey backwards at speed — the
   * amenities, the lobby's doors closing, four hundred and forty frames of
   * film in reverse — which is neither what was asked for nor something the
   * machine can do smoothly. The visitor asked to be AT the start, so they
   * are put there, and the chapter plays forward from zero as it did the
   * first time.
   */
  const returnToStart = useCallback(() => {
    jumpTo(0)
  }, [])
  // Focus comes back to the cue that opened them, so a keyboard visitor is
  // returned to the exact place they left.
  const closeFilms = useCallback(() => {
    setSitting(0)
    cueRef.current?.focus({ preventScroll: true })
  }, [])

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

        <div className="closing__actions">
          <button type="button" className="closing__watch" onClick={openFilms} ref={cueRef}>
            {/* It asks until it is taken. The films are the one thing on this
                screen a visitor would regret missing, and on a page this quiet
                a filled pill is still only a filled pill. */}
            <Attention shown={sitting === 0} />
            <span className="closing__watch-halo" aria-hidden="true" />
            <span className="closing__watch-glyph" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M8 5.5v13l11-6.5z" />
              </svg>
            </span>
            <span className="closing__watch-label">{WALKTHROUGH_COPY.cue}</span>
          </button>

          {/* Contact goes to WhatsApp rather than to a mail client: it is the
              line the sales team actually answers, and it is the same one the
              floating cue offers. The address and the landline are still
              below, for anyone who would rather write. */}
          <a
            className="closing__cta"
            href={WHATSAPP_HREF}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={WHATSAPP_LABEL}
          >
            <span>Contact us</span>
            <span className="closing__arrow" aria-hidden="true">
              &#8599;
            </span>
          </a>
        </div>

        <p className="closing__details">
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          <span aria-hidden="true">&middot;</span>
          <a href={PHONE_HREF}>{PHONE}</a>
        </p>

        {/* The way back up. The journey has no navigation of any kind, so at
            the end of it this is the only thing that can offer one. */}
        <button type="button" className="closing__restart" onClick={returnToStart}>
          <span className="closing__restart-glyph" aria-hidden="true">
            &#8593;
          </span>
          <span>Return to beginning</span>
        </button>
      </div>

      <span className="closing__foot">SAION PROPERTIES &middot; AL FURJAN, DUBAI</span>

      {sitting > 0 && <Walkthrough key={sitting} onClose={closeFilms} />}
    </section>
  )
}
