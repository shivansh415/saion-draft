/**
 * Reposé Residence — reception entry: the entrance, measured.
 *
 * Every number here is a NORMALISED coordinate of the supplied still,
 * `building-final.webp` (2940 × 1912): 0 → 1 across its width and its
 * height. They were read off the pixels of that file — the dark frame members
 * of the glazed front were located by their luminance, column by column and
 * row by row — and are converted to screen pixels only at render time, by the
 * helpers in `imageSpace.ts`, so they hold at every viewport and every
 * cover-fit crop.
 *
 * Tune here, nowhere else.
 *
 * What the entrance is
 * --------------------
 * A recessed, lit portal at the RIGHT of the podium: a warm soffit over a
 * fully glazed front, and in the centre of the glass an AUTOMATIC SLIDING
 * DOOR — dark bronze stiles and head rail, glass leaves (see
 * `entrance-reference.webp`). The leaves do not turn: they travel sideways,
 * to the RIGHT, and pass out of the opening into the pocket behind the
 * glazing — the motion built in `EntranceTransition`. Confirmed by the
 * developer: the entrance is a slider, not a swing pair.
 *
 * Still ↔ film
 * ------------
 * The clean building state on screen is the film's final frame, not the still.
 * The two were compared: the frame is the still scaled uniformly by 0.585 with
 * the sides out-painted, and inside the still's extent they differ by a mean
 * of 3.5/255 — compression, not content — so the still can be laid exactly
 * over the frame through `FILM_WINDOW` and appear without a seam.
 */

import type { Box, Window } from './imageSpace'

/** Intrinsic size of `building-final.webp`. */
export const STILL = { width: 2940, height: 1912 } as const

/** Intrinsic size of `Reception-done.webp`. */
export const RECEPTION = { width: 8000, height: 3523 } as const

/** Where the reception's cover-fit crop is anchored. Centred: the lobby reads whole. */
export const RECEPTION_FOCAL = { x: 0.5, y: 0.5 } as const

/**
 * The part of the still that the film's final frame shows, in the still's
 * normalised space. Left and right fall outside 0 → 1 because the frame is
 * wider than the still (its margins were out-painted by the film); the film
 * base layer stays underneath to fill them.
 */
export const FILM_WINDOW: Window = {
  left: -0.058143,
  top: 0.034868,
  right: 1.058201,
  bottom: 1.000429,
}

const px = (x: number) => x / STILL.width
const py = (y: number) => y / STILL.height
const box = (x0: number, y0: number, x1: number, y1: number): Box => ({
  x: px(x0),
  y: py(y0),
  width: px(x1 - x0),
  height: py(y1 - y0),
})

/**
 * The lit portal: soffit and glazed front together. This is what should fill
 * the frame when the camera arrives at the threshold.
 * still px: x 1780 → 2070, y 1515 → 1723
 */
export const PORTAL: Box = box(1780, 1515, 2070, 1723)

/**
 * The door opening — the space between the jambs, exactly tiled by the two
 * leaves below. This is the aperture the reception is seen through.
 * still px: x 1859 → 1962, y 1591 → 1723
 */
export const OPENING: Box = box(1859, 1591, 1962, 1723)

/**
 * The two leaves, each carrying its own stile and its share of the meeting
 * stiles (still px 1907 → 1917, split at 1912). Left is hinged on its left
 * edge, right on its right.
 */
export const LEFT_LEAF: Box = box(1859, 1591, 1912, 1723)
export const RIGHT_LEAF: Box = box(1912, 1591, 1962, 1723)

/**
 * Where the camera is aimed: the door's centre line at the height of the pull
 * handles — eye height, for a visitor walking in.
 */
export const CAMERA_TARGET = { x: px(1910.5), y: py(1648) } as const

/**
 * How far the camera travels, as a scale factor on the still. At 7 the portal
 * fills the height of a 16:9 viewport and about six tenths of its width, and
 * the door opening is a window the reception is plainly seen through.
 */
export const CAMERA_ARRIVAL_SCALE = 7

/**
 * Perspective on the aperture, in still pixels at rest.
 *
 * The leaves are flat now — a slider translates, it does not turn — so this
 * no longer bends anything. It is kept because the aperture is still a 3D
 * context and the value is the distance the rest of the scene is composed
 * at; removing it would change nothing on screen and touch three files.
 */
export const SWING_PERSPECTIVE = 420

/**
 * How far the leaves travel when the door opens, as a share of the opening's
 * own width. 1 clears the aperture exactly: the leading edge of the left leaf
 * arrives at the right jamb, so the doorway is fully open and no part of
 * either leaf is left standing in it.
 *
 * Both leaves travel the same distance and in the same direction, so the pair
 * reads as one panel running on its track rather than two leaves parting.
 * `.rc__aperture` clips at the opening, which is what makes them disappear
 * into the pocket instead of sliding over the glass beside the door.
 */
export const SLIDE_TRAVEL = 1

/**
 * The wayfinding cue, directly above the door. The label sits in the transom
 * — the band of lit glass between the soffit (1515) and the doors' head rail
 * (1591), the one quiet, even ground inside the portal — centred on the
 * door's own centre line, and a short hairline drops from it to the head
 * rail, so the mark is attached to the door it names. Above the soffit are
 * the fins; there it would be lost.
 * still px: label centred at (1910.5, 1548); leader 1563 → 1586; pin at 1588
 */
export const CUE = {
  x: px(1910.5),
  labelY: py(1548),
  leaderTop: py(1563),
  pinY: py(1588),
} as const
