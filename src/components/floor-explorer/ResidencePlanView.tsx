import { forwardRef, useEffect, useRef, useState } from 'react'

import { PlanMorph } from './PlanMorph'
import { AVAILABILITY_COPY, RESIDENCE_COPY, VIEWER_COPY } from './floorExplorerCopy'
import { PLAN_PRESENTATION, formatLevelList, planFallback, unitPlanImage } from './floorExplorerData'
import type { Level, UnitHotspot } from './floorExplorerData'
import { unit3dView } from './unit3dViews'
import { usePlanViewer } from './usePlanViewer'
import { useImageRatio, useSheetFit } from './useSheetFit'
import { warmImage } from './warmImage'

interface Props {
  level: Level | null
  /** The residence on view — always one with a verified plan — or null while idle. */
  hotspot: UnitHotspot | null
  /** True while the plan may take input (the residence is open, not opening or closing). */
  interactive: boolean
  reducedMotion: boolean
  onBack: () => void
}

/** Until a plan's own dimensions are known; the supplied unit plans sit between 1.0 and 1.5. */
const FALLBACK_RATIO = 2550 / 2200

/**
 * How long a press on the drawing waits for the render before standing the
 * plan up regardless. The render is warmed the moment the residence opens, so
 * this is all but always already spent; it exists so that a press on a cold
 * cache waits a moment rather than building the plan up around a file that
 * has not arrived.
 */
const RENDER_WAIT = 900

const settle = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

/**
 * The individual residence.
 *
 * Left: where it is (the level), what it is (the brochure's own residence
 * name, and its letter where the brochure is consistent about it) and the
 * way back. Right: the supplied unit plan, shown as the copy
 * `PLAN_PRESENTATION` names for it — the original, on its own white paper,
 * exactly as delivered — held in a sheet that stays put in the dark frame
 * while `usePlanViewer` zooms and pans the drawing inside it. Lazily loaded,
 * only ever the file `residences-map.json` links to or
 * `unitPlanVerification.ts` confirms. The plan prints the brochure's own
 * area figures; nothing is transcribed from it, because the package carries
 * no such data to verify against.
 *
 * The sheet (`figure`) is the one box the explorer animates in and out, and
 * whatever renders inside it — the drawing in its zoom wrapper — is its own
 * concern. Where the package supplies a 3D render of the residence, the
 * DRAWING ITSELF is the control: a press on it stands the plan up into the
 * render inside that same box, and a press on the render lays it back down
 * (`PlanMorph`, registered by `unit3dViews.ts`). Where none is supplied the
 * sheet renders the drawing alone and says so in a line under the metadata.
 *
 * It was a "View in 3D" button beside the metadata, and the client asked for
 * the button to go and the picture to answer instead. Two things follow from
 * that and are done below: the viewer's double-press zoom is declined here
 * (`stepZoom: false`), or a double-click would toggle the view twice and step
 * the zoom at the same time; and the drawing carries the button's role,
 * pressed state and keyboard handling, so it is still a control rather than
 * merely a clickable region.
 */
export const ResidencePlanView = forwardRef<HTMLButtonElement, Props>(function ResidencePlanView(
  { level, hotspot, interactive, reducedMotion, onBack },
  backRef,
) {
  const src = hotspot ? unitPlanImage(hotspot) : null
  const [ratio, learnRatio] = useImageRatio(src, FALLBACK_RATIO)
  const { areaRef, sheetRef: figureRef } = useSheetFit({ ratio, fill: 0.96 })
  const contentRef = useRef<HTMLDivElement | null>(null)
  // The sheet is its own viewport: the paper's edge is where the drawing clips.
  // The double press belongs to nothing here — the single press turns the plan
  // into its render — so the viewer keeps the wheel, the drag and the pinch.
  const viewer = usePlanViewer({
    viewportRef: figureRef,
    frameRef: figureRef,
    contentRef,
    enabled: interactive,
    stepZoom: false,
  })

  const residence = hotspot?.residence ?? null
  const variant = hotspot?.typeLabel ?? null
  const residenceId = residence?.id ?? null
  const isSold = residenceId !== null && level !== null && level.sold.has(residenceId)

  /**
   * The residence's supplied 3D render, or null where none is supplied —
   * which is every residence but one for now. Everything below is inert
   * without it.
   */
  const view3d = unit3dView(hotspot)

  /**
   * Which way this residence is being read. Held against the residence it
   * was set for, so a plan always opens flat: the next residence never
   * inherits the last one's state, and a press still in flight when the
   * residence changes lands on nothing.
   */
  const [standing, setStanding] = useState<{ id: string | null; solid: boolean; waiting: boolean }>({
    id: null,
    solid: false,
    waiting: false,
  })
  const mine = standing.id === residenceId
  const solid = mine && standing.solid
  const waiting = mine && standing.waiting

  // Warmed while the plan is being read, so the change is instant when asked for.
  useEffect(() => {
    if (view3d) void warmImage(view3d.src)
  }, [view3d])

  const toggleSolid = () => {
    if (!interactive || !view3d || !residenceId) return
    if (solid) {
      setStanding({ id: residenceId, solid: false, waiting: false })
      return
    }
    // The frame closes on the apartment from the fit, not from wherever the
    // drawing happens to have been zoomed and panned to.
    viewer.reset()
    setStanding({ id: residenceId, solid: false, waiting: true })
    void Promise.race([warmImage(view3d.src), settle(RENDER_WAIT)]).then(() => {
      setStanding((previous) =>
        previous.id === residenceId && previous.waiting ? { id: residenceId, solid: true, waiting: false } : previous,
      )
    })
  }
  const group = level
    ? level.sharesFloorplate
      ? formatLevelList([level.id, ...level.sharedWith].sort())
      : level.label
    : ''

  return (
    <section
      className="fx-res"
      data-fx-res
      aria-label={residence ? `${residence.name} plan` : 'Residence plan'}
      aria-hidden={residence ? undefined : true}
      /* As the floorplate: out of the Tab order too while nothing is open. */
      inert={residence ? undefined : true}
    >
      <div className="fx-res__head" data-fx-res-head>
        <button type="button" className="fx-plate__back" onClick={onBack} ref={backRef}>
          <span className="fx-plate__back-rule" />
          {RESIDENCE_COPY.back}
        </button>

        {level && residence && (
          <>
            <p className="fx-res__eyebrow">
              {level.label}
              {isSold && <span className="fx-res__sold">{AVAILABILITY_COPY.sold}</span>}
            </p>
            <h3 className="fx-res__title">{residence.name}</h3>
            <p className="fx-res__variant">{variant ?? hotspot?.positionLabel}</p>

            <dl className="fx-res__meta">
              <div>
                <dt>{RESIDENCE_COPY.floorplate}</dt>
                <dd>{group}</dd>
              </div>
              <div>
                <dt>{RESIDENCE_COPY.position}</dt>
                <dd>{hotspot?.positionLabel}</dd>
              </div>
            </dl>

            {/* Not a control any more — the drawing is. This only says so,
                and says which way round the plan currently is. Where no
                render was supplied it says that instead, so the visitor is
                never invited to press a picture that will not answer. */}
            <p className="fx-res__invite" data-busy={waiting || undefined} aria-hidden="true">
              <span className="fx-res__invite-rule" />
              {view3d ? (waiting ? RESIDENCE_COPY.opening3d : solid ? RESIDENCE_COPY.tapFor2d : RESIDENCE_COPY.tapFor3d) : RESIDENCE_COPY.view3dNote}
            </p>
          </>
        )}
      </div>

      <div className="fx-res__area" data-fx-res-area ref={areaRef}>
        <div className="fx-res__guides" aria-hidden="true" />
        {/* The sheet: the fixed white paper the drawing is zoomed within. */}
        <figure className="fx-res__figure fx-viewport" data-fx-res-figure data-fx-viewport ref={figureRef}>
          {/* The drawing is the control. `role`/`tabIndex`/`aria-pressed` are
              set only where there is something to press, so a residence with
              no render is not announced as a button that does nothing — and a
              press that merely concluded a pan never reaches here, because the
              viewer swallows it on the figure above (see `usePlanViewer`). */}
          <div
            className="fx-zoom"
            data-fx-zoom
            data-toggles={view3d ? '' : undefined}
            data-busy={waiting || undefined}
            ref={contentRef}
            role={view3d ? 'button' : undefined}
            tabIndex={view3d && interactive ? 0 : undefined}
            aria-pressed={view3d ? solid : undefined}
            aria-label={view3d ? (solid ? RESIDENCE_COPY.view2d : RESIDENCE_COPY.view3d) : undefined}
            onClick={view3d ? toggleSolid : undefined}
            onKeyDown={
              view3d
                ? (event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    toggleSolid()
                  }
                : undefined
            }
          >
            <PlanMorph view={view3d} solid={solid} reducedMotion={reducedMotion}>
              {residence && src && (
                <img
                  className="fx-res__image"
                  src={src}
                  alt={`${residence.name}${variant ? `, ${variant}` : ''} — official unit plan`}
                  decoding="async"
                  loading="lazy"
                  draggable={false}
                  onLoad={(event) => learnRatio(event.currentTarget)}
                  onError={(event) => {
                    const image = event.currentTarget
                    if (!hotspot?.plan) return
                    const fallback = planFallback(hotspot.plan, PLAN_PRESENTATION.unitPlan)
                    if (image.getAttribute('src') !== fallback) image.src = fallback
                  }}
                />
              )}
            </PlanMorph>
          </div>
        </figure>

        <button
          type="button"
          className="fx-viewport__reset"
          data-fx-viewer-reset
          onClick={() => viewer.reset()}
          tabIndex={interactive ? 0 : -1}
          title={VIEWER_COPY.hint}
        >
          <span className="fx-viewport__reset-rule" />
          {VIEWER_COPY.reset}
        </button>
      </div>
    </section>
  )
})
