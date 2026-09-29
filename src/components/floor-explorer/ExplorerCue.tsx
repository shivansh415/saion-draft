import { useEffect } from 'react'

import { EXPLORER_CUE } from './floorExplorerCopy'
import { ROOF_Y, LEVEL_IDS } from './levelCalibration'
import { bandPx } from './levelGeometry'
import { GROUND_Y, TOWER_ZONE } from './towerZone'
import type { CoverRect } from './useCoverRect'

interface Props {
  /** The building's painted rectangle — everything below is drawn in its pixels. */
  rect: CoverRect
  /** Play it. Going false retires it; it is never played twice. */
  shown: boolean
  coarse: boolean
  reducedMotion: boolean
  /** The cue has said its piece and should be stood down. */
  onDone: () => void
}

/** The storey the pointer comes to rest on — mid-tower, so it reads at any crop. */
const DEMO_LEVEL = '08'

/** How long the whole cue is on screen, in ms. Must match `fx-cue-life` in the stylesheet. */
const LIFE_MS = 6400
const LIFE_REDUCED_MS = 5000

/**
 * How far the pointer must travel before the cue treats it as a decision.
 *
 * It cannot be zero, and this is the whole reason the cue was invisible on a
 * desktop: the completed building stands in the middle of the screen, which is
 * where a cursor is usually already resting when the film ends. The instant
 * the tower becomes hoverable the browser fires `pointerenter` on it — a
 * stationary cursor is enough, Chrome re-hit-tests when an element appears
 * under one — the explorer revealed itself, and the cue was spent before a
 * single frame of it had been seen. Presence is not intent. A deliberate move
 * of the pointer is.
 */
const MOVE_TO_DISMISS = 48

/**
 * How long the cue is deaf to dismissal after it starts.
 *
 * Insurance, and cheap. The cue begins in the same handful of frames as the
 * hand-off that puts the explorer on the building, and that is exactly when a
 * stray boundary or move event is most likely; losing the whole thing to one
 * of them is what this is here to prevent a second time.
 */
const GRACE_MS = 900

/**
 * The one-time invitation, played over the completed building.
 *
 * The problem it solves is a real one and it is not decorative: at the end of
 * the film the visitor is looking at a photograph of a tower. Nothing on it
 * says that it is fifteen separately selectable storeys, and the level rail at
 * the right edge is quiet enough to be read as a caption. On a pointer the
 * discovery is a hover the visitor has no reason to make; on a finger there is
 * no hover at all. Until they make it, the whole floor explorer — the thing
 * the chapter exists for — is invisible.
 *
 * So the cue DEMONSTRATES rather than instructs. A line of light sweeps down
 * the tower from the roof slab to Level 01; as it passes each storey that
 * storey's floor line flashes, so the building visibly resolves into fifteen
 * bands. A pointer then glides down the centre and comes to rest on one of
 * them, which lights the way it lights under a real hover, and its level
 * number appears beside it. Then the whole thing retires.
 *
 * Every line is drawn from the same calibration the explorer itself uses
 * (`levelCalibration` → `bandPx`), not from hand-placed coordinates: the sweep
 * starts on the roof slab, ends on Level 01's floor line, and each tick lands
 * on the storey it belongs to at every viewport and every cover-fit crop. It
 * is clipped to the tower's own envelope (`TOWER_ZONE`), so no part of it
 * strays onto the sky or the podium.
 *
 * It takes no pointer events at any point. That matters more than it sounds:
 * the way a visitor dismisses this is by doing the very thing it is asking
 * for, and a cue that swallowed that hover would be asking for something it
 * had made impossible.
 *
 * Under reduced motion the sweep, the pointer and the flashes are all dropped
 * and the storeys are simply shown, drawn at rest — the information survives,
 * the movement does not.
 */
export function ExplorerCue({ rect, shown, coarse, reducedMotion, onDone }: Props) {
  // Stood down on its own once it has played, so the explorer never has to
  // time it — and sooner if the visitor shows they would rather get on with
  // it. What counts as showing that is the careful part: see MOVE_TO_DISMISS.
  useEffect(() => {
    if (!shown) return
    const timer = window.setTimeout(onDone, reducedMotion ? LIFE_REDUCED_MS : LIFE_MS)

    const started = performance.now()
    const settled = () => performance.now() - started > GRACE_MS

    let from: { x: number; y: number } | null = null
    const onMove = (event: PointerEvent) => {
      if (!from) {
        from = { x: event.clientX, y: event.clientY }
        return
      }
      if (settled() && Math.hypot(event.clientX - from.x, event.clientY - from.y) >= MOVE_TO_DISMISS) onDone()
    }
    // A press is always a decision, however small the movement before it.
    const onPress = () => {
      if (settled()) onDone()
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onPress, { passive: true })

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onPress)
    }
  }, [shown, reducedMotion, onDone])

  // Before the still has been measured there is nothing to draw on.
  if (!shown || rect.width === 0) return null

  const px = (xPercent: number, yPercent: number) => ({
    x: rect.x + (rect.width * xPercent) / 100,
    y: rect.y + (rect.height * yPercent) / 100,
  })

  const roofY = rect.y + (rect.height * ROOF_Y) / 100
  const baseY = rect.y + (rect.height * GROUND_Y) / 100
  const travel = Math.max(1, baseY - roofY)

  const tower = TOWER_ZONE.map(([x, y]) => px(x, y))
  const bands = LEVEL_IDS.map((id) => ({ id, ...bandPx(id, rect) }))
  const demo = bands.find((band) => band.id === DEMO_LEVEL) ?? bands[Math.floor(bands.length / 2)]

  // The sweep is as wide as the widest storey, and it is clipped to the tower
  // anyway, so it can be generous.
  const widest = bands.reduce((w, band) => Math.max(w, band.x1 - band.x0), 0)
  const centreX = (demo.x0 + demo.x1) / 2
  /** The pointer glyph is drawn at ~150px of tower width; scale it from there. */
  const glyph = Math.max(0.85, Math.min(2.2, (demo.x1 - demo.x0) / 150))

  /** Where in the sweep's travel a storey sits — what staggers its flash. */
  const at = (y: number) => Math.min(1, Math.max(0, (y - roofY) / travel))

  return (
    <div className="fx-cue" data-fx-cue data-coarse={coarse || undefined}>
      <svg
        className="fx-cue__art"
        width={rect.containerWidth}
        height={rect.containerHeight}
        viewBox={`0 0 ${rect.containerWidth} ${rect.containerHeight}`}
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="fx-cue-sweep" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0" />
            <stop offset="55%" stopColor="#fff" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          {/* The wash. The render is a bright sunset photograph and a white
              hairline laid straight onto it is invisible — the explorer's own
              level lines only read because `.fx__dim` puts 46% of the page's
              own dark behind them. This is the same device, feathered out at
              both margins so the copy on the left and the rail on the right
              are never dimmed; only the building rests. */}
          <linearGradient id="fx-cue-wash" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#090c10" stopOpacity="0" />
            <stop offset="24%" stopColor="#090c10" stopOpacity="0.52" />
            <stop offset="76%" stopColor="#090c10" stopOpacity="0.52" />
            <stop offset="100%" stopColor="#090c10" stopOpacity="0" />
          </linearGradient>
          <clipPath id="fx-cue-tower">
            <polygon points={tower.map((p) => `${p.x},${p.y}`).join(' ')} />
          </clipPath>
        </defs>

        <rect
          className="fx-cue__wash"
          x={0}
          y={0}
          width={rect.containerWidth}
          height={rect.containerHeight}
          fill="url(#fx-cue-wash)"
        />

        {/* Everything on the building is clipped to the building. */}
        <g clipPath="url(#fx-cue-tower)">
          {/* Each storey's floor line, flashing as the sweep reaches it. Under
              reduced motion they are simply drawn, all at once and at rest. */}
          {bands.map((band) => (
            <g
              key={band.id}
              className="fx-cue__tick"
              style={reducedMotion ? undefined : { animationDelay: `${(0.35 + at(band.lineY) * 2.6).toFixed(3)}s` }}
            >
              {/* Under-stroke first: the same line in the page's own dark,
                  a shade wider, so the light one above it is never lost
                  against a pale balcony soffit. */}
              <line className="fx-cue__tick-under" x1={band.x0} y1={band.lineY} x2={band.x1} y2={band.lineY} />
              <line className="fx-cue__tick-line" x1={band.x0} y1={band.lineY} x2={band.x1} y2={band.lineY} />
            </g>
          ))}

          {/* The storey the pointer settles on, lit the way a hover lights it. */}
          <rect
            className="fx-cue__band"
            x={demo.x0}
            y={demo.topY}
            width={Math.max(1, demo.x1 - demo.x0)}
            height={Math.max(1, demo.lineY - demo.topY)}
          />

          {!reducedMotion && (
            <g className="fx-cue__sweep" style={{ ['--fx-cue-travel' as string]: `${travel.toFixed(1)}px` }}>
              <rect
                x={centreX - widest}
                y={roofY - travel * 0.16}
                width={widest * 2}
                height={travel * 0.16}
                fill="url(#fx-cue-sweep)"
              />
              <line
                className="fx-cue__edge"
                x1={centreX - widest}
                y1={roofY}
                x2={centreX + widest}
                y2={roofY}
              />
            </g>
          )}
        </g>

        {/* The pointer. Outside the clip so its tip may overhang a storey edge,
            and drawn with a dark under-stroke so it holds on pale glazing. */}
        {!reducedMotion && (
          <g
            className="fx-cue__pointer"
            style={{
              ['--fx-cue-from' as string]: `${roofY.toFixed(1)}px`,
              ['--fx-cue-to' as string]: `${((demo.topY + demo.lineY) / 2).toFixed(1)}px`,
            }}
          >
            {/* Sized off the storey it lands on: at icon size a pointer is
                lost on a tower two hundred pixels wide, and on a phone the
                same glyph would swamp it. */}
            <g transform={`translate(${centreX} 0) scale(${glyph.toFixed(3)})`}>
              <circle className="fx-cue__ring" cx="0" cy="0" r="17" />
              {coarse ? (
                <circle className="fx-cue__tap" cx="0" cy="0" r="8" />
              ) : (
                <path
                  className="fx-cue__arrow"
                  d="M0 -2 L0 19 L5 14.5 L8.3 21.5 L11.4 20 L8.2 13.3 L14.5 13 Z"
                />
              )}
            </g>
          </g>
        )}
      </svg>

      {/* The words, in the place the explorer's own copy panel takes when it
          arrives — so this reads as that panel showing up early and handing
          over, rather than as a second thing on the screen. */}
      <div className="fx-cue__copy">
        <span className="fx-cue__eyebrow">{EXPLORER_CUE.eyebrow}</span>
        <span className="fx-cue__rule" aria-hidden="true" />
        <h3 className="fx-cue__headline">
          {EXPLORER_CUE.headline[0]}
          <br />
          <em>{EXPLORER_CUE.headline[1]}</em>
        </h3>
        <p className="fx-cue__action">{coarse ? EXPLORER_CUE.actionCoarse : EXPLORER_CUE.action}</p>
      </div>
    </div>
  )
}
