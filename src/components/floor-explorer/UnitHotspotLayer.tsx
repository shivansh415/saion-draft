import type { KeyboardEvent } from 'react'

import type { UnitHotspot } from './floorExplorerData'

interface Props {
  hotspots: readonly UnitHotspot[]
  /** Residence currently indicated (hovered, focused, tapped or opening). */
  shown: string | null
  /** True while a residence is opening or open: the rest of the plate recedes further. */
  focus: boolean
  /** Coarse pointer: no hover, a first tap indicates, a second opens. */
  coarse: boolean
  interactive: boolean
  onHover: (residenceId: string | null) => void
  onChoose: (hotspot: UnitHotspot) => void
}

/** "M x y L x y … Z" from a percentage polygon. */
const toPath = (polygon: UnitHotspot['polygon']): string =>
  polygon.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`).join(' ') + ' Z'

/**
 * The residences drawn over a floorplate.
 *
 * One SVG, its 0–100 viewBox stretched over the sheet so the polygons in
 * `unitHotspots.ts` land on the drawing at any size; strokes are kept
 * hairline by `non-scaling-stroke`. Nothing is painted until a residence is
 * indicated — then the others rest under a wash of the sheet's own tone and
 * the indicated one is outlined, so the plan itself is never covered.
 *
 * A residence without a verified unit plan indicates and reads out exactly
 * like the others; it simply does not open (see `UnitHotspot.plan`).
 */
export function UnitHotspotLayer({ hotspots, shown, focus, coarse, interactive, onHover, onChoose }: Props) {
  const enter = (id: string) => {
    if (!coarse && interactive) onHover(id)
  }
  const leave = () => {
    if (!coarse && interactive) onHover(null)
  }
  const key = (event: KeyboardEvent, hotspot: UnitHotspot) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (interactive) onChoose(hotspot)
    }
  }

  return (
    <>
      <svg
        className="fx-units"
        data-fx-units
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        data-shown={shown ?? undefined}
        data-focus={focus || undefined}
        aria-label="Residences on this floor"
        role="group"
      >
        {hotspots.map((hotspot) => {
          const id = hotspot.residence.id
          const label = `${hotspot.residence.name}, ${hotspot.typeLabel ?? hotspot.positionLabel}`
          return (
            <path
              key={id}
              d={toPath(hotspot.polygon)}
              className={`fx-unit${shown === id ? ' is-shown' : ''}`}
              data-unit={id}
              data-open={hotspot.plan ? 'true' : 'false'}
              vectorEffect="non-scaling-stroke"
              role="button"
              tabIndex={interactive ? 0 : -1}
              aria-label={hotspot.plan ? `${label} — view residence` : label}
              aria-disabled={hotspot.plan ? undefined : true}
              onPointerEnter={() => enter(id)}
              onPointerLeave={leave}
              onFocus={() => interactive && onHover(id)}
              onBlur={() => interactive && onHover(null)}
              onClick={() => interactive && onChoose(hotspot)}
              onKeyDown={(event) => key(event, hotspot)}
            />
          )
        })}
      </svg>

      {/* The indicated residence's tag, at its centroid. */}
      <div className="fx-units__tags" aria-hidden="true">
        {hotspots.map((hotspot) => {
          const id = hotspot.residence.id
          const tag = hotspot.tag
          if (!tag) return null
          return (
            <span
              key={id}
              className={`fx-unit-tag${shown === id ? ' is-shown' : ''}`}
              style={{ left: `${hotspot.labelAt[0]}%`, top: `${hotspot.labelAt[1]}%` }}
            >
              {tag}
            </span>
          )
        })}
      </div>
    </>
  )
}
