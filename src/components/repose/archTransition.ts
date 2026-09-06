/**
 * Reposé Residence — the arch at the end of the lifestyle chapter, measured.
 *
 * The finale's arch shows `tower-original.png`, which the asset manifest
 * records as the supplied "current-last-frame" capture: a screenshot of THIS
 * application's own completed-building state, 2047 × 1331, with a 46px
 * letterbox band across the top. Inside that band the capture is the film's
 * final frame (`final-frame.webp`, 1920 × 1080) cover-fitted into a
 * 2047 × 1285 viewport around the film's own focal point — exactly the maths
 * `CanvasSequence` and the floor explorer use — so the two pictures are the
 * same picture, and one maps onto the other by a single scale and offset.
 *
 * That mapping was recovered from the pixels (mean difference between the
 * capture and the frame laid through it: 1.9/255 — compression, not content),
 * and it is what lets the arch's picture be exchanged for the explorer's
 * still with nothing moving.
 */

/** Intrinsic size of `tower-original.png`. */
export const TOWER = { width: 2047, height: 1331 } as const

/** The letterbox band across the top of the capture, as a fraction of its height. */
export const TOWER_BAR = 46 / TOWER.height

/**
 * Where the film's final frame sits inside the capture:
 *   capture px = frame px × scale + offset.
 * The capture's picture area is 2047 × 1285 (below the band); the frame is
 * height-fitted to it (1285 / 1080) and centred, so its sides fall outside
 * the capture by (2047 − 1920 × 1285/1080) / 2 on each side.
 */
export const FRAME_IN_TOWER = {
  scale: 1285 / 1080,
  x: (TOWER.width - 1920 * (1285 / 1080)) / 2,
  y: 46,
} as const

/** The approved finale draws the capture at `transform: scale(1.08)` inside the arch. */
export const ARCH_IMAGE_SCALE = 1.08

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

export const lerpBox = (a: Box, b: Box, t: number): Box => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  w: lerp(a.w, b.w, t),
  h: lerp(a.h, b.h, t),
})

export const insetBox = (box: Box, by: number): Box => ({
  x: box.x + by,
  y: box.y + by,
  w: box.w - by * 2,
  h: box.h - by * 2,
})

export function unionBox(...boxes: Box[]): Box {
  const x0 = Math.min(...boxes.map((b) => b.x))
  const y0 = Math.min(...boxes.map((b) => b.y))
  const x1 = Math.max(...boxes.map((b) => b.x + b.w))
  const y1 = Math.max(...boxes.map((b) => b.y + b.h))
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/**
 * The arch as a clip on `layer`: an inset rectangle whose two top corners are
 * elliptical with radii of half the box — the same shape as the approved
 * figure's `border-radius: 50% 50% 0 0`, stated in pixels so it needs no
 * percentage resolution and can be driven from a plain box every frame.
 */
export function archClip(box: Box, layer: Box): string {
  const top = box.y - layer.y
  const left = box.x - layer.x
  const right = layer.x + layer.w - (box.x + box.w)
  const bottom = layer.y + layer.h - (box.y + box.h)
  const rx = box.w / 2
  const ry = box.h / 2
  const px = (v: number) => `${v.toFixed(2)}px`
  return `inset(${px(top)} ${px(right)} ${px(bottom)} ${px(left)} round ${px(rx)} ${px(rx)} 0 0 / ${px(ry)} ${px(ry)} 0 0)`
}

/**
 * How far the finale is pinned for the transition, as a multiple of the
 * viewport height. Desktop is the full cinematic push; a phone is brisker;
 * reduced motion is a crossfade and needs only a short hold.
 */
export const PIN_DISTANCE = { desktop: 1.5, mobile: 0.9, reduced: 0.6 } as const

/**
 * The transition's beats, as fractions of the pin.
 *
 *   0 → hold            the approved screen; the picture breathes, nothing else
 *   hold → open         the arch expands to the picture's final extent; the
 *                       picture travels to where the explorer holds it
 *   open → exchange     the arch is all but full-screen; the capture is
 *                       exchanged for the explorer's still, in place
 *   exchange → 1        the curve leaves the frame; the last of the surround
 *                       goes; the building stands alone
 */
export const BEATS = { hold: 0.2, open: 0.7, exchange: 0.9 } as const
