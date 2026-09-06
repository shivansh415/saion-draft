/**
 * Reposé Residence — floor explorer: level calibration.
 *
 * Every number in this file is a PERCENTAGE OF THE BUILDING IMAGE — the final
 * frame of the opening film (`FINAL_FRAME_STILL` in `data/opening.ts`), which
 * is what the explorer keeps on screen. `y` runs top → bottom, `left`/`right`
 * run left → right. Because they are image-relative they hold at every
 * viewport size and every cover-fit crop; the explorer converts them to pixels
 * against the rectangle the image is actually painted into.
 *
 * Tune here, nowhere else. Nothing downstream hard-codes a level position.
 *
 * What each line means
 * --------------------
 *   y      the level's FLOOR line — the slab the level stands on. This is where
 *          the hairline is drawn.
 *   top    (optional) the top of the level's band. When omitted it is the floor
 *          line of the level above (or `ROOF_Y` for the top level), so the
 *          bands stay contiguous. Set it only to open a gap deliberately.
 *   left   (optional) where the line starts, as % of image width.
 *   right  (optional) where the line ends. Both fall back to `TOWER_EDGES`.
 *
 * The band from `top` to `y` is also the hover / tap hit-zone.
 *
 * How the values were derived
 * ---------------------------
 * Calibrated against the completed tower at the end of the second (2026)
 * construction sequence — the frame `building/final-frame.webp` is written
 * from. That render shows FIFTEEN residential storeys between the podium
 * terrace and the roof pergola, one for each selectable level, so every level
 * sits exactly on its own slab: the sixteen bright slab edges (roof slab →
 * the slab on the podium) were peak-detected down the left balcony stack of
 * the 1920×1080 frame and are listed in `VISIBLE_SLAB_LINES`. Level 15 stands
 * on the slab under the roof, Level 01 on the slab that meets the podium
 * planters; the storeys grow taller toward the ground with the render's own
 * foreshortening, so the bands are not equal — they are the real slabs.
 *
 * The tower's left/right silhouette was fitted as a straight edge through the
 * same slabs (the balconies stagger from storey to storey, so a straight fit
 * is the honest envelope), and each line runs edge to edge at its own height.
 */

export type LevelId =
  | '01' | '02' | '03' | '04' | '05'
  | '06' | '07' | '08' | '09' | '10'
  | '11' | '12' | '13' | '14' | '15'

export interface LevelCalibration {
  /** Floor line of the level, % of image height. */
  readonly y: number
  /** Top of the level's band, % of image height. Defaults to the level above. */
  readonly top?: number
  /** Start of the line, % of image width. Defaults to the tower edge. */
  readonly left?: number
  /** End of the line, % of image width. Defaults to the tower edge. */
  readonly right?: number
}

/** Roof slab (under the pergola) — the top of Level 15's band. */
export const ROOF_Y = 7.59

/**
 * The tower's silhouette, top and bottom, for levels that do not set their own
 * `left`/`right`. Interpolated linearly by `y`.
 */
export const TOWER_EDGES = {
  top: { y: 7.59, left: 41.67, right: 53.93 },
  bottom: { y: 69.17, left: 38.88, right: 56.35 },
} as const

/**
 * Where the render's slabs actually are (% of image height), roof slab →
 * the slab on the podium terrace. Each level's `y` below IS one of these.
 */
export const VISIBLE_SLAB_LINES: readonly number[] = [
  7.59, 10.28, 13.89, 17.04, 20.83, 24.35, 28.33, 32.22, 36.39, 40.65, 45.09, 49.81, 54.72, 60.09, 65.28, 69.17,
]

export const levelCalibration: Readonly<Record<LevelId, LevelCalibration>> = {
  '15': { y: 10.28, left: 41.55, right: 54.04 },
  '14': { y: 13.89, left: 41.38, right: 54.18 },
  '13': { y: 17.04, left: 41.24, right: 54.3 },
  '12': { y: 20.83, left: 41.07, right: 54.45 },
  '11': { y: 24.35, left: 40.91, right: 54.59 },
  '10': { y: 28.33, left: 40.73, right: 54.75 },
  '09': { y: 32.22, left: 40.55, right: 54.9 },
  '08': { y: 36.39, left: 40.37, right: 55.06 },
  '07': { y: 40.65, left: 40.17, right: 55.23 },
  '06': { y: 45.09, left: 39.97, right: 55.4 },
  '05': { y: 49.81, left: 39.76, right: 55.59 },
  '04': { y: 54.72, left: 39.53, right: 55.78 },
  '03': { y: 60.09, left: 39.29, right: 55.99 },
  '02': { y: 65.28, left: 39.06, right: 56.2 },
  '01': { y: 69.17, left: 38.88, right: 56.35 },
}

/** Levels in display order, top of the building first. */
export const LEVEL_IDS: readonly LevelId[] = [
  '15', '14', '13', '12', '11', '10', '09', '08', '07', '06', '05', '04', '03', '02', '01',
]

export interface LevelBand {
  /** Floor line, % of image height. */
  readonly y: number
  /** Top of the band, % of image height. */
  readonly top: number
  readonly left: number
  readonly right: number
}

const levelAbove = (level: LevelId): LevelId | null => {
  const n = Number(level)
  return n >= 15 ? null : (String(n + 1).padStart(2, '0') as LevelId)
}

const edgeAt = (y: number): { left: number; right: number } => {
  const { top, bottom } = TOWER_EDGES
  const t = Math.min(1, Math.max(0, (y - top.y) / (bottom.y - top.y)))
  return {
    left: top.left + (bottom.left - top.left) * t,
    right: top.right + (bottom.right - top.right) * t,
  }
}

/** Resolves a level's fully-specified band, applying every default above. */
export function bandFor(level: LevelId): LevelBand {
  const own = levelCalibration[level]
  const above = levelAbove(level)
  const top = own.top ?? (above ? levelCalibration[above].y : ROOF_Y)
  const edge = edgeAt(own.y)
  return {
    y: own.y,
    top,
    left: own.left ?? edge.left,
    right: own.right ?? edge.right,
  }
}
