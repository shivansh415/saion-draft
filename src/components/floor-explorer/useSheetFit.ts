import { useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

/**
 * Below this share of the area's height, a drawing fitted to the width is too
 * small to read (a landscape plan on a portrait phone). It is then fitted to
 * the height instead and the area pans sideways.
 */
const MIN_READABLE_HEIGHT = 0.72

interface Options {
  /** The drawing's width ÷ height, once known. */
  ratio: number
  /** Share of the area the sheet may fill (1 = edge to edge). */
  fill?: number
  /** Allow the fit-to-height / pan behaviour on cramped viewports. */
  pan?: boolean
}

export interface SheetRefs {
  readonly areaRef: RefObject<HTMLDivElement | null>
  readonly sheetRef: RefObject<HTMLElement | null>
}

/**
 * Sizes a sheet (a `figure`) to a drawing's aspect ratio inside its area and
 * centres it, re-fitting on resize. When `pan` is allowed and the drawing
 * would be unreadably small, the sheet is fitted to the height instead and
 * the area is marked `data-pans` so it scrolls sideways — and only then does
 * it take its own wheel and touch (see `lib/scrollLock`).
 *
 * The sheet's edge is therefore the drawing's edge, which is what lets the
 * hotspot layer live in plain percentages of the drawing.
 *
 * Returns the two refs to attach; the hook owns them.
 */
export function useSheetFit({ ratio, fill = 1, pan = true }: Options): SheetRefs {
  const areaRef = useRef<HTMLDivElement | null>(null)
  const sheetRef = useRef<HTMLElement | null>(null)

  useLayoutEffect(() => {
    const areaElement = areaRef.current
    const sheetElement = sheetRef.current
    if (!areaElement || !sheetElement) return

    const fit = () => {
      const width = areaElement.clientWidth
      const height = areaElement.clientHeight
      if (width === 0 || height === 0) return

      const roomWidth = width * fill
      const roomHeight = height * fill
      const fitted = Math.min(roomWidth / ratio, roomHeight) // height when fitted inside
      const pans = pan && fitted < height * MIN_READABLE_HEIGHT
      const h = pans ? height : fitted
      const w = h * ratio

      sheetElement.style.width = `${w}px`
      sheetElement.style.height = `${h}px`
      sheetElement.style.left = `${Math.max(0, (width - w) / 2)}px`
      sheetElement.style.top = `${(height - h) / 2}px`

      areaElement.toggleAttribute('data-pans', pans)
      areaElement.toggleAttribute('data-scroll-lock-allow', pans)
      areaElement.toggleAttribute('data-lenis-prevent', pans)
      // Open on the core of the drawing; the wings are a swipe away.
      if (pans) areaElement.scrollLeft = (w - width) / 2
    }

    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(areaElement)
    return () => observer.disconnect()
  }, [ratio, fill, pan])

  return { areaRef, sheetRef }
}

/** Tracks an image's natural aspect ratio once it has loaded, per source. */
export function useImageRatio(src: string | null, fallback: number): [number, (image: HTMLImageElement) => void] {
  const [ratios, setRatios] = useState<Record<string, number>>({})
  const ratio = (src && ratios[src]) || fallback
  const learn = (image: HTMLImageElement) => {
    const key = image.getAttribute('src')
    if (!key || !image.naturalWidth || !image.naturalHeight) return
    const next = image.naturalWidth / image.naturalHeight
    setRatios((previous) => (previous[key] === next ? previous : { ...previous, [key]: next }))
  }
  return [ratio, learn]
}
