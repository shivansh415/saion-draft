import { bandFor } from './levelCalibration'
import type { LevelId } from './levelCalibration'
import type { CoverRect } from './useCoverRect'

export interface BandPx {
  /** Floor line, in the explorer's own pixels. */
  readonly lineY: number
  /** Top of the band. */
  readonly topY: number
  readonly x0: number
  readonly x1: number
}

/**
 * A level's calibrated band (image percentages) converted into the pixels the
 * still is actually painted in, so a line drawn at `lineY` lands on the slab.
 */
export function bandPx(level: LevelId, rect: CoverRect): BandPx {
  const band = bandFor(level)
  return {
    lineY: rect.y + (rect.height * band.y) / 100,
    topY: rect.y + (rect.height * band.top) / 100,
    x0: rect.x + (rect.width * band.left) / 100,
    x1: rect.x + (rect.width * band.right) / 100,
  }
}
