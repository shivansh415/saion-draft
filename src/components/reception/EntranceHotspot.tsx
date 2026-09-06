import type { CoverRect } from '../floor-explorer/useCoverRect'
import { CUE, FILM_WINDOW, PORTAL } from './entranceCalibration'
import { stillBoxToScreen, stillToScreen } from './imageSpace'
import { RECEPTION_COPY } from './receptionCopy'

interface Props {
  rect: CoverRect
  onEnter: () => void
}

/**
 * The wayfinding cue at the entrance: a line of small tracked capitals in the
 * transom directly above the door, on the door's own centre line, with a
 * short hairline dropping to the head rail and a pin where it lands. Its
 * position is the calibrated entrance (`CUE`, in the still's own space)
 * projected through the cover-fit, so it stays above the door at every
 * viewport. Always present on the clean building; hovering only sharpens it.
 * It is annotation, not a button — the kind of mark an architect puts on a
 * render to say "this is the way in".
 *
 * Where the cover-fit crop pushes the door toward or past the edge (a
 * portrait phone), the label stays in reach at the margin; the hairline and
 * pin still stand on the door while any of it is on screen, and stand down
 * once it is not.
 */
export function EntranceHotspot({ rect, onEnter }: Props) {
  if (rect.width === 0) return null

  const label = stillToScreen(rect, FILM_WINDOW, CUE.x, CUE.labelY)
  const leaderTop = stillToScreen(rect, FILM_WINDOW, CUE.x, CUE.leaderTop).y
  const pinY = stillToScreen(rect, FILM_WINDOW, CUE.x, CUE.pinY).y
  const portal = stillBoxToScreen(rect, FILM_WINDOW, PORTAL)

  // Keep the label inside the frame with room for its own width (about 150px
  // with its touch padding, so never less than 76px either side).
  const margin = Math.min(96, Math.max(76, rect.containerWidth * 0.17))
  const x = Math.min(Math.max(label.x, margin), rect.containerWidth - margin)
  const y = Math.min(Math.max(label.y, 24), rect.containerHeight - 24)
  // The mark itself stays on the door's centre line while that is on screen:
  // with the hairline when the label sits over it, the pin alone when the
  // label had to step aside to stay in the frame.
  const pinX = label.x
  const offsetX = pinX - x
  const doorOnScreen = pinX > 6 && pinX < rect.containerWidth - 6 && pinY < rect.containerHeight - 4
  const pinned = doorOnScreen && Math.abs(offsetX) < 0.5 && Math.abs(y - label.y) < 0.5
  const marked = doorOnScreen && !pinned

  return (
    <div
      className="rc-cue"
      data-rc-cue
      data-pinned={pinned || undefined}
      data-marked={marked || undefined}
      style={{ left: x, top: y }}
    >
      <button
        type="button"
        className="rc-cue__button"
        data-rc-cue-button
        onClick={onEnter}
        aria-label={`${RECEPTION_COPY.enter} — the reception`}
      >
        <span className="rc-cue__label">{RECEPTION_COPY.enter}</span>
        <span className="rc-cue__arrow" aria-hidden="true">
          →
        </span>
      </button>

      {pinned && (
        <span
          className="rc-cue__leader"
          aria-hidden="true"
          style={{ top: leaderTop - y, height: Math.max(0, pinY - leaderTop) }}
        />
      )}
      {doorOnScreen && (
        <>
          <span className="rc-cue__pin" aria-hidden="true" style={{ left: offsetX, top: pinY - y }} />
          {/* A breath of warmth on the portal itself when the cue is hovered. */}
          <span
            className="rc-cue__glow"
            aria-hidden="true"
            style={{
              left: portal.x + portal.width / 2 - x,
              top: portal.y + portal.height / 2 - y,
              width: portal.width * 1.6,
              height: portal.height * 1.6,
            }}
          />
        </>
      )}
    </div>
  )
}
