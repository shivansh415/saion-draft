import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

/**
 * Zoom and pan for a drawing — the floorplate and the residence plan.
 *
 * Three elements take part:
 *
 *   viewport  the box the drawing is looked at through; it clips, and it is
 *             where every gesture lands;
 *   frame     the drawing's own fitted box (the `figure` `useSheetFit` sizes),
 *             which the explorer animates and which stays exactly where it is;
 *   content   a wrapper inside the frame holding the image and anything laid
 *             over it in percentages of the drawing — the hotspots, the tags.
 *
 * Only `content` moves: one `translate(…) scale(…)` from the frame's top-left
 * corner, written once per animation frame from a small state held in refs.
 * Because the hotspot layer sits inside the wrapper, a polygon at 30% of the
 * drawing is at 30% of the drawing at any zoom, and the browser's own
 * hit-testing answers a click on it — nothing is re-projected.
 *
 * The fit (zoom 1) is the floor: the drawing can always be seen whole. Where
 * the fit would be unreadably small — a landscape floorplate on a phone held
 * upright — the drawing opens at a readable zoom instead (`readable`), which
 * is then what "reset" returns to. Panning is clamped so the drawing never
 * leaves the viewport: smaller than it, it stays inside; larger, its edges
 * never come inside; at the fit it is centred.
 *
 * Input: wheel (and trackpad pinch) zooms about the cursor; a drag pans once
 * the drawing outgrows the viewport; a double-click steps in about the
 * cursor and back out; two fingers pinch and pan together; one finger pans;
 * a double-tap steps in and out. A click that followed a drag is swallowed
 * so a pan across the plate never opens a residence.
 */

/** The viewport listens for this; the explorer sends it to put a view back to its fit. */
export const PLAN_VIEWER_RESET_EVENT = 'fx-plan-viewer-reset'

export const MAX_ZOOM = 6
/** Below this share of the viewport's height the fitted drawing is opened at a readable zoom instead. */
const MIN_READABLE_HEIGHT = 0.72
const WHEEL_SENSITIVITY = 0.0016
const TRACKPAD_PINCH_SENSITIVITY = 0.008
/** Pointer travel before a press becomes a pan (and its click is swallowed). */
const DRAG_THRESHOLD = 4
const STEP_ZOOM = 2.4
const DOUBLE_TAP_MS = 320
const DOUBLE_TAP_PX = 28
const SETTLE_MS = 380

interface Options {
  viewportRef: RefObject<HTMLElement | null>
  frameRef: RefObject<HTMLElement | null>
  contentRef: RefObject<HTMLElement | null>
  /** Take input. The transform itself persists while false — the explorer resets it when it means to. */
  enabled: boolean
  /** Open at a readable zoom where the fit would be unreadably small. */
  readable?: boolean
}

interface Transform {
  z: number
  x: number
  y: number
}

interface Layout {
  /** Frame's box inside the viewport, untransformed. */
  left: number
  top: number
  width: number
  height: number
  /** Viewport's inner size. */
  vw: number
  vh: number
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

export interface PlanViewerHandle {
  /** Back to the fit; animated unless asked otherwise. */
  reset: (animate?: boolean) => void
}

export function usePlanViewer({ viewportRef, frameRef, contentRef, enabled, readable = false }: Options): PlanViewerHandle {
  const handle = useRef<PlanViewerHandle>({ reset: () => {} })
  // A stable handle for callers; the effect below swaps what it delegates to.
  const [api] = useState<PlanViewerHandle>(() => ({ reset: (animate) => handle.current.reset(animate) }))
  const enabledRef = useRef(enabled)
  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  useEffect(() => {
    const viewport = viewportRef.current
    const frame = frameRef.current
    const content = contentRef.current
    if (!viewport || !frame || !content) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    /* ------------------------------------------------------------ state */
    const current: Transform = { z: 1, x: 0, y: 0 }
    let home: Transform = { z: 1, x: 0, y: 0 }
    let layout: Layout = { left: 0, top: 0, width: 1, height: 1, vw: 1, vh: 1 }
    let raf = 0
    let settle: number | null = null // rAF id of a running settle animation
    let zoomedFlag = false
    let pannableFlag = false

    /* ----------------------------------------------------------- layout */
    const measure = () => {
      const inFrame = frame === viewport
      layout = {
        left: inFrame ? 0 : frame.offsetLeft,
        top: inFrame ? 0 : frame.offsetTop,
        width: Math.max(1, frame.offsetWidth),
        height: Math.max(1, frame.offsetHeight),
        vw: Math.max(1, viewport.clientWidth),
        vh: Math.max(1, viewport.clientHeight),
      }
    }

    /**
     * Keeps the drawing in the viewport: while larger than it, its edges never
     * come inside; while smaller, it never leaves — but it is not forced to
     * the centre, so a zoom about the cursor keeps the point under the cursor
     * from the very first step. At the fit itself it is centred (see `set`).
     */
    const clamp = (t: Transform): Transform => {
      const { left, top, width, height, vw, vh } = layout
      const cw = t.z * width
      const ch = t.z * height
      const bound = (v: number, size: number, room: number, offset: number) =>
        size <= room ? Math.min(room - size - offset, Math.max(-offset, v)) : Math.min(-offset, Math.max(room - size - offset, v))
      return { z: t.z, x: bound(t.x, cw, vw, left), y: bound(t.y, ch, vh, top) }
    }

    /** The drawing centred in the viewport at zoom `z`. */
    const centred = (z: number): Transform => {
      const { left, top, width, height, vw, vh } = layout
      return clamp({ z, x: (vw - z * width) / 2 - left, y: (vh - z * height) / 2 - top })
    }

    const fitTransform = (): Transform => {
      const { height, vh } = layout
      const z = readable && height < vh * MIN_READABLE_HEIGHT ? Math.min(vh / height, MAX_ZOOM) : 1
      return centred(z)
    }

    const isHome = (t: Transform) => Math.abs(t.z - home.z) < 0.01 && Math.abs(t.x - home.x) < 1 && Math.abs(t.y - home.y) < 1

    /* ------------------------------------------------------------ paint */
    const paint = () => {
      raf = 0
      content.style.transform = `translate3d(${current.x.toFixed(2)}px, ${current.y.toFixed(2)}px, 0) scale(${current.z.toFixed(4)})`
      frame.style.setProperty('--fx-zoom', current.z.toFixed(4))
      const zoomed = !isHome(current)
      if (zoomed !== zoomedFlag) {
        zoomedFlag = zoomed
        viewport.toggleAttribute('data-fx-zoomed', zoomed)
      }
      const pannable =
        current.z > 1.001 || current.z * layout.width > layout.vw + 0.5 || current.z * layout.height > layout.vh + 0.5
      if (pannable !== pannableFlag) {
        pannableFlag = pannable
        viewport.toggleAttribute('data-fx-pannable', pannable)
      }
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(paint)
    }
    const set = (t: Transform) => {
      const z = Math.min(MAX_ZOOM, Math.max(1, t.z))
      // Zoomed all the way out, the drawing sits where the fit put it.
      const next = z <= 1.0001 ? centred(1) : clamp({ z, x: t.x, y: t.y })
      current.z = next.z
      current.x = next.x
      current.y = next.y
      schedule()
    }

    const stopSettle = () => {
      if (settle !== null) cancelAnimationFrame(settle)
      settle = null
    }

    /** Eases from the current transform to `target`. */
    const settleTo = (target: Transform, animate: boolean) => {
      stopSettle()
      if (!animate || reducedMotion) {
        set(target)
        return
      }
      const from = { ...current }
      const to = clamp({ z: Math.min(MAX_ZOOM, Math.max(1, target.z)), x: target.x, y: target.y })
      const started = performance.now()
      const step = (now: number) => {
        const k = easeOut(Math.min(1, (now - started) / SETTLE_MS))
        set({ z: from.z + (to.z - from.z) * k, x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k })
        settle = k < 1 ? requestAnimationFrame(step) : null
      }
      settle = requestAnimationFrame(step)
    }

    const goHome = (animate: boolean) => {
      measure()
      home = fitTransform()
      settleTo(home, animate)
    }

    /* ------------------------------------------------------- geometry */
    /** Client → frame-local (untransformed) coordinates. */
    const local = (clientX: number, clientY: number) => {
      const box = frame.getBoundingClientRect()
      // The frame may carry the explorer's own scale while it animates; input
      // is only taken at rest, when its box is its layout box.
      return { x: clientX - box.left, y: clientY - box.top }
    }

    /** Zoom to `z` keeping the drawing's point under the client position still. */
    const zoomAbout = (z: number, clientX: number, clientY: number, animate = false) => {
      const p = local(clientX, clientY)
      const zz = Math.min(MAX_ZOOM, Math.max(1, z))
      const target = { z: zz, x: p.x - ((p.x - current.x) * zz) / current.z, y: p.y - ((p.y - current.y) * zz) / current.z }
      if (animate) settleTo(target, true)
      else {
        stopSettle()
        set(target)
      }
    }

    /** Double-click / double-tap: step in about the point, or back out to the fit. */
    const toggleStep = (clientX: number, clientY: number) => {
      if (current.z > home.z * 1.01) settleTo(home, true)
      else zoomAbout(home.z * STEP_ZOOM, clientX, clientY, true)
    }

    /* ---------------------------------------------------------- input */
    const onWheel = (event: WheelEvent) => {
      if (!enabledRef.current) return
      event.preventDefault()
      const lines = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1
      const sensitivity = event.ctrlKey ? TRACKPAD_PINCH_SENSITIVITY : WHEEL_SENSITIVITY
      const factor = Math.exp(-event.deltaY * lines * sensitivity)
      zoomAbout(current.z * factor, event.clientX, event.clientY)
    }

    // Pointers are followed on the window rather than captured: capturing
    // would redirect the click that ends a press away from the hotspot under
    // it in some browsers, and the hotspots must keep answering their own.
    const pointers = new Map<number, { x: number; y: number }>()
    let press: { x: number; y: number; tx: number; ty: number } | null = null
    let dragging = false
    let swallowClick = false
    let pinch: { distance: number; z: number; px: number; py: number } | null = null
    let lastTap: { at: number; x: number; y: number } | null = null
    let lastTouchAt = -Infinity
    let pressTarget: Element | null = null
    let following = false

    const follow = (on: boolean) => {
      if (on === following) return
      following = on
      if (on) {
        window.addEventListener('pointermove', onPointerMove)
        window.addEventListener('pointerup', endPointer)
        window.addEventListener('pointercancel', endPointer)
      } else {
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', endPointer)
        window.removeEventListener('pointercancel', endPointer)
      }
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!enabledRef.current) return
      if (event.pointerType === 'mouse' && event.button !== 0) return
      stopSettle()
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      follow(true)

      if (pointers.size === 2) {
        const [a, b] = Array.from(pointers.values())
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        const p = local(mid.x, mid.y)
        pinch = {
          distance: Math.hypot(b.x - a.x, b.y - a.y),
          z: current.z,
          // The drawing's point under the fingers' midpoint, which stays under them.
          px: (p.x - current.x) / current.z,
          py: (p.y - current.y) / current.z,
        }
        press = null
        dragging = true // two fingers never click
        swallowClick = true
        return
      }
      press = { x: event.clientX, y: event.clientY, tx: current.x, ty: current.y }
      pressTarget = event.target instanceof Element ? event.target : null
      dragging = false
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

      if (pinch && pointers.size >= 2) {
        const [a, b] = Array.from(pointers.values())
        const distance = Math.hypot(b.x - a.x, b.y - a.y)
        const mid = local((a.x + b.x) / 2, (a.y + b.y) / 2)
        const z = Math.min(MAX_ZOOM, Math.max(1, (pinch.z * distance) / Math.max(1, pinch.distance)))
        set({ z, x: mid.x - pinch.px * z, y: mid.y - pinch.py * z })
        return
      }

      if (!press) return
      const dx = event.clientX - press.x
      const dy = event.clientY - press.y
      if (!dragging) {
        if (!pannableFlag) return
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
        dragging = true
        swallowClick = true
        viewport.setAttribute('data-fx-dragging', '')
      }
      set({ z: current.z, x: press.tx + dx, y: press.ty + dy })
    }

    const endPointer = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return
      pointers.delete(event.pointerId)
      if (pointers.size === 0) follow(false)
      if (event.pointerType === 'touch') lastTouchAt = performance.now()

      if (pinch) {
        if (pointers.size < 2) {
          pinch = null
          // The remaining finger, if any, continues as a pan from here.
          const rest = Array.from(pointers.values())[0]
          press = rest ? { x: rest.x, y: rest.y, tx: current.x, ty: current.y } : null
          dragging = rest !== undefined
          if (!rest) window.setTimeout(() => (swallowClick = false), 0)
        }
        return
      }

      const wasDrag = dragging
      press = null
      dragging = false
      viewport.removeAttribute('data-fx-dragging')

      // Double-tap on touch: the second tap of a quick pair steps the zoom —
      // except on something that answers taps itself (a residence hotspot,
      // where the first tap indicates and the second opens): there the pair
      // is the control's own, never the viewer's.
      const onControl = pressTarget?.closest('button, a, [role="button"]') !== null
      if (event.pointerType === 'touch' && event.type === 'pointerup' && !wasDrag && !onControl) {
        const now = performance.now()
        const tap = { at: now, x: event.clientX, y: event.clientY }
        if (lastTap && now - lastTap.at < DOUBLE_TAP_MS && Math.hypot(tap.x - lastTap.x, tap.y - lastTap.y) < DOUBLE_TAP_PX) {
          lastTap = null
          swallowClick = true
          toggleStep(tap.x, tap.y)
        } else {
          lastTap = tap
        }
      }

      // The click this press produces, if any, follows in the same task; a
      // press released outside the viewport produces none, so do not hold a
      // swallow for a later, honest click.
      if (swallowClick) window.setTimeout(() => (swallowClick = false), 0)
    }

    // A click that concluded a pan or a pinch must not reach the hotspots.
    const onClickCapture = (event: MouseEvent) => {
      if (!swallowClick) return
      swallowClick = false
      event.stopPropagation()
      event.preventDefault()
    }

    const onDoubleClick = (event: MouseEvent) => {
      if (!enabledRef.current) return
      // Touch has its own double-tap above; a synthesised dblclick would undo it.
      if (performance.now() - lastTouchAt < 1000) return
      event.preventDefault()
      toggleStep(event.clientX, event.clientY)
    }

    const onReset = (event: Event) => goHome(Boolean((event as CustomEvent<{ animate?: boolean }>).detail?.animate))

    /* ------------------------------------------------------ lifecycle */
    viewport.addEventListener('wheel', onWheel, { passive: false })
    viewport.addEventListener('pointerdown', onPointerDown)
    viewport.addEventListener('click', onClickCapture, true)
    viewport.addEventListener('dblclick', onDoubleClick)
    viewport.addEventListener(PLAN_VIEWER_RESET_EVENT, onReset)

    // The viewport's own wheel and touch are the drawing's, never the page's.
    viewport.setAttribute('data-scroll-lock-allow', '')
    viewport.setAttribute('data-lenis-prevent', '')

    // Re-fit whenever the frame is re-fitted (a resize, or the drawing's true
    // ratio arriving) — the drawing sits differently, so the fit has moved.
    const observer = new ResizeObserver(() => goHome(false))
    observer.observe(viewport)
    if (frame !== viewport) observer.observe(frame)
    goHome(false)

    handle.current = { reset: (animate = true) => goHome(animate) }

    return () => {
      observer.disconnect()
      stopSettle()
      if (raf) cancelAnimationFrame(raf)
      viewport.removeEventListener('wheel', onWheel)
      viewport.removeEventListener('pointerdown', onPointerDown)
      follow(false)
      viewport.removeEventListener('click', onClickCapture, true)
      viewport.removeEventListener('dblclick', onDoubleClick)
      viewport.removeEventListener(PLAN_VIEWER_RESET_EVENT, onReset)
      viewport.removeAttribute('data-scroll-lock-allow')
      viewport.removeAttribute('data-lenis-prevent')
      viewport.removeAttribute('data-fx-zoomed')
      viewport.removeAttribute('data-fx-pannable')
      viewport.removeAttribute('data-fx-dragging')
      content.style.transform = ''
      frame.style.removeProperty('--fx-zoom')
      handle.current = { reset: () => {} }
    }
  }, [viewportRef, frameRef, contentRef, readable])

  return api
}

/** Asks the view behind `viewport` to return to its fit — at once, or settling. */
export function resetPlanViewer(viewport: Element | null, animate = false): void {
  viewport?.dispatchEvent(new CustomEvent(PLAN_VIEWER_RESET_EVENT, { detail: { animate } }))
}
