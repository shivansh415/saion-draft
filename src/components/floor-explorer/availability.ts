import type { LevelId } from './levelCalibration'

/**
 * Sales availability, from the developer's list.
 *
 * Source: "Repose Residence Availability List", SAION Properties, dated
 * 16 June 2026 — one row per unit, priced or marked SOLD. What is here is
 * exactly that list and nothing inferred from it: a unit is sold because the
 * list says SOLD against it. The three penthouses on Level 15 carry neither a
 * price nor a mark in the list, so they are shown as they always were.
 *
 * To update from a newer list: replace `SOLD_UNITS` with the new list's SOLD
 * unit numbers and the date. Nothing else changes.
 */
export const AVAILABILITY_AS_OF = '16 June 2026'

const SOLD_UNITS: readonly string[] = [
  // 3rd and 5th
  '305',
  '505',
  // 6th
  '603', '604', '605', '606',
  // 7th
  '702', '705', '706',
  // 8th
  '802', '804', '805', '806',
  // 9th — every residence
  '901', '902', '903', '904', '905', '906',
  // 10th
  '1001', '1002', '1003', '1005', '1006',
  // 11th — every residence
  '1101', '1102', '1103', '1104', '1105', '1106',
  // 12th – 14th
  '1202', '1203',
  '1303',
  '1401', '1403',
]

/**
 * Where the list's unit numbers sit on the plate.
 *
 * The list numbers a floor's units 01 → 06 and names each one's type and
 * view; the package names each residence's `floorplatePosition`. The two
 * were reconciled through the views and the printed areas, never through the
 * brochure's variant letters (which `residences-map.json` itself records as
 * in dispute on 12–14):
 *
 *   right of the plate   Al Asayel Street / Metro view    01, 02 (and 01 on 12–15)
 *   centre               neighbouring plot                03 (right), 04 (left) — 02 on 12–15
 *   left of the plate    pool / Furjan villa community    05, 06 (and 03 on 12–15)
 *
 * Checked against the areas the unit plans print: unit 1106 (671.67 /
 * 351.55 / 1023.22 sq ft) is the left-wing 1 BHK A, unit 1303 (1691.44 /
 * 645.19 / 2336.63) is the left-wing residence on 13, and unit x04 (678.45 /
 * 126.58 / 805.03 on 01/05/07/11) is the centre-left 1 BHK + Study B.
 */
const SIX_A_FLOOR: Readonly<Record<string, string>> = {
  '01': 'outer-right',
  '02': 'inner-right',
  '03': 'centre-right',
  '04': 'centre-left',
  '05': 'inner-left',
  '06': 'outer-left',
}
const THREE_A_FLOOR: Readonly<Record<string, string>> = {
  '01': 'outer-right',
  '02': 'centre',
  '03': 'outer-left',
}

/** The positions sold on a level, as the package names them. */
function soldPositions(level: LevelId): ReadonlySet<string> {
  const floor = Number(level)
  const table = floor >= 12 ? THREE_A_FLOOR : SIX_A_FLOOR
  const positions = new Set<string>()
  for (const unit of SOLD_UNITS) {
    const unitFloor = unit.length === 3 ? unit.slice(0, 1) : unit.slice(0, 2)
    if (Number(unitFloor) !== floor) continue
    const position = table[unit.slice(-2)]
    if (position) positions.add(position)
  }
  return positions
}

/**
 * Which of a level's residences are sold, by residence id — resolved through
 * the residence's position on the plate, since the residence records are
 * shared between the levels that share a plate and a sale is one level's.
 */
export function soldResidences(
  level: LevelId,
  residences: readonly { readonly id: string; readonly floorplatePosition: string }[],
): ReadonlySet<string> {
  const positions = soldPositions(level)
  const ids = new Set<string>()
  for (const residence of residences) {
    if (positions.has(residence.floorplatePosition)) ids.add(residence.id)
  }
  return ids
}
