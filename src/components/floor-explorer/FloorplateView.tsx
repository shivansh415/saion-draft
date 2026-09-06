import { forwardRef, useRef, useState } from 'react'

import { PLATE_COPY, VIEWER_COPY } from './floorExplorerCopy'
import { PLAN_PRESENTATION, floorplateImage, formatLevelList, formatResidenceTypes, planFallback } from './floorExplorerData'
import type { Level, UnitHotspot } from './floorExplorerData'
import { UnitHotspotLayer } from './UnitHotspotLayer'
import { usePlanViewer } from './usePlanViewer'
import { useImageRatio, useSheetFit } from './useSheetFit'

interface Props {
  /** The level on view, or null while the view is idle. */
  level: Level | null
  /** Residence currently indicated on the plate. */
  shownUnit: string | null
  /** Residence the visitor has committed to (a tap on touch, or the one open). */
  selectedUnit: string | null
  /** True while a residence is opening or open. */
  residenceFocus: boolean
  /** True while the plate may take input. */
  interactive: boolean
  coarse: boolean
  onUnitHover: (residenceId: string | null) => void
  onUnitChoose: (hotspot: UnitHotspot) => void
  onBack: () => void
}

/** Until a plate's own dimensions are known; every supplied plate is within 3% of this. */
const FALLBACK_RATIO = 4919 / 2650

/**
 * Phase 3 — the floorplate.
 *
 * The supplied drawing floats directly over the dark scene: the explorer
 * shows the copy `PLAN_PRESENTATION` names for floorplates — the relit one
 * (paper keyed out, ink relit for a dark ground — see
 * `scripts/relight-plans.py`), which keeps every pixel where the original has
 * it, so the residence hotspots are laid over it in plain percentages of the
 * drawing. The figure is sized to the drawing's own aspect ratio and centred
 * in its area; there is no sheet, frame or fill behind it.
 *
 * Inside the figure, the drawing and its hotspots share one wrapper that
 * `usePlanViewer` zooms and pans, clipped by the area; the figure itself is
 * the fit the viewer works from and the box the explorer animates. The
 * figure and head are animated by the explorer through their data
 * attributes; this component holds no motion of its own.
 */
export const FloorplateView = forwardRef<HTMLButtonElement, Props>(function FloorplateView(
  { level, shownUnit, selectedUnit, residenceFocus, interactive, coarse, onUnitHover, onUnitChoose, onBack },
  backRef,
) {
  const src = level ? floorplateImage(level.floorplate) : null
  const [ratio, learnRatio] = useImageRatio(src, FALLBACK_RATIO)
  const { areaRef, sheetRef: figureRef } = useSheetFit({ ratio, fill: 0.92 })
  const contentRef = useRef<HTMLDivElement | null>(null)
  const viewer = usePlanViewer({ viewportRef: areaRef, frameRef: figureRef, contentRef, enabled: interactive, readable: true })

  const hotspots = level?.floorplate.hotspots ?? []

  // The readout keeps the last residence it showed while it fades.
  const [lastUnit, setLastUnit] = useState<string | null>(null)
  if (shownUnit && shownUnit !== lastUnit) setLastUnit(shownUnit)
  const readoutId = shownUnit ?? lastUnit
  const readout = readoutId ? (hotspots.find((hotspot) => hotspot.residence.id === readoutId) ?? null) : null

  return (
    <section
      className="fx-plate"
      data-fx-plate
      aria-label={level ? `${level.label} floorplate` : 'Floorplate'}
      aria-hidden={level ? undefined : true}
    >
      {/* Fine technical grid behind the sheet, fading toward the margins. */}
      <div className="fx-plate__grid" data-fx-grid aria-hidden="true" />

      <div className="fx-plate__head" data-fx-plate-head>
        <button type="button" className="fx-plate__back" onClick={onBack} ref={backRef}>
          <span className="fx-plate__back-rule" />
          {PLATE_COPY.back}
        </button>

        {level && (
          <>
            <h3 className="fx-plate__title">{level.label}</h3>
            <p className="fx-plate__types">{formatResidenceTypes(level.residenceTypes)}</p>
            {level.sharesFloorplate && (
              <p className="fx-plate__shared">
                {PLATE_COPY.shared} {formatLevelList(level.sharedWith)}
              </p>
            )}

            {/* Live readout of the indicated residence. */}
            <div className="fx-plate__unit" data-visible={shownUnit ? 'true' : 'false'} aria-live="polite">
              {readout && (
                <>
                  <span className="fx-plate__unit-rule" />
                  <span className="fx-plate__unit-name">{readout.residence.name}</span>
                  <span className="fx-plate__unit-variant">{readout.typeLabel ?? readout.positionLabel}</span>
                  {readout.plan ? (
                    coarse &&
                    selectedUnit === readout.residence.id && (
                      <button type="button" className="fx__open" onClick={() => onUnitChoose(readout)}>
                        <span className="fx__open-rule" />
                        {PLATE_COPY.openUnit}
                      </button>
                    )
                  ) : (
                    <span className="fx-plate__unit-pending">{PLATE_COPY.pending}</span>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div
        className="fx-plate__area fx-viewport"
        data-fx-plate-area
        data-fx-viewport
        ref={areaRef}
      >
        <div className="fx-plate__guides" aria-hidden="true" />
        <figure className="fx-plate__figure" data-fx-plate-figure ref={figureRef}>
          <div className="fx-zoom" data-fx-zoom ref={contentRef}>
            {level && src && (
              <img
                className="fx-plate__image"
                src={src}
                alt={`${level.label} — official floorplate`}
                decoding="async"
                draggable={false}
                onLoad={(event) => learnRatio(event.currentTarget)}
                onError={(event) => {
                  // The presented copy is missing (relight script not run): show the other.
                  const image = event.currentTarget
                  const fallback = planFallback(level.floorplate.images, PLAN_PRESENTATION.floorplate)
                  if (image.getAttribute('src') !== fallback) image.src = fallback
                }}
              />
            )}
            <UnitHotspotLayer
              hotspots={hotspots}
              shown={shownUnit}
              focus={residenceFocus}
              coarse={coarse}
              interactive={interactive}
              onHover={onUnitHover}
              onChoose={onUnitChoose}
            />
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
