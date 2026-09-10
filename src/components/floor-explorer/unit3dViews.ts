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
 * By residence id — the package's own id, as `residences-map.json` states it,
 * plus the links `unitPlanVerification.ts` confirms.
 *
 * Every residence the package draws is here — thirty-five of them.
 *
 * `l14-3bed-a-prime` (Level 14, right wing) was the late one. Its first render
 * was a horizontal mirror of its own drawing and was refused; the replacement
 * supplied on 10 Sep matches the drawing on all twelve printed dimension
 * strings and on the entrance side, and is the one registered here.
 *
 * One residence still has no entry, and it is not for want of a render:
 * `l13-3bed-a-prime` (Level 13, right wing) has no DRAWING of its own. The
 * sheet offered for it, `unit-l13-3bhk-maidroom-a-prime.webp`, prints Level
 * 14's right-wing figures exactly — BATH 1.5x1.5, MAID 1.8x2.1, BEDROOM
 * 3.8x4.2, and areas 1691.33 / 660.58 / 2351.91 sq ft — where Level 13's own
 * wing prints 1.5x1.2, 1.8x1.85, 3.8x4.3 and 1691.44 / 645.19 / 2336.63. The
 * two floors demonstrably differ, so that sheet is Level 14's, relabelled, and
 * wiring it would publish one floor's apartment and areas as another's. That
 * residence keeps its placeholder until a genuine Level 13 right-wing drawing
 * exists to render from.
 *
 * ── How `align` was arrived at ─────────────────────────────────────────
 *
 * Measured, not eyeballed, and per residence: the render's edges are fitted
 * over the drawing's by a symmetric chamfer — the distance from every render
 * edge to the nearest drawing edge AND from every drawing edge (inside the
 * drawing's own plan area, so the sheet's area figures and locator do not
 * count against it) to the nearest render edge. The second half is what keeps
 * the fit honest: a one-way fit is minimised by shrinking the render onto the
 * densest part of the drawing, which is exactly the failure it used to have.
 *
 * Judge a new one on the printed DIMENSION strings ("4.6x3.1 m"), never on the
 * room names: the drawing letter-spaces its room names and the render does
 * not, so "LIVING + DINING" can never sit on "L I V I N G + D I N I N G" and
 * a fit that makes it look as though it does is a fit that is wrong.
 */
const VIEWS: Readonly<Record<string, Unit3dView>> = {
  'l01-05-07-11-1bhk-a': {
    src: assetUrl('units-3d/unit-l01-05-07-11-1bhk-a-3d.webp'),
    align: { left: -0.0713, top: 0.1374, width: 0.9707, height: 0.9249 },
    fill: 0.98,
  },
  'l01-05-07-11-1bhk-a-prime': {
    src: assetUrl('units-3d/unit-l01-05-07-11-1bhk-a-prime-3d.webp'),
    align: { left: -0.1838, top: 0.0934, width: 1.0225, height: 0.9464 },
    fill: 0.98,
  },
  'l01-05-07-11-1bhk-study-b': {
    src: assetUrl('units-3d/unit-l01-05-07-11-1bhk-study-b-3d.webp'),
    align: { left: -0.1627, top: 0.0653, width: 1.1287, height: 0.9356 },
    fill: 0.98,
  },
  'l01-05-07-11-1bhk-study-b-prime': {
    src: assetUrl('units-3d/unit-l01-05-07-11-1bhk-study-b-prime-3d.webp'),
    align: { left: -0.1522, top: 0.0691, width: 1.0703, height: 0.9049 },
    fill: 0.98,
  },
  'l01-05-07-11-2bhk-maidroom-a': {
    src: assetUrl('units-3d/unit-l01-05-07-11-2bhk-maidroom-a-3d.webp'),
    align: { left: 0.0030, top: 0.0125, width: 0.9999, height: 1.0250 },
    fill: 0.98,
  },
  'l01-05-07-11-2bhk-maidroom-a-prime': {
    src: assetUrl('units-3d/unit-l01-05-07-11-2bhk-maidroom-a-prime-3d.webp'),
    align: { left: -0.0160, top: 0.0449, width: 1.0195, height: 0.9739 },
    fill: 0.98,
  },
  'l02-04-08-10-1bhk-a': {
    src: assetUrl('units-3d/unit-l02-04-08-10-1bhk-a-3d.webp'),
    align: { left: -0.0635, top: 0.1051, width: 1.0080, height: 0.9458 },
    fill: 0.98,
  },
  'l02-04-08-10-1bhk-a-prime': {
    src: assetUrl('units-3d/unit-l02-04-08-10-1bhk-a-prime-3d.webp'),
    align: { left: -0.1381, top: 0.1213, width: 0.9784, height: 0.8990 },
    fill: 0.98,
  },
  'l02-04-08-10-1bhk-study-b': {
    src: assetUrl('units-3d/unit-l02-04-08-10-1bhk-study-b-3d.webp'),
    align: { left: -0.1513, top: 0.1243, width: 1.0838, height: 0.8644 },
    fill: 0.98,
  },
  'l02-04-08-10-1bhk-study-b-prime': {
    src: assetUrl('units-3d/unit-l02-04-08-10-1bhk-study-b-prime-3d.webp'),
    align: { left: -0.1458, top: 0.0928, width: 1.0638, height: 0.8946 },
    fill: 0.98,
  },
  'l02-04-08-10-2bhk-maidroom-a': {
    src: assetUrl('units-3d/unit-l02-04-08-10-2bhk-maidroom-a-3d.webp'),
    align: { left: 0.0013, top: 0.0027, width: 0.9964, height: 1.0198 },
    fill: 0.98,
  },
  'l02-04-08-10-2bhk-maidroom-a-prime': {
    src: assetUrl('units-3d/unit-l02-04-08-10-2bhk-maidroom-a-prime-3d.webp'),
    align: { left: -0.0158, top: 0.0195, width: 0.9875, height: 0.9877 },
    fill: 0.98,
  },
  'l03-09-1bhk-a': {
    src: assetUrl('units-3d/unit-l03-09-1bhk-a-3d.webp'),
    align: { left: -0.0786, top: 0.0874, width: 1.0487, height: 0.9928 },
    fill: 0.98,
  },
  'l03-09-1bhk-a-prime': {
    src: assetUrl('units-3d/unit-l03-09-1bhk-a-prime-3d.webp'),
    align: { left: -0.1481, top: 0.1045, width: 0.9664, height: 0.8311 },
    fill: 0.98,
  },
  'l03-09-1bhk-study-b': {
    src: assetUrl('units-3d/unit-l03-09-1bhk-study-b-3d.webp'),
    align: { left: -0.1785, top: 0.0638, width: 1.1444, height: 0.9443 },
    fill: 0.98,
  },
  'l03-09-1bhk-study-b-prime': {
    src: assetUrl('units-3d/unit-l03-09-1bhk-study-b-prime-3d.webp'),
    align: { left: -0.1777, top: 0.0537, width: 1.1172, height: 0.9382 },
    fill: 0.98,
  },
  'l03-09-2bhk-maidroom-a': {
    src: assetUrl('units-3d/unit-l03-09-2bhk-maidroom-a-3d.webp'),
    align: { left: -0.0030, top: 0.0209, width: 1.0061, height: 1.0494 },
    fill: 0.98,
  },
  'l03-09-2bhk-maidroom-a-prime': {
    src: assetUrl('units-3d/unit-l03-09-2bhk-maidroom-a-prime-3d.webp'),
    align: { left: -0.0198, top: 0.0364, width: 1.0065, height: 0.9682 },
    fill: 0.98,
  },
  'l06-1bhk-a': {
    src: assetUrl('units-3d/unit-l06-1bhk-a-3d.webp'),
    align: { left: -0.0711, top: 0.0835, width: 1.0510, height: 0.9943 },
    fill: 0.98,
  },
  'l06-1bhk-a-prime': {
    src: assetUrl('units-3d/unit-l06-1bhk-a-prime-3d.webp'),
    align: { left: -0.1847, top: 0.0940, width: 1.0249, height: 0.9719 },
    fill: 0.98,
  },
  'l06-1bhk-study-b': {
    src: assetUrl('units-3d/unit-l06-1bhk-study-b-3d.webp'),
    align: { left: -0.1911, top: 0.0681, width: 1.1726, height: 0.9762 },
    fill: 0.98,
  },
  'l06-1bhk-study-b-prime': {
    src: assetUrl('units-3d/unit-l06-1bhk-study-b-prime-3d.webp'),
    align: { left: -0.1462, top: 0.0675, width: 1.0656, height: 0.8961 },
    fill: 0.98,
  },
  'l06-2bhk-maidroom-a': {
    src: assetUrl('units-3d/unit-l06-2bhk-maidroom-a-3d.webp'),
    align: { left: 0.0186, top: 0.0475, width: 0.9815, height: 0.9494 },
    fill: 0.98,
  },
  'l06-2bhk-maidroom-a-prime': {
    src: assetUrl('units-3d/unit-l06-2bhk-maidroom-a-prime-3d.webp'),
    align: { left: -0.0259, top: 0.0653, width: 0.9986, height: 0.9494 },
    fill: 0.98,
  },
  'l12-3bed-a': {
    src: assetUrl('units-3d/unit-l12-3bhk-maidroom-b-3d.webp'),
    align: { left: -0.0698, top: 0.1341, width: 0.9041, height: 0.8389 },
    fill: 0.98,
  },
  'l12-3bed-a-prime': {
    src: assetUrl('units-3d/unit-l12-3bhk-maidroom-b-prime-3d.webp'),
    align: { left: -0.2268, top: 0.1355, width: 1.1081, height: 0.8515 },
    fill: 0.98,
  },
  'l12-3bed-b': {
    src: assetUrl('units-3d/unit-l12-3bhk-maidroom-a-3d.webp'),
    align: { left: -0.0003, top: 0.1015, width: 0.7830, height: 0.8251 },
    fill: 0.98,
  },
  'l13-3bed-a': {
    src: assetUrl('units-3d/unit-l13-3bhk-maidroom-b-3d.webp'),
    align: { left: -0.0875, top: 0.0709, width: 1.0023, height: 0.9143 },
    fill: 0.98,
  },
  'l13-3bed-b': {
    src: assetUrl('units-3d/unit-l13-3bhk-maidroom-a-3d.webp'),
    align: { left: 0.0817, top: 0.0904, width: 0.7385, height: 0.8531 },
    fill: 0.98,
  },
  'l14-3bed-a': {
    src: assetUrl('units-3d/unit-l14-3bhk-maidroom-b-3d.webp'),
    align: { left: -0.0998, top: 0.0629, width: 1.0140, height: 0.9452 },
    fill: 0.98,
  },
  'l14-3bed-b': {
    src: assetUrl('units-3d/unit-l14-3bhk-maidroom-a-3d.webp'),
    align: { left: -0.0155, top: 0.0946, width: 0.7991, height: 0.8442 },
    fill: 0.98,
  },
  'l14-3bed-a-prime': {
    src: assetUrl('units-3d/unit-l14-3bhk-maidroom-b-prime-3d.webp'),
    align: { left: -0.1969, top: 0.1065, width: 1.1287, height: 0.8734 },
    fill: 0.98,
  },
  'l15-2bed-c': {
    src: assetUrl('units-3d/unit-l15-2bhk-maidroom-b-3d.webp'),
    align: { left: 0.0049, top: 0.0753, width: 0.7729, height: 0.8164 },
    fill: 0.98,
  },
  'l15-3bed-variant-unstated': {
    src: assetUrl('units-3d/unit-l15-3bhk-penthouse-jacuzzi-a-3d.webp'),
    align: { left: -0.1751, top: 0.1237, width: 0.8450, height: 0.7488 },
    fill: 0.98,
  },
  'l15-4bed-a': {
    src: assetUrl('units-3d/unit-l15-4bhk-penthouse-jacuzzi-a-3d.webp'),
    align: { left: -0.0635, top: 0.1339, width: 0.8040, height: 0.8478 },
    fill: 0.98,
  },
}

/** The residence's solid view, or null where none is supplied. */
export const unit3dView = (hotspot: UnitHotspot | null): Unit3dView | null =>
  (hotspot && VIEWS[hotspot.residence.id]) || null
