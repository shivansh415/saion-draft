/**
 * Everything the entrance journey needs to know about where things are on
 * screen, computed once per viewport from the cover-fit rectangle of the
 * film frame. Pure; both the scene and the choreography read it.
 */

import type { CoverRect } from '../floor-explorer/useCoverRect'
import {
  CAMERA_ARRIVAL_SCALE,
  CAMERA_TARGET,
  FILM_WINDOW,
  LEFT_LEAF,
  OPENING,
  PORTAL,
  RECEPTION,
  RECEPTION_FOCAL,
  RIGHT_LEAF,
  STILL,
  SWING_PERSPECTIVE,
} from './entranceCalibration'
import { coverRect, stillBoxToScreen, stillRect, stillToScreen } from './imageSpace'
import type { Box, Point } from './imageSpace'

export interface EntranceLayout {
  /** The film frame's rectangle, as painted. */
  readonly film: Box
  /** Where the still is painted so that it lands on the film's pixels. */
  readonly still: Box
  /** Screen pixels per still pixel, at rest. */
  readonly stillScale: number
  readonly portal: Box
  readonly opening: Box
  readonly leftLeaf: Box
  readonly rightLeaf: Box
  /** The point the camera drives at — the door, at eye height. */
  readonly target: Point
  /** The centre of the viewport, where the target arrives. */
  readonly centre: Point
  /** The reception, cover-fitted to the viewport: the lobby as finally seen. */
  readonly reception: Box
  /**
   * The reception at rest inside the camera: the final rectangle shrunk by
   * the arrival scale about the viewport centre, then re-centred on the
   * target — so that when the camera arrives it is exactly `reception`.
   */
  readonly through: Box
  /** The door opening as an inset of `through`, for its clip at rest. */
  readonly throughInset: { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number }
  /** Perspective for the swing, in screen pixels at rest. */
  readonly perspective: number
  /** The camera target relative to the opening, as percentages, for the vanishing point. */
  readonly perspectiveOrigin: string
}

export function layoutEntrance(rect: CoverRect): EntranceLayout {
  const film: Box = { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  const still = stillRect(rect, FILM_WINDOW)
  const stillScale = still.width / STILL.width

  const portal = stillBoxToScreen(rect, FILM_WINDOW, PORTAL)
  const opening = stillBoxToScreen(rect, FILM_WINDOW, OPENING)
  const leftLeaf = stillBoxToScreen(rect, FILM_WINDOW, LEFT_LEAF)
  const rightLeaf = stillBoxToScreen(rect, FILM_WINDOW, RIGHT_LEAF)
  const target = stillToScreen(rect, FILM_WINDOW, CAMERA_TARGET.x, CAMERA_TARGET.y)
  const centre: Point = { x: rect.containerWidth / 2, y: rect.containerHeight / 2 }

  const reception = coverRect(
    rect.containerWidth,
    rect.containerHeight,
    RECEPTION.width,
    RECEPTION.height,
    RECEPTION_FOCAL.x,
    RECEPTION_FOCAL.y,
  )
  const s = CAMERA_ARRIVAL_SCALE
  const through: Box = {
    x: target.x + (reception.x - centre.x) / s,
    y: target.y + (reception.y - centre.y) / s,
    width: reception.width / s,
    height: reception.height / s,
  }
  const throughInset = {
    top: opening.y - through.y,
    left: opening.x - through.x,
    right: through.x + through.width - (opening.x + opening.width),
    bottom: through.y + through.height - (opening.y + opening.height),
  }

  const perspective = SWING_PERSPECTIVE * stillScale
  const ox = ((target.x - opening.x) / opening.width) * 100
  const oy = ((target.y - opening.y) / opening.height) * 100

  return {
    film,
    still,
    stillScale,
    portal,
    opening,
    leftLeaf,
    rightLeaf,
    target,
    centre,
    reception,
    through,
    throughInset,
    perspective,
    perspectiveOrigin: `${ox.toFixed(2)}% ${oy.toFixed(2)}%`,
  }
}

export const insetOf = (i: EntranceLayout['throughInset']): string =>
  `inset(${i.top.toFixed(2)}px ${i.right.toFixed(2)}px ${i.bottom.toFixed(2)}px ${i.left.toFixed(2)}px)`
