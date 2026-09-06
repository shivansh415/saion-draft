import { FINAL_FRAME_STILL } from '../../data/opening'
import type { EntranceLayout } from './entranceLayout'
import { insetOf } from './entranceLayout'
import type { Box } from './imageSpace'
import { RECEPTION_ASSETS, RECEPTION_COPY } from './receptionCopy'

interface Props {
  layout: EntranceLayout
  /**
   * Whether the journey's two large stills may be fetched yet.
   *
   * They are 6.6MB between them and the whole camera is `visibility: hidden`
   * until the journey begins, so at rest they paint nothing — but a `src` in
   * the DOM is fetched regardless of that, and at first paint they would be
   * pulling against the film's own critical frames on the same connection.
   * The sources are therefore withheld until the opening has been revealed,
   * which is minutes before the earliest possible click.
   */
  sources: boolean
}

const boxStyle = (box: Box) => ({ left: box.x, top: box.y, width: box.width, height: box.height })

/**
 * The scene the journey is played on. Nothing here moves by itself: every
 * layer rests exactly where the clean building already is, and the
 * choreography in `ReceptionExperience` drives them by their data handles.
 *
 * Inside the camera, back to front:
 *
 *   film      the film's final frame, painted where the film painted it. It
 *             is what the visitor is already looking at, and it fills the
 *             out-painted margins the still does not reach.
 *   still     `building-final.webp`, laid over the frame through the window
 *             the frame shows of it. It differs from the frame by
 *             compression only, so it can simply appear.
 *   through   the reception, sized so that it will fill the viewport exactly
 *             when the camera arrives, and clipped to the door opening until
 *             the threshold — the lobby seen through the doors.
 *   aperture  the door opening, with the two leaves cut from the still's own
 *             pixels. Each leaf turns on its outer stile, inward, under a
 *             perspective whose vanishing point is where the camera looks.
 *   streak    one reflection sweeping the glass as the threshold is crossed.
 *
 * Outside the camera: the bloom and the darker threshold edge that carry the
 * crossing, the reception itself at full size (crisp, unscaled by any
 * ancestor) which takes over from `through` at the moment the two coincide,
 * and the copy that follows once the lobby has settled.
 */
export function EntranceTransition({ layout, sources }: Props) {
  const { film, still, opening, leftLeaf, rightLeaf, portal, through, throughInset, reception } = layout

  const leaf = (box: Box, edge: 'left' | 'right') => ({
    left: box.x - opening.x,
    top: box.y - opening.y,
    width: box.width,
    height: box.height,
    transformOrigin: edge === 'left' ? '0% 50%' : '100% 50%',
    backgroundImage: sources ? `url(${RECEPTION_ASSETS.building})` : 'none',
    backgroundSize: `${still.width}px ${still.height}px`,
    backgroundPosition: `${still.x - box.x}px ${still.y - box.y}px`,
  })

  return (
    <>
      <div className="rc__camera" data-rc-camera>
        <img
          className="rc__film"
          data-rc-exterior
          src={FINAL_FRAME_STILL.src}
          alt=""
          decoding="async"
          draggable={false}
          style={boxStyle(film)}
        />
        <img
          className="rc__still"
          data-rc-still
          data-rc-exterior
          src={sources ? RECEPTION_ASSETS.building : undefined}
          alt={RECEPTION_COPY.buildingAlt}
          decoding="async"
          draggable={false}
          style={boxStyle(still)}
        />

        <div className="rc__through" data-rc-through style={{ ...boxStyle(through), clipPath: insetOf(throughInset) }}>
          <img
            src={sources ? RECEPTION_ASSETS.reception : undefined}
            alt=""
            decoding="async"
            draggable={false}
            style={{ width: through.width, height: through.height }}
          />
        </div>

        <div
          className="rc__aperture"
          data-rc-exterior
          style={{
            ...boxStyle(opening),
            perspective: layout.perspective,
            perspectiveOrigin: layout.perspectiveOrigin,
          }}
        >
          <div className="rc__leaf" data-rc-leaf="left" style={leaf(leftLeaf, 'left')} />
          <div className="rc__leaf" data-rc-leaf="right" style={leaf(rightLeaf, 'right')} />
        </div>

        <div className="rc__streak" data-rc-streak style={boxStyle(portal)} />
      </div>

      <div className="rc__vignette" data-rc-vignette />
      <div className="rc__bloom" data-rc-bloom />

      <div className="rc__inside" data-rc-inside>
        <img
          src={sources ? RECEPTION_ASSETS.reception : undefined}
          alt={RECEPTION_COPY.receptionAlt}
          decoding="async"
          draggable={false}
          style={boxStyle(reception)}
        />
      </div>
    </>
  )
}
