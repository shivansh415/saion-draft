import { useEffect, useLayoutEffect, useRef } from 'react'
import type { MutableRefObject, RefObject } from 'react'

import { FINAL_FRAME_STILL, FOCAL_X, FOCAL_Y } from '../../data/opening'
import { lockScroll } from '../../lib/scrollLock'
import {
  ARCH_IMAGE_SCALE,
  BEATS,
  FRAME_IN_TOWER,
  PIN_DISTANCE,
  TOWER,
  archClip,
  insetBox,
  lerpBox,
  unionBox,
} from './archTransition'
import type { Box } from './archTransition'
import { gsap, ScrollTrigger } from './motion/gsap'
import { jumpTo, pageTop } from './motion/hostScroll'

interface Props {
  /** True once the chapter is exploring; the pin exists only then. */
  active: boolean
  /** The chapter's root — hidden in one go at the hand-off, so nothing fixed inside it can flash. */
  host: RefObject<HTMLDivElement | null>
  /** The capture the approved finale shows inside its arch. */
  towerSrc: string
  /**
   * Whether the arch's two pictures may be fetched yet. They are 2.8MB
   * between them and are not wanted until the chapter's last screen; started
   * at mount they competed with the four photographs the first screens need,
   * and started at the reveal they competed with the entry animation. The
   * chapter turns this on once the rest of its imagery is in.
   */
  sources: boolean
  /** Receives the pin's ScrollTrigger, so the chapter can glide to the end of the transition. */
  triggerRef: MutableRefObject<ScrollTrigger | null>
  /** Called once the building stands alone and the page already rests at the opening's end. */
  onComplete: () => void
}

interface Geometry {
  /** The approved arch, as laid out. */
  arch: Box
  /** The explorer's still as it is implied by the picture in the arch at rest. */
  B0: Box
  /** The explorer's still where the explorer actually holds it. */
  B1: Box
  /** The arch grown to the still's own extent: all but full-screen. */
  almost: Box
  /** The arch grown past every edge of the frame. */
  final: Box
  /** The clipped layer, sized to hold every state of the arch. */
  layer: Box
}

const REDUCED = '(prefers-reduced-motion: reduce)'
const NARROW = '(max-width: 900px)'

/**
 * The arch at the end of the lifestyle chapter, made into a portal back to
 * the building.
 *
 * Rests invisible over the approved figure. On the first breath of scroll
 * past the end of the page it takes over — over identical pixels — and from
 * there one scrubbed timeline drives three things and nothing else:
 *
 *   the mask      a clip on this layer, the arch's own shape, whose box grows
 *                 from the figure to past the frame's edges. The shape is
 *                 animated, never the section: the curve simply leaves.
 *   the picture   one transformed wrapper holding both pictures — the
 *                 capture the finale shows and the still the explorer holds —
 *                 registered onto each other, so that the wrapper's one
 *                 travel carries them together from the arch's framing to
 *                 the explorer's exact rectangle.
 *   the exchange  the capture's opacity, and only that: the still is already
 *                 underneath, in the same place.
 *
 * The arch is grown to the picture's extent with the same ease and over the
 * same span as the picture travels, and the picture's rectangles nest
 * (the arch inside the picture at rest, the still around the whole frame at
 * the end), so at no scroll position does the arch show anything but
 * picture. Once the picture has arrived the arch is free to leave the frame.
 *
 * At the end the page is put at the opening's end — where the explorer holds
 * the very same still in the very same rectangle — and the chapter is handed
 * back. Nothing on screen changes; only who owns it.
 */
export function ArchPortal({ active, host, towerSrc, sources, triggerRef, onComplete }: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const completeRef = useRef(onComplete)
  useEffect(() => {
    completeRef.current = onComplete
  }, [onComplete])

  useLayoutEffect(() => {
    if (!active) return
    const portal = ref.current
    const finale = portal?.closest<HTMLElement>('.rp-finale')
    const arch = finale?.querySelector<HTMLElement>('.rp-final-image')
    const mask = portal?.querySelector<HTMLElement>('[data-rp-mask]')
    const content = portal?.querySelector<HTMLElement>('[data-rp-content]')
    const capture = portal?.querySelector<HTMLElement>('[data-rp-a]')
    if (!portal || !finale || !arch || !mask || !content || !capture) return

    const reduced = window.matchMedia(REDUCED).matches
    const narrow = window.matchMedia(NARROW).matches
    const distance = reduced ? PIN_DISTANCE.reduced : narrow ? PIN_DISTANCE.mobile : PIN_DISTANCE.desktop

    /* ------------------------------------------------------------- *
     * Geometry — in the finale's own pixels
     *
     * Two parts. What depends only on layout is measured on refresh. What
     * depends on where the viewport sits within the pinned section is placed
     * from the pin itself: ScrollTrigger fixes the section at whatever
     * (fractional) offset it had as the pin engaged, and the still must land
     * on the explorer's pixels exactly, so that offset is read back rather
     * than assumed.
     * ------------------------------------------------------------- */
    interface Layout {
      W: number
      H: number
      vh: number
      svh: number
      s1: number
      arch: Box
      B0: Box
    }
    let layout: Layout | null = null
    let geometry: Geometry | null = null
    let placedAt = Number.NaN

    const px = (v: number) => `${v.toFixed(2)}px`

    const measure = () => {
      const finaleBox = finale.getBoundingClientRect()
      const archBox = arch.getBoundingClientRect()
      const W = finaleBox.width
      const H = finaleBox.height
      const vh = window.innerHeight
      // The explorer's viewport is the opening's sticky frame, 100svh tall.
      const stage = document.querySelector<HTMLElement>('.opening__viewport')
      const svh = stage?.clientHeight || vh

      const archRect: Box = {
        x: archBox.left - finaleBox.left,
        y: archBox.top - finaleBox.top,
        w: archBox.width,
        h: archBox.height,
      }

      // The capture as the approved figure paints it: cover-fitted to the
      // arch, centred, at the figure's own scale.
      const sA = Math.max(archRect.w / TOWER.width, archRect.h / TOWER.height) * ARCH_IMAGE_SCALE
      const captureRect: Box = {
        w: TOWER.width * sA,
        h: TOWER.height * sA,
        x: archRect.x + (archRect.w - TOWER.width * sA) / 2,
        y: archRect.y + (archRect.h - TOWER.height * sA) / 2,
      }

      // The still, as that capture implies it.
      const sB0 = sA * FRAME_IN_TOWER.scale
      const B0: Box = {
        x: captureRect.x + FRAME_IN_TOWER.x * sA,
        y: captureRect.y + FRAME_IN_TOWER.y * sA,
        w: FINAL_FRAME_STILL.width * sB0,
        h: FINAL_FRAME_STILL.height * sB0,
      }

      // The still's scale where the explorer holds it: the same cover-fit the
      // canvas and the explorer use, in the opening's frame.
      const s1 = Math.max(W / FINAL_FRAME_STILL.width, svh / FINAL_FRAME_STILL.height)

      layout = { W, H, vh, svh, s1, arch: archRect, B0 }

      // The capture in the still's space: 1 still pixel = s1 screen pixels.
      const r = FRAME_IN_TOWER.scale
      capture.style.left = px((-FRAME_IN_TOWER.x / r) * s1)
      capture.style.top = px((-FRAME_IN_TOWER.y / r) * s1)
      capture.style.width = px((TOWER.width / r) * s1)
      capture.style.height = px((TOWER.height / r) * s1)

      placedAt = Number.NaN
    }

    /** Where the viewport's top sits in the section: from the pin when pinned, else as it will be. */
    const viewportTop = () => {
      if (!layout) return 0
      if (finale.style.position === 'fixed') {
        const top = parseFloat(finale.style.top)
        if (!Number.isNaN(top)) return -top
      }
      return layout.H - layout.vh
    }

    const place = (vt: number) => {
      const l = layout
      if (!l) return
      placedAt = vt

      const B1: Box = {
        w: FINAL_FRAME_STILL.width * l.s1,
        h: FINAL_FRAME_STILL.height * l.s1,
        x: (l.W - FINAL_FRAME_STILL.width * l.s1) * FOCAL_X,
        y: vt + (l.svh - FINAL_FRAME_STILL.height * l.s1) * FOCAL_Y,
      }

      // The arch grown to the still's extent, a hair inside it; then grown
      // until its curved half has cleared the top of the frame.
      const almost = insetBox(B1, 1)
      const final: Box = { x: -0.1 * l.W, y: vt - 1.5 * l.vh, w: 1.2 * l.W, h: 2.8 * l.vh }
      const layer = insetBox(unionBox(l.arch, l.B0, B1, final), -2)

      geometry = { arch: l.arch, B0: l.B0, B1, almost, final, layer }

      mask.style.left = px(layer.x)
      mask.style.top = px(layer.y)
      mask.style.width = px(layer.w)
      mask.style.height = px(layer.h)
      content.style.left = px(B1.x - layer.x)
      content.style.top = px(B1.y - layer.y)
      content.style.width = px(B1.w)
      content.style.height = px(B1.h)
    }

    /* ------------------------------------------------------------- *
     * The two things that move, written once per frame
     * ------------------------------------------------------------- */
    const proxy = { c: 0, p1: 0, p2: 0 }

    const apply = () => {
      const vt = viewportTop()
      if (vt !== placedAt) place(vt)
      const g = geometry
      if (!g) return
      const box = proxy.p2 > 0 ? lerpBox(g.almost, g.final, proxy.p2) : lerpBox(g.arch, g.almost, proxy.p1)
      mask.style.clipPath = archClip(box, g.layer)

      const still = lerpBox(g.B0, g.B1, proxy.c)
      content.style.transform = `translate(${(still.x - g.B1.x).toFixed(2)}px, ${(still.y - g.B1.y).toFixed(2)}px) scale(${(still.w / g.B1.w).toFixed(5)})`
    }

    /* ------------------------------------------------------------- *
     * The hand-off
     * ------------------------------------------------------------- */
    let done = false
    const handoff = () => {
      if (done) return
      done = true
      // Everything of the chapter — the fixed nav included — goes in one write,
      // before the page is moved and before anything can be painted.
      const root = host.current
      if (root) root.style.visibility = 'hidden'
      const opening = document.querySelector<HTMLElement>('[data-opening-root]')
      if (opening) jumpTo(Math.ceil(pageTop(opening) + opening.offsetHeight - window.innerHeight))
      // Held still until the application has taken the chapter down.
      lockScroll()
      completeRef.current()
    }

    measure()
    place(viewportTop())

    const context = gsap.context(() => {
      const q = (selector: string) => finale.querySelector<HTMLElement>(selector)
      const intro = q('.rp-final-intro')
      const word = q('.rp-final-word')
      const call = q('.rp-final-call')
      const baseMeta = q('.rp-final-base > span')
      const baseLink = q('.rp-final-base > .rp-text-link')
      const logo = q('.rp-final-base > img')
      const nav = host.current ? Array.from(host.current.querySelectorAll<HTMLElement>('.rp-ui')) : []
      const present = (...targets: (HTMLElement | null)[]) => targets.filter((t): t is HTMLElement => t !== null)

      const timeline = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: apply })
      // A zero-effect spine, so every position below is a fraction of the pin.
      timeline.to({}, { duration: 1 }, 0)

      if (reduced) {
        // No travel: the still simply comes forward, full-frame, over the finale.
        proxy.c = 1
        proxy.p1 = 1
        proxy.p2 = 1
        gsap.set(capture, { opacity: 0 })
        timeline.fromTo(portal, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: 'sine.inOut' }, 0.15)
        timeline.to(present(intro, baseMeta, baseLink, call, word, logo, ...nav), { opacity: 0, duration: 0.4, ease: 'sine.in' }, 0.1)
      } else {
        // The portal takes over from the figure on the first breath of scroll,
        // over the same pixels: nothing moves until it has.
        const swap = 0.04
        timeline.fromTo(portal, { autoAlpha: 0 }, { autoAlpha: 1, duration: swap }, 0)

        // The picture: a breath during the hold, then the travel to the
        // explorer's rectangle, complete by the time the arch is open.
        timeline.to(proxy, { c: 0.03, duration: BEATS.hold - swap, ease: 'sine.inOut' }, swap)
        timeline.to(proxy, { c: 1, duration: BEATS.open - BEATS.hold, ease: 'power2.inOut' }, BEATS.hold)

        // The mask: the arch grows to the picture's extent with the same ease
        // over the same span, so it never outruns what it frames …
        timeline.to(proxy, { p1: 1, duration: BEATS.open - BEATS.hold, ease: 'power2.inOut' }, BEATS.hold)
        // … eases on through the exchange, and its curve leaves at the last.
        timeline.to(proxy, { p2: 0.25, duration: BEATS.exchange - BEATS.open, ease: 'sine.inOut' }, BEATS.open)
        timeline.to(proxy, { p2: 1, duration: 1 - BEATS.exchange, ease: 'power1.inOut' }, BEATS.exchange)

        // The exchange: the capture goes, the still is already there beneath it.
        timeline.to(capture, { opacity: 0, duration: BEATS.exchange - BEATS.open, ease: 'sine.inOut' }, BEATS.open)

        // The surround, in order of weight: metadata first, then the invitation,
        // the nav, the SAION mark last; the word is covered by the arch itself
        // and only let go once it nearly is.
        timeline.to(present(intro), { opacity: 0, duration: 0.18, ease: 'sine.in' }, BEATS.hold)
        timeline.to(present(baseMeta), { opacity: 0, duration: 0.18, ease: 'sine.in' }, 0.23)
        timeline.to(present(baseLink), { opacity: 0, duration: 0.18, ease: 'sine.in' }, 0.26)
        timeline.to(present(call), { opacity: 0, y: 28, duration: 0.26, ease: 'power1.in' }, 0.24)
        timeline.to(nav, { opacity: 0, duration: 0.35, ease: 'sine.inOut' }, 0.35)
        timeline.to(present(logo), { opacity: 0, duration: 0.22, ease: 'sine.in' }, 0.5)
        timeline.to(present(word), { opacity: 0, duration: 0.25, ease: 'sine.in' }, 0.55)
      }

      const trigger = ScrollTrigger.create({
        trigger: finale,
        start: 'bottom bottom',
        end: () => `+=${Math.round(window.innerHeight * distance)}`,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        scrub: true,
        animation: timeline,
        onRefreshInit: measure,
        onRefresh: apply,
        // The pin's own styles land after the timeline has rendered, so the
        // placement is checked again here, at the end of the update, before
        // the frame is painted.
        onToggle: apply,
        onUpdate: (self) => {
          if (viewportTop() !== placedAt) apply()
          if (self.progress >= 0.999) handoff()
        },
      })
      triggerRef.current = trigger
    }, finale)

    return () => {
      triggerRef.current = null
      context.revert()
    }
  }, [active, host, triggerRef])

  return (
    <div className="rp-portal" ref={ref} data-rp-portal aria-hidden="true">
      <div className="rp-portal-mask" data-rp-mask>
        <div className="rp-portal-content" data-rp-content>
          {/* Both boxes are sized by their width/height attributes, so
              withholding the sources shifts nothing either way. */}
          {/* The explorer's still, beneath: where the chapter ends up. */}
          <img
            className="rp-portal-still"
            data-rp-b
            src={sources ? FINAL_FRAME_STILL.src : undefined}
            width={FINAL_FRAME_STILL.width}
            height={FINAL_FRAME_STILL.height}
            alt=""
            decoding="async"
            fetchPriority="low"
            draggable={false}
          />
          {/* The capture the finale shows, registered onto the still. */}
          <img
            className="rp-portal-capture"
            data-rp-a
            src={sources ? towerSrc : undefined}
            width={TOWER.width}
            height={TOWER.height}
            alt=""
            decoding="async"
            fetchPriority="low"
            draggable={false}
          />
        </div>
      </div>
    </div>
  )
}
