import { forwardRef } from 'react'

import { RESIDENCE_COPY } from './floorExplorerCopy'
import { formatLevelList } from './floorExplorerData'
import type { Level, UnitHotspot } from './floorExplorerData'
import { useImageRatio, useSheetFit } from './useSheetFit'

interface Props {
  level: Level | null
  /** The residence on view — always one with a verified plan — or null while idle. */
  hotspot: UnitHotspot | null
  onBack: () => void
}

/** Until a plan's own dimensions are known; the supplied unit plans sit between 1.0 and 1.5. */
const FALLBACK_RATIO = 2550 / 2200

/**
 * The individual residence.
 *
 * Left: where it is (the level), what it is (the brochure's own residence
 * name, and its letter where the brochure is consistent about it) and the
 * way back. Right: the supplied unit plan, relit for the dark ground and
 * floating over it — lazily loaded, only ever the file `residences-map.json`
 * links to or `unitPlanVerification.ts` confirms. The plan prints the
 * brochure's own area figures; nothing is transcribed from it, because the
 * package carries no such data to verify against.
 *
 * "View in 3D" is a placeholder for the next chapter and does nothing yet.
 */
export const ResidencePlanView = forwardRef<HTMLButtonElement, Props>(function ResidencePlanView(
  { level, hotspot, onBack },
  backRef,
) {
  const src = hotspot?.planRelit ?? null
  const [ratio, learnRatio] = useImageRatio(src, FALLBACK_RATIO)
  const { areaRef, sheetRef: figureRef } = useSheetFit({ ratio, fill: 0.98 })

  const residence = hotspot?.residence ?? null
  const variant = hotspot?.typeLabel ?? null
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
            </div>
          </>
        )}
      </div>

      <div className="fx-res__area" data-fx-res-area ref={areaRef}>
        <div className="fx-res__guides" aria-hidden="true" />
        <figure className="fx-res__figure" data-fx-res-figure ref={figureRef}>
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
                if (hotspot?.plan && image.getAttribute('src') !== hotspot.plan) image.src = hotspot.plan
              }}
            />
          )}
        </figure>
      </div>
    </section>
  )
})
