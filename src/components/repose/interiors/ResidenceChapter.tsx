import { useCallback, useRef, useState } from 'react'

import { useResidenceMotion } from '../motion/useResidenceMotion'
import { BotanicalCorner } from './BotanicalCorner'
import { InteriorCinema, type CinemaHandle } from './InteriorCinema'
import { INTERIORS, RESIDENCE_COPY, type Interior, type InteriorId } from './interiorsData'
import './residence.css'

/**
 * The residence chapter — between the reception and the amenities loader.
 *
 * A warm ivory page with almost nothing on it: a botanical spray in two
 * opposite corners, the chapter's name and statement in the upper third, and
 * four arched cards across the middle. The composition follows the supplied
 * ERA reference — corner mass, deep negative space, small tracked capitals in
 * the margins — in Reposé's own palette and faces.
 *
 * The cards are architecture, not interface: an arched head (the same arch the
 * finale's portal is built on), a hairline base, a numeral and one invitation.
 * No fills, no shadows, no gold.
 *
 * Pressing one hands its rectangle to `InteriorCinema`, which grows the film
 * out of it. Scrolling past instead is a first-class way through: nothing here
 * has to be opened for the journey to continue to the amenities.
 */
export function ResidenceChapter() {
  const root = useRef<HTMLElement>(null)
  /** Everything that recedes while a film has the frame. */
  const page = useRef<HTMLDivElement>(null)
  const cinema = useRef<CinemaHandle>(null)
  const frames = useRef(new Map<InteriorId, HTMLElement>())
  const [open, setOpen] = useState<{ room: Interior; from: DOMRect; arch: [string, string] } | null>(
    null,
  )

  const prime = useCallback(() => cinema.current?.prime(), [])
  useResidenceMotion(root, true, prime)

  const enter = useCallback((room: Interior) => {
    const frame = frames.current.get(room.id)
    if (!frame) return
    // The rectangle the film grows from is measured at the moment of the
    // press, not remembered: the row moves under a scrub, so a stored rect
    // would be a frame or two stale and the film would start slightly off the
    // card it came out of.
    //
    // The arch travels with it, read rather than assumed. The card's head is
    // a percentage pair (`50% 37.5%`, and a flatter pair on a phone), and
    // percentages stay proportional as the frame grows — so the film opens
    // from precisely the shape that was on screen at every breakpoint,
    // without the cinema having to know this stylesheet's ratios.
    const style = getComputedStyle(frame)
    setOpen({
      room,
      from: frame.getBoundingClientRect(),
      arch: [style.borderTopLeftRadius, style.borderTopRightRadius],
    })
  }, [])

  const close = useCallback(() => setOpen(null), [])

  return (
    <section
      id="residence"
      className="ri"
      ref={root}
      aria-labelledby="ri-title"
      /*
       * While a film has the frame, this section must outrank the chapter's
       * own fixed chrome and every amenity section after it. `.ri-cinema`'s
       * own z-index cannot do that: `isolation: isolate` on this section
       * makes it a private stacking context, so the cinema's 120 is measured
       * against its siblings here, never against the header's 40 outside.
       * What competes with the header is this element's own level — so it is
       * raised, for exactly as long as a film is open (see the stylesheet).
       */
      data-film={open ? '' : undefined}
    >
      <BotanicalCorner corner="top-left" />
      <BotanicalCorner corner="bottom-right" />

      <div className="ri__page" ref={page}>
        <div className="ri__head">
          <p className="ri__eyebrow t-ui">
            <span>{RESIDENCE_COPY.eyebrow}</span>
            <i aria-hidden="true" />
          </p>
          <h2 id="ri-title" className="ri__title t-display">
            <span className="rp-clip">
              <span>{RESIDENCE_COPY.title[0]}</span>
            </span>
            <span className="rp-clip">
              <span>
                <em>{RESIDENCE_COPY.title[1]}</em>
              </span>
            </span>
          </h2>
          <p className="ri__lead">{RESIDENCE_COPY.lead}</p>
        </div>

        <span className="ri__place t-micro">{RESIDENCE_COPY.place}</span>

        <ul className="ri__cards">
          {INTERIORS.map((room) => (
            <li key={room.id} className="ri-card">
              <button
                type="button"
                className="ri-card__button"
                onClick={() => enter(room)}
                onPointerEnter={() => cinema.current?.warm(room.id)}
                onFocus={() => cinema.current?.warm(room.id)}
                aria-label={`${room.name} — ${room.cue}`}
              >
                <span
                  className="ri-card__frame"
                  ref={(element) => {
                    if (element) frames.current.set(room.id, element)
                    else frames.current.delete(room.id)
                  }}
                >
                  {/* The arch is the frame's; the reveal is this wrapper's.
                      Keeping the two clips on two elements is what stops the
                      compositor seaming the crown (see useResidenceMotion). */}
                  <span className="ri-card__reveal">
                    <img src={room.card} alt={room.alt} loading="lazy" decoding="async" />
                    <span className="ri-card__wash" aria-hidden="true" />
                  </span>
                </span>
                <span className="ri-card__foot">
                  <span className="ri-card__index t-micro">{room.index}</span>
                  <span className="ri-card__name t-display">{room.name}</span>
                  <span className="ri-card__cue t-ui">
                    {room.cue}
                    <i aria-hidden="true">→</i>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <span className="ri__select t-micro" aria-hidden="true">
          {RESIDENCE_COPY.select}
        </span>

      </div>

      {/*
        The handover, BELOW the pinned page rather than inside it: the page is
        held still for the length of the four reveals, and this is the first
        thing the journey moves on to when the pin releases. It is scroll room
        as much as it is a cue — `ReposeLifestyle` hands over to the amenities
        loader when it passes the middle of the screen, and with nothing under
        the last card that moment would sit at the exact scroll limit.
      */}
      <div className="ri__tail" data-residence-tail>
        <span className="ri__tail-rule" aria-hidden="true" />
        <span className="ri__tail-word t-micro">{RESIDENCE_COPY.onward}</span>
        <span className="ri__tail-next t-display">{RESIDENCE_COPY.next}</span>
        <span className="ri__tail-arrow" aria-hidden="true">
          ↓
        </span>
      </div>

      {/* Outside `.ri__page` on purpose: the page is the thing that scales and
          blurs behind a film, and a `filter` or `transform` on an ancestor
          would make this fixed layer resolve against it instead of the
          viewport — the film would be scaled and blurred with the chapter. */}
      <InteriorCinema ref={cinema} open={open} host={page} onClose={close} />
    </section>
  )
}
