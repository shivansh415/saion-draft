/**
 * The solid views — which residences have a 3D render of their plan, and
 * exactly where that render sits over the drawing it was made from.
 *
 * A residence with an entry here gains the "View in 3D" transition
 * (`PlanMorph`); a residence without one is untouched, down to the DOM it
 * renders. Adding a residence to the map is the whole of adding the
 * behaviour to it.
 *
 * ── The alignment ──────────────────────────────────────────────────────
 *
 * The morph reads as a morph only because the two images are registered to
 * each other rather than merely stacked: the supplied render is a tighter
 * crop of the same apartment, at its own scale, with none of the sheet's
 * margins, header, area figures or locator. `align` is where that render's
 * box belongs inside the drawing's box — fractions of the sheet, the same
 * space the sheet's own edge is in — so that the apartment lands on the
 * apartment, wall for wall, at rest and throughout the transition.
 *
 * The numbers are measured, not guessed: the render's dark ink is fitted
 * over the drawing's by best overlap (a scale and an offset), which puts the
 * entrance marker, the wall lines and the room labels of the two images on
 * top of one another to within a pixel or two at reading size. Measure a new
 * unit the same way rather than eyeballing it — a few pixels out and the
 * transition reads as a dissolve between two pictures instead of one plan
 * standing up.
 *
 * `fill` is the share of the sheet the render takes once it has the frame to
 * itself. Registered in place the render occupies only the part of the sheet
 * the apartment occupies, so the transition closes with a gentle push in —
 * the paper's margins and annotations leaving the frame as the solid view
 * takes it.
 */

import { assetUrl } from './floorExplorerData'
import type { UnitHotspot } from './floorExplorerData'

/** A box inside the sheet, as fractions of the sheet's own width and height. */
export interface Unit3dAlign {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

export interface Unit3dView {
  /** The supplied render. */
  readonly src: string
  /** Where it sits over the drawing. */
  readonly align: Unit3dAlign
  /** Share of the sheet it fills once the frame is its own. */
  readonly fill: number
}

/**
 * Where the frame goes when the render takes it: the transform that carries
 * the aligned render to the middle of the sheet at `fill`, applied to the
 * box both drawings share. Expressed the way GSAP takes it — an origin, a
 * scale, and a translation in per cent of that box.
 */
export interface Unit3dCamera {
  readonly transformOrigin: string
  readonly scale: number
  readonly xPercent: number
  readonly yPercent: number
}

export function unit3dCamera({ align, fill }: Unit3dView): Unit3dCamera {
  const cx = align.left + align.width / 2
  const cy = align.top + align.height / 2
  // Uniform, so the tighter of the two dimensions decides it.
  const scale = Math.min(fill / align.width, fill / align.height)
  return {
    // Scaling about the render's own centre leaves that point where it is …
    transformOrigin: `${(cx * 100).toFixed(3)}% ${(cy * 100).toFixed(3)}%`,
    scale,
    // … and this carries it to the middle of the sheet.
    xPercent: (0.5 - cx) * 100,
    yPercent: (0.5 - cy) * 100,
  }
}

/**
 * By residence id — the package's own id, as `residences-map.json` states it.
 *
 * Level 01 · 1 BHK · Type A′ (`units-web/unit-l01-05-07-11-1bhk-a-prime.webp`)
 * is the first, and for now the only one: the supplied render is
 * `…-a-prime-3d.webp`, the same apartment extruded, and the level shares its
 * floorplate with Levels 05, 07 and 11, so the same residence opens the same
 * solid view from any of them.
 */
const VIEWS: Readonly<Record<string, Unit3dView>> = {
  'l01-05-07-11-1bhk-a-prime': {
    src: assetUrl('units-web/unit-l01-05-07-11-1bhk-a-prime-3d.webp'),
    align: { left: 0.0575, top: 0.3886, width: 0.845, height: 0.677 },
    fill: 0.98,
  },
}

/** The residence's solid view, or null where none is supplied. */
export const unit3dView = (hotspot: UnitHotspot | null): Unit3dView | null =>
  (hotspot && VIEWS[hotspot.residence.id]) || null
