import { useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'

export interface CoverRect {
  /** Painted image rectangle, in the container's own pixels. */
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  /** The container it was fitted into. */
  readonly containerWidth: number
  readonly containerHeight: number
}

const EMPTY: CoverRect = { x: 0, y: 0, width: 0, height: 0, containerWidth: 0, containerHeight: 0 }

/**
 * The rectangle an image of `imageWidth × imageHeight` occupies when it is
 * cover-fitted into `container` around the focal point — the same arithmetic
 * the film's canvas uses, so an overlay laid out in image percentages lands on
 * exactly the pixels the film painted.
 *
 * Recomputed on resize only; never on scroll.
 */
export function useCoverRect(
  container: RefObject<HTMLElement | null>,
  imageWidth: number,
  imageHeight: number,
  focalX: number,
  focalY: number,
): CoverRect {
  const [rect, setRect] = useState<CoverRect>(EMPTY)

  useLayoutEffect(() => {
    const element = container.current
    if (!element) return

    const measure = () => {
      const width = element.clientWidth
      const height = element.clientHeight
      if (width === 0 || height === 0) return

      const scale = Math.max(width / imageWidth, height / imageHeight)
      const w = imageWidth * scale
      const h = imageHeight * scale
      const next: CoverRect = {
        x: (width - w) * focalX,
        y: (height - h) * focalY,
        width: w,
        height: h,
        containerWidth: width,
        containerHeight: height,
      }
      setRect((previous) =>
        previous.x === next.x &&
        previous.y === next.y &&
        previous.width === next.width &&
        previous.height === next.height &&
        previous.containerWidth === next.containerWidth &&
        previous.containerHeight === next.containerHeight
          ? previous
          : next,
      )
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    window.addEventListener('orientationchange', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('orientationchange', measure)
    }
  }, [container, imageWidth, imageHeight, focalX, focalY])

  return rect
}
