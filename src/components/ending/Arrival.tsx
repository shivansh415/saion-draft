import { FINAL_FRAME_STILL, FOCAL_X, FOCAL_Y, OPENING_COPY } from '../../data/opening'
import { ClosingCall } from './ClosingCall'

import './arrival.css'

/**
 * The last chapter: the building you arrive at, and the one thing left to do.
 *
 * The journey used to be a round trip. The arch at the end of the amenities
 * jumped the page back UP to the building inside the opening chapter, which
 * put the visitor above the reception and the amenities again — so carrying on
 * from the end walked the whole journey a second time, and scrolling back from
 * the end went into the construction film instead of back the way they came.
 *
 * This is the same building, placed where it belongs: after the amenities, at
 * the bottom of the document. It opens on the very still the arch's transition
 * ends on, at the same cover fit, so the hand-over is the same pixel-exact
 * exchange it always was — the page simply travels forward to it rather than
 * back. Everything above stays where it was read, and there is nothing below
 * but the closing call.
 */
export function Arrival() {
  return (
    <div data-arrival-root>
      <section className="arrival" aria-label="Reposé Residence">
        {/* Framed exactly as the arch's transition leaves it, and as the
            explorer holds it: the same cover fit about the same focal point.
            Taken from the constants rather than written out, so the two can
            never drift apart and put a seam in the exchange. */}
        <img
          className="arrival__still"
          style={{ objectPosition: `${FOCAL_X * 100}% ${FOCAL_Y * 100}%` }}
          src={FINAL_FRAME_STILL.src}
          width={FINAL_FRAME_STILL.width}
          height={FINAL_FRAME_STILL.height}
          alt="Reposé Residence, completed — Al Furjan, Dubai"
          decoding="async"
          draggable={false}
        />

        {/* The journey's closing marks, in the places they have always had:
            the residence on the left, the developer on the right, on the two
            ends of a row at the foot of the frame. */}
        <div className="arrival__brand">
          <span className="arrival__mark">
            <strong>REPOS&Eacute; RESIDENCE</strong>
            AL FURJAN &middot; DUBAI
          </span>
          <img
            className="arrival__logo"
            src={OPENING_COPY.logoSrc}
            alt={OPENING_COPY.logoAlt}
            width={355}
            height={164}
            decoding="async"
            draggable={false}
          />
        </div>
      </section>

      <ClosingCall />
    </div>
  )
}
