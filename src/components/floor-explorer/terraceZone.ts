/**
 * Reposé Residence — the terrace destination on the building.
 *
 * The floor explorer stops at Level 15. Above it the render still has one
 * more thing to offer: the crown that sits on the roof slab. That crown is
 * the terrace's mark on the building — the destination the selector points
 * at when the visitor travels above the last residential level.
 *
 * It is NOT Level 16. It carries no calibration of its own beyond the one
 * number that could not be derived — where the crown's silhouette begins —
 * and everything else follows `levelCalibration.ts`, exactly as `towerZone`
 * does. Recalibrate the tower and this follows it.
 */

/**
 * PRODUCTION FLOW — OFF.
 *
 * The client clarified at the final review that what this was treating as the
 * "Open Terrace" is in fact the AMENITIES MAP, which is now presented as its
 * own chapter in the lifestyle journey (see `repose/sections/Story` →
 * `AmenitiesMap`). So the building no longer offers a terrace destination:
 * no crown hotspot, no `TR` in the level rail, no "View terrace" cue, and the
 * three.js chapter is never mounted or fetched.
 *
 * The flag rather than a deletion is deliberate. Everything the prototype
 * needs — the calibration below, `components/terrace/*`, the supplied GLB —
 * is correct and was expensive to derive; it is disconnected, not discarded.
 * Turning it back on is this one line, and nothing else has to be rebuilt.
 *
 * Levels 01–15 are untouched by this: the flag gates only the terrace's own
 * marks, and every residential band still comes from `levelCalibration`.
 */
export const TERRACE_ENABLED: boolean = false

import { ROOF_Y, TOWER_EDGES } from './levelCalibration'
import type { LevelId } from './levelCalibration'
import { bandPx } from './levelGeometry'
import type { BandPx } from './levelGeometry'
import type { CoverRect } from './useCoverRect'

/**
 * The top of the roof crown, % of the building image.
 *
 * Measured off the completed render the way the slab lines were: the crown's
 * silhouette is read against the sky down the frame's centre, and the first
 * row that is no longer sky is 4.2%. Below it the crown widens to the tower's
 * own top edges by `ROOF_Y`, which is why only this one number is stated.
 */
export const CROWN_TOP = 4.2

/**
 * The terrace's band on the building: the crown, from its silhouette down to
 * the roof slab the level bands already stop at, between the tower's top
 * edges. Same shape as a `LevelBand`, so everything the selector already does
 * with a level's band works on this one unchanged.
 */
export const TERRACE_BAND = {
  y: ROOF_Y,
  top: CROWN_TOP,
  left: TOWER_EDGES.top.left,
  right: TOWER_EDGES.top.right,
} as const

/** The crown's envelope as a clip-path, which clips hit-testing as well as paint. */
export const TERRACE_CLIP_PATH = `polygon(${TERRACE_BAND.left}% ${TERRACE_BAND.top}%, ${TERRACE_BAND.right}% ${TERRACE_BAND.top}%, ${TERRACE_BAND.right}% ${TERRACE_BAND.y}%, ${TERRACE_BAND.left}% ${TERRACE_BAND.y}%)`

/**
 * The middle of the crown, % of the image — where the rise takes off from and
 * where it lands back on the way down.
 */
export const TERRACE_FOCUS = {
  x: (TERRACE_BAND.left + TERRACE_BAND.right) / 2,
  y: (TERRACE_BAND.top + TERRACE_BAND.y) / 2,
} as const

/** What the selector can be pointing at: a residential level, or the terrace. */
export const TERRACE_ID = 'TERRACE'
export type Marker = LevelId | typeof TERRACE_ID

export const isTerrace = (marker: Marker | null): marker is typeof TERRACE_ID => marker === TERRACE_ID

/** The terrace band in the pixels the still is actually painted in. */
export function terraceBandPx(rect: CoverRect): BandPx {
  return {
    lineY: rect.y + (rect.height * TERRACE_BAND.y) / 100,
    topY: rect.y + (rect.height * TERRACE_BAND.top) / 100,
    x0: rect.x + (rect.width * TERRACE_BAND.left) / 100,
    x1: rect.x + (rect.width * TERRACE_BAND.right) / 100,
  }
}

/** One band lookup for both kinds of destination. */
export function markerBandPx(marker: Marker, rect: CoverRect): BandPx {
  return isTerrace(marker) ? terraceBandPx(rect) : bandPx(marker, rect)
}

/** The crown's focal point in the same pixels — the origin of the rise. */
export function terraceFocusPx(rect: CoverRect): { x: number; y: number } {
  return {
    x: rect.x + (rect.width * TERRACE_FOCUS.x) / 100,
    y: rect.y + (rect.height * TERRACE_FOCUS.y) / 100,
  }
}
