import { useLayoutEffect, useRef, useState } from 'react'

import { AMENITIES_COPY, FINAL_FRAME_STILL, FOCAL_X, FOCAL_Y } from '../../data/opening'
import { AMENITIES_X, AMENITIES_Y } from '../floor-explorer/towerZone'
import { useCoverRect } from '../floor-explorer/useCoverRect'

interface Props {
  /** True once the film has ended and the clean building is on screen. */
  active: boolean
  /** Into the lifestyle chapter, opening at the amenities. */
  onExplore: () => void
}

/** Clear of the frame's edge, on the same scale as the chapter's own margins. */
const GUTTER = 14

/**
 * The second cue on the completed building: the way to the amenities.
 *
 * It is placed the way every other mark on this render is placed — in the
 * building image's own coordinates (see `towerZone`), converted to screen
 * pixels against the rectangle the image is actually painted into. It
 * therefore lands on the same piece of architecture at every viewport size and
 * every cover-fit crop, with no fixed pixel offsets anywhere.
 *
 * It sits on the podium, not on the tower: the building's own division is the
 * one the interface uses — tower is residences, podium is amenities, portal is
 * the reception — so the whole residential envelope, every level band inside
 * it, is left alone for the floor explorer. Its only neighbour at ground level
 * is the entrance cue, and the two are mirrored either side of the building's
 * centre line (see `towerZone`), so their hit areas cannot meet.
 *
 * On a crop that takes its anchor off the frame — a portrait phone keeps only
 * the middle of a 16:9 render — the label stays in reach at the margin rather
 * than leaving the screen, the same concession the entrance cue makes.
 */
export function AmenitiesHotspot({ active, onExplore }: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const button = useRef<HTMLButtonElement | null>(null)
  const rect = useCoverRect(ref, FINAL_FRAME_STILL.width, FINAL_FRAME_STILL.height, FOCAL_X, FOCAL_Y)

  // The label is centred on its anchor, so keeping it on screen needs its own
  // size. Measured rather than assumed: it changes with the viewport's type scale.
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const element = button.current
    if (!element) return
    const measure = () => setSize({ w: element.offsetWidth, h: element.offsetHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [rect.containerWidth, rect.containerHeight])

  const clamp = (value: number, extent: number, limit: number) =>
    limit < extent + GUTTER * 2 ? limit / 2 : Math.min(Math.max(value, extent / 2 + GUTTER), limit - extent / 2 - GUTTER)

  const x = clamp(rect.x + (rect.width * AMENITIES_X) / 100, size.w, rect.containerWidth)
  const y = clamp(rect.y + (rect.height * AMENITIES_Y) / 100, size.h, rect.containerHeight)

  return (
    <div className="am-cue" ref={ref} data-am-cue data-active={active || undefined} aria-hidden={!active}>
      <button
        type="button"
        className="am-cue__button"
        ref={button}
        onClick={onExplore}
        tabIndex={active ? 0 : -1}
        style={rect.width > 0 ? { left: x, top: y } : { visibility: 'hidden' }}
      >
        <span className="am-cue__label">{AMENITIES_COPY.label}</span>
        <span className="am-cue__arrow" aria-hidden="true">
          →
        </span>
      </button>
    </div>
  )
}
