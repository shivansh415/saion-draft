import { forwardRef, useEffect, useRef, useState } from 'react'

import { PlanMorph } from './PlanMorph'
import { RESIDENCE_COPY, VIEWER_COPY } from './floorExplorerCopy'
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
 * How long a press on "View in 3D" waits for the render before standing the
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
 * concern. Where the package supplies a 3D render of the residence,
 * "View in 3D" stands the drawing up into it inside that same box and back
 * again (`PlanMorph`, registered by `unit3dViews.ts`); where it does not,
 * the control stays the placeholder it has always been and the sheet renders
 * the drawing alone.
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
  const viewer = usePlanViewer({ viewportRef: figureRef, frameRef: figureRef, contentRef, enabled: interactive })

  const residence = hotspot?.residence ?? null
  const variant = hotspot?.typeLabel ?? null
  const residenceId = residence?.id ?? null

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
    >
      <div className="fx-res__head" data-fx-res-head>
        <button type="button" className="fx-plate__back" onClick={onBack} ref={backRef}>
          <span className="fx-plate__back-rule" />
          {RESIDENCE_COPY.back}
        </button>

        {level && residence && (
          <>
            <p className="fx-res__eyebrow">{level.label}</p>
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

            <div className="fx-res__actions">
              {view3d ? (
                <button
                  type="button"
                  className="fx-res__cta"
                  onClick={toggleSolid}
                  aria-pressed={solid}
                  aria-busy={waiting || undefined}
                  data-busy={waiting || undefined}
                  tabIndex={interactive ? 0 : -1}
                >
                  {solid ? RESIDENCE_COPY.view2d : RESIDENCE_COPY.view3d}
                  <span className="fx-res__cta-arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  className="fx-res__cta"
                  data-placeholder
                  aria-disabled="true"
                  title={RESIDENCE_COPY.view3dNote}
                >
                  {RESIDENCE_COPY.view3d}
                  <span className="fx-res__cta-arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div className="fx-res__area" data-fx-res-area ref={areaRef}>
        <div className="fx-res__guides" aria-hidden="true" />
        {/* The sheet: the fixed white paper the drawing is zoomed within. */}
        <figure className="fx-res__figure fx-viewport" data-fx-res-figure data-fx-viewport ref={figureRef}>
          <div className="fx-zoom" data-fx-zoom ref={contentRef}>
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
