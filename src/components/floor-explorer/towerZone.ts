/**
 * Reposé Residence — where the building is interactive, and where it is not.
 *
 * Everything here is DERIVED from `levelCalibration.ts`; not one number is
 * restated. If the tower is ever recalibrated, this follows it.
 *
 * The frame holds three things: the residential tower, the podium and
 * entrance below it, and the sky and streetscape around both. Only the first
 * belongs to the floor explorer. The second is deliberately left alone — it
 * is where "Enter Reposé" will live — and the third belongs to nothing.
 */

import { ROOF_Y, TOWER_EDGES, levelCalibration } from './levelCalibration'

/**
 * The residential tower's envelope, as % of the building image: the roof slab
 * down to Level 01's floor line, between the silhouette edges at each height.
 *
 * These are the same two lines the level bands are drawn between, so the zone
 * is exactly the stack of levels and nothing else — no sky, no podium, no
 * entrance, no streetscape.
 */
export const TOWER_ZONE: readonly (readonly [number, number])[] = [
  [TOWER_EDGES.top.left, ROOF_Y],
  [TOWER_EDGES.top.right, ROOF_Y],
  [TOWER_EDGES.bottom.right, TOWER_EDGES.bottom.y],
  [TOWER_EDGES.bottom.left, TOWER_EDGES.bottom.y],
]

/** The same envelope as a clip-path, which clips hit-testing as well as paint. */
export const TOWER_CLIP_PATH = `polygon(${TOWER_ZONE.map(([x, y]) => `${x}% ${y}%`).join(', ')})`

/** The tower's horizontal centre at a given height, % of the image. */
export function towerCentreAt(y: number): number {
  const { top, bottom } = TOWER_EDGES
  const t = Math.min(1, Math.max(0, (y - top.y) / (bottom.y - top.y)))
  const left = top.left + (bottom.left - top.left) * t
  const right = top.right + (bottom.right - top.right) * t
  return (left + right) / 2
}

/**
 * The ground plane: everything below Level 01's slab — podium, colonnade,
 * forecourt, road. The explorer never claims it. Moving the pointer down here
 * is how a visitor asks for the clean building back.
 */
export const GROUND_Y = Math.round((levelCalibration['01'].y + 2.8) * 100) / 100 // 71.97

/**
 * The lobby entrance, measured off the completed render: the lit portal and
 * its glass doors, right of centre under the podium colonnade.
 *
 * Nothing uses this yet. It is recorded here so that the later "Enter Reposé"
 * hotspot has the geometry waiting for it, and so that anyone changing the
 * explorer's reach can see what must stay free. It sits wholly inside the
 * ground plane above, which is why the explorer already leaves it alone.
 */
export const ENTRANCE_RESERVE = { x0: 58, y0: 76, x1: 71, y1: 93 } as const

/** Where the touch invitation sits: centred on the tower, on its lower storeys. */
export const INVITE_Y = 60
export const INVITE_X = towerCentreAt(INVITE_Y)

/**
 * The podium's louvred band — the horizontal volume the tower stands on, which
 * is where the amenities are. Measured off the render the way the level lines
 * were: the vertical fins give the band a strong horizontal high-frequency
 * signature, which runs from just under the tower's base (`GROUND_Y`) to the
 * head of the ground-floor glazing.
 */
export const PODIUM_BAND = { top: 71.5, bottom: 82.5 } as const

/**
 * Where the amenities cue sits.
 *
 * The building says which is which, so the cues follow it: the tower is
 * residences, the podium is amenities, the portal is the reception. This one
 * therefore sits on the podium — wholly below `TOWER_ZONE`, so the residential
 * envelope and every level band inside it stay free for the floor explorer —
 * at the band's mid-height, and mirrored across the building's centre line
 * from the entrance, so the two ground-level cues sit either side of the tower
 * and neither can reach the other.
 *
 * Both numbers are derived from what is already calibrated here: the tower's
 * own silhouette at its base, and the entrance reserve. Recalibrate either and
 * the cue follows.
 */
export const AMENITIES_Y = (PODIUM_BAND.top + PODIUM_BAND.bottom) / 2
export const AMENITIES_X =
  2 * towerCentreAt(TOWER_EDGES.bottom.y) - (ENTRANCE_RESERVE.x0 + ENTRANCE_RESERVE.x1) / 2
