import { useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

interface Options {
  /** The drawing's width ÷ height, once known. */
  ratio: number
  /** Share of the area the sheet may fill (1 = edge to edge). */
  fill?: number
}

export interface SheetRefs {
  readonly areaRef: RefObject<HTMLDivElement | null>
  readonly sheetRef: RefObject<HTMLElement | null>
}

/**
 * Sizes a sheet (a `figure`) to a drawing's aspect ratio inside its area and
 * centres it, re-fitting on resize. The sheet's edge is therefore the
 * drawing's edge, which is what lets the hotspot layer live in plain
 * percentages of the drawing — and the sheet is the fit, zoom 1, that
 * `usePlanViewer` zooms and pans the drawing from (including where the fit
 * is too small to read: that hook opens it at a readable zoom instead).
 *
 * Returns the two refs to attach; the hook owns them.
 */
export function useSheetFit({ ratio, fill = 1 }: Options): SheetRefs {
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

      const h = Math.min((width * fill) / ratio, height * fill) // height when fitted inside
      const w = h * ratio

      sheetElement.style.width = `${w}px`
      sheetElement.style.height = `${h}px`
      sheetElement.style.left = `${(width - w) / 2}px`
      sheetElement.style.top = `${(height - h) / 2}px`
    }

    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(areaElement)
    return () => observer.disconnect()
  }, [ratio, fill])

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
