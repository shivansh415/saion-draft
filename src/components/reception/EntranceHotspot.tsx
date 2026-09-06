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
 * clear sky above the podium, a hairline leader dropping from it to the top
 * of the soffit, and a pin where it lands. Always present on the clean
 * building; hovering only sharpens it. It is annotation, not a button — the
 * kind of mark an architect puts on a render to say "this is the way in".
 *
 * On a viewport whose cover-fit crop pushes the entrance past the edge (a
 * portrait phone), the label stays in reach at the margin and the leader,
 * which would point at nothing, stands down.
 */
export function EntranceHotspot({ rect, onEnter }: Props) {
  if (rect.width === 0) return null

  const label = stillToScreen(rect, FILM_WINDOW, CUE.x, CUE.labelY)
  const leaderTop = stillToScreen(rect, FILM_WINDOW, CUE.x, CUE.leaderTop).y
  const pinY = stillToScreen(rect, FILM_WINDOW, CUE.x, CUE.pinY).y
  const portal = stillBoxToScreen(rect, FILM_WINDOW, PORTAL)

  // Keep the label inside the frame with room for its own width; note whether
  // it had to move.
  const margin = Math.min(96, Math.max(56, rect.containerWidth * 0.17))
  const x = Math.min(Math.max(label.x, margin), rect.containerWidth - margin)
  const pinned = Math.abs(x - label.x) < 0.5 && pinY < rect.containerHeight

  return (
    <div
      className="rc-cue"
      data-rc-cue
      data-pinned={pinned || undefined}
      style={{ left: x, top: label.y }}
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
        <>
          <span
            className="rc-cue__leader"
            aria-hidden="true"
            style={{ top: leaderTop - label.y, height: pinY - leaderTop }}
          />
          <span className="rc-cue__pin" aria-hidden="true" style={{ top: pinY - label.y }} />
          {/* A breath of warmth on the portal itself when the cue is hovered. */}
          <span
            className="rc-cue__glow"
            aria-hidden="true"
            style={{
              left: portal.x + portal.width / 2 - x,
              top: portal.y + portal.height / 2 - label.y,
              width: portal.width * 1.6,
              height: portal.height * 1.6,
            }}
          />
        </>
      )}
    </div>
  )
}
