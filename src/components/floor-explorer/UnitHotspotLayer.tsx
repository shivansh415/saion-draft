import type { KeyboardEvent } from 'react'

import { AVAILABILITY_COPY } from './floorExplorerCopy'
import type { UnitHotspot } from './floorExplorerData'

interface Props {
  hotspots: readonly UnitHotspot[]
  /** Residence ids sold on the level on view (see `availability.ts`). */
  sold: ReadonlySet<string>
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

/** The same polygon as a CSS clip, for the hatch laid over a sold residence. */
const toClip = (polygon: UnitHotspot['polygon']): string =>
  `polygon(${polygon.map(([x, y]) => `${x}% ${y}%`).join(', ')})`

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
 *
 * A residence that has SOLD is marked on the drawing itself, the way a set
 * of plans is marked up: a fine diagonal hatch over the residence and a
 * small SOLD mark at its centre, both there whether or not anything is
 * indicated. The hatch is a clipped element rather than an SVG pattern
 * because the SVG below is stretched to the sheet (`preserveAspectRatio:
 * none`), which would stretch a pattern with it; a CSS gradient in a
 * clip-path polygon of the same percentages hatches evenly at any size.
 *
 * It indicates and reads out like any other residence, and it does not open.
 * It used to: the plan came up with SOLD printed across the heading, which
 * reads as the site offering something it cannot sell. Sold now behaves
 * exactly as an unverified mapping already did — the residence answers the
 * pointer, says what it is and says it has gone, and the press ends there.
 */
export function UnitHotspotLayer({ hotspots, sold, shown, focus, coarse, interactive, onHover, onChoose }: Props) {
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
  /** Whether a press on this residence leads anywhere. */
  const opens = (hotspot: UnitHotspot) => hotspot.plan !== null && !sold.has(hotspot.residence.id)

  return (
    <>
      {/* Under the hit-zones, so the residence beneath still answers the
          pointer; the marks themselves never take it. */}
      <div className="fx-units__sold" aria-hidden="true">
        {hotspots.map((hotspot) => {
          const id = hotspot.residence.id
          if (!sold.has(id)) return null
          return (
            <span
              key={id}
              className={`fx-sold${shown === id ? ' is-shown' : ''}`}
              style={{ clipPath: toClip(hotspot.polygon) }}
            />
          )
        })}
      </div>

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
          const isSold = sold.has(id)
          const label = `${hotspot.residence.name}, ${hotspot.typeLabel ?? hotspot.positionLabel}${
            isSold ? ` — ${AVAILABILITY_COPY.sold.toLowerCase()}` : ''
          }`
          return (
            <path
              key={id}
              d={toPath(hotspot.polygon)}
              className={`fx-unit${shown === id ? ' is-shown' : ''}${isSold ? ' is-sold' : ''}`}
              data-unit={id}
              data-open={opens(hotspot) ? 'true' : 'false'}
              data-sold={isSold || undefined}
              /* What a press here does, carried on the pointer. A sold
                 residence does not open, so it says so rather than promising
                 a plan the press will refuse. */
              data-cursor={opens(hotspot) ? 'Open residence' : isSold ? AVAILABILITY_COPY.sold : undefined}
              vectorEffect="non-scaling-stroke"
              role="button"
              tabIndex={interactive ? 0 : -1}
              aria-label={opens(hotspot) ? `${label} — view residence` : label}
              aria-disabled={opens(hotspot) ? undefined : true}
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

      {/* The indicated residence's tag, at its centroid — and, on a sold
          residence, the SOLD mark, which is always there. The two share the
          point: the mark carries the letter itself, so nothing overlaps. */}
      <div className="fx-units__tags" aria-hidden="true">
        {hotspots.map((hotspot) => {
          const id = hotspot.residence.id
          const tag = hotspot.tag
          const at = { left: `${hotspot.labelAt[0]}%`, top: `${hotspot.labelAt[1]}%` }
          if (sold.has(id)) {
            return (
              <span key={id} className={`fx-unit-sold${shown === id ? ' is-shown' : ''}`} style={at}>
                {tag && <span className="fx-unit-sold__tag">{tag}</span>}
                <span className="fx-unit-sold__word">{AVAILABILITY_COPY.sold}</span>
              </span>
            )
          }
          if (!tag) return null
          return (
            <span key={id} className={`fx-unit-tag${shown === id ? ' is-shown' : ''}`} style={at}>
              {tag}
            </span>
          )
        })}
      </div>
    </>
  )
}
