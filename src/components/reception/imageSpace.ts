/**
 * Reposé Residence — reception entry: image space ↔ screen space.
 *
 * Three coordinate systems meet at the entrance:
 *
 *   still    `building-final.webp`, the supplied completed exterior, in
 *            NORMALISED coordinates (0 → 1 across its width and height).
 *            Every entrance measurement is stated in these, once, in
 *            `entranceCalibration.ts`.
 *   film     the film's final frame, which is what the clean building state
 *            shows. It is the still, uniformly scaled, with the sides
 *            out-painted — so it too is addressed in normalised coordinates,
 *            and the still maps into it by one affine window.
 *   screen   the pixels the film frame is painted into — the cover-fit
 *            rectangle the canvas and the explorer both use.
 *
 * Nothing below knows what the numbers mean; it only converts between them.
 */

import type { CoverRect } from '../floor-explorer/useCoverRect'

export interface Point {
  readonly x: number
  readonly y: number
}

export interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** An axis-aligned window of one image expressed in another's normalised space. */
export interface Window {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}

/**
 * The rectangle an image of `imageWidth × imageHeight` occupies when
 * cover-fitted into a container around a focal point. Pure twin of
 * `useCoverRect`, for images that have no element to observe.
 */
export function coverRect(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number,
  focalX: number,
  focalY: number,
): CoverRect {
  const scale = Math.max(containerWidth / imageWidth, containerHeight / imageHeight)
  const width = imageWidth * scale
  const height = imageHeight * scale
  return {
    x: (containerWidth - width) * focalX,
    y: (containerHeight - height) * focalY,
    width,
    height,
    containerWidth,
    containerHeight,
  }
}

/** A normalised point of the film frame, on screen. */
export const filmToScreen = (rect: CoverRect, u: number, v: number): Point => ({
  x: rect.x + rect.width * u,
  y: rect.y + rect.height * v,
})

/**
 * A normalised point of the still, as a normalised point of the film frame,
 * given the window of the still that the film frame shows.
 */
export const stillToFilm = (window: Window, u: number, v: number): Point => ({
  x: (u - window.left) / (window.right - window.left),
  y: (v - window.top) / (window.bottom - window.top),
})

/** A normalised point of the still, on screen. */
export function stillToScreen(rect: CoverRect, window: Window, u: number, v: number): Point {
  const film = stillToFilm(window, u, v)
  return filmToScreen(rect, film.x, film.y)
}

/**
 * The rectangle the WHOLE still occupies on screen when its window is laid
 * exactly over the film frame's rectangle — where to paint the still so that
 * it lands on the film's pixels.
 */
export function stillRect(rect: CoverRect, window: Window): Box {
  const scaleX = rect.width / (window.right - window.left)
  const scaleY = rect.height / (window.bottom - window.top)
  return {
    x: rect.x - window.left * scaleX,
    y: rect.y - window.top * scaleY,
    width: scaleX,
    height: scaleY,
  }
}

/** A normalised box of the still, on screen. */
export function stillBoxToScreen(rect: CoverRect, window: Window, box: Box): Box {
  const still = stillRect(rect, window)
  return {
    x: still.x + box.x * still.width,
    y: still.y + box.y * still.height,
    width: box.width * still.width,
    height: box.height * still.height,
  }
}

export const centreOf = (box: Box): Point => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 })
