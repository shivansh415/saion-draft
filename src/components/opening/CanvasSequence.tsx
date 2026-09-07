import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

import {
  FOCAL_X,
  FOCAL_Y,
  MAX_BACKING_WIDTH,
  MAX_DPR,
} from '../../data/opening'

export interface CanvasSequenceHandle {
  /**
   * Paints a frame. When `b` is supplied it is composited over `a` at `mix`
   * opacity, which is how the two source clips cross-dissolve into one another.
   */
  draw(a: HTMLImageElement | null, b: HTMLImageElement | null, mix: number): void
}

interface Props {
  className?: string
}

interface DrawState {
  a: HTMLImageElement | null
  b: HTMLImageElement | null
  mix: number
}

/**
 * The single persistent viewport for the whole chapter.
 *
 * The canvas is never remounted and never cleared to a flat colour, so there is
 * no path by which a white or black flash can appear between sequences. It is
 * mounted once and painted imperatively from the parent's rAF loop — React does
 * not re-render while scrolling.
 *
 * Performance note: `clientWidth`/`clientHeight` are cached in a ref after each
 * resize and read from there in `paint()` rather than queried from the DOM on
 * every animation frame. A DOM dimension read forces a style recalculation; at
 * 60 fps that is 60 layout queries per second that this eliminates.
 */
export const CanvasSequence = forwardRef<CanvasSequenceHandle, Props>(
  function CanvasSequence({ className }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const contextRef = useRef<CanvasRenderingContext2D | null>(null)
    const lastRef = useRef<DrawState>({ a: null, b: null, mix: 0 })
    /** Cached logical size — updated in resize(), read in paint(). */
    const sizeRef = useRef({ width: 0, height: 0, dpr: 1 })

    /** Cover-fit: fill the viewport, preserve aspect ratio, never distort. */
    const paint = (state: DrawState) => {
      const context = contextRef.current
      if (!context) return

      const { a, b, mix } = state
      if (!a) return

      // Read from the cached size — never from the DOM.
      const { width, height } = sizeRef.current
      if (width === 0 || height === 0) return

      const cover = (image: HTMLImageElement) => {
        const sw = image.naturalWidth
        const sh = image.naturalHeight
        if (!sw || !sh) return

        const scale = Math.max(width / sw, height / sh)
        const w = sw * scale
        const h = sh * scale
        context.drawImage(image, (width - w) * FOCAL_X, (height - h) * FOCAL_Y, w, h)
      }

      context.globalAlpha = 1
      cover(a)

      if (b && b !== a && mix > 0.001) {
        context.globalAlpha = Math.min(1, mix)
        cover(b)
        context.globalAlpha = 1
      }
    }

    const resize = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (width === 0 || height === 0) return

      // Cap the backing store: high-DPI sharpness matters, but a 4K display at
      // devicePixelRatio 3 would otherwise allocate a needlessly huge surface.
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR, MAX_BACKING_WIDTH / width)
      const backingWidth = Math.round(width * dpr)
      const backingHeight = Math.round(height * dpr)

      // Update cached logical size so paint() never has to query the DOM.
      sizeRef.current = { width, height, dpr }

      if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
        canvas.width = backingWidth
        canvas.height = backingHeight
      }

      const context = contextRef.current
      if (context) {
        context.setTransform(dpr, 0, 0, dpr, 0, 0)
        context.imageSmoothingEnabled = true
        // 'high' is markedly more expensive than 'medium' on the 2D canvas path
        // and, on a fanless/integrated GPU, is a common cause of visible stutter
        // during continuous scroll-driven redraws. 'medium' is indistinguishable
        // at these frame sizes but costs a fraction as much per draw.
        context.imageSmoothingQuality = 'medium'
        paint(lastRef.current)
      }
    }

    useImperativeHandle(
      ref,
      () => ({
        draw(a, b, mix) {
          lastRef.current = { a, b, mix }
          paint(lastRef.current)
        },
      }),
      [],
    )

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      contextRef.current = canvas.getContext('2d', { alpha: false })
      resize()

      // ResizeObserver catches viewport changes *and* the mobile browser chrome
      // collapsing, which a window resize listener alone would miss.
      const observer = new ResizeObserver(() => resize())
      observer.observe(canvas)
      window.addEventListener('orientationchange', resize)

      return () => {
        observer.disconnect()
        window.removeEventListener('orientationchange', resize)
        contextRef.current = null
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // `data-opening-canvas` is the handle the chapter break uses to push and
    // soften the picture. Only transform and filter are ever written to it —
    // neither changes the element's border box, so the cover-fit maths above
    // and the ResizeObserver below are untouched by them.
    return <canvas ref={canvasRef} className={className} data-opening-canvas aria-hidden="true" />
  },
)

