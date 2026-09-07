import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

import { registerSmoothScroll } from '../lib/scrollLock'

gsap.registerPlugin(ScrollTrigger)

/**
 * On a phone, the address bar collapsing and expanding fires a resize — and a
 * resize makes ScrollTrigger re-measure every trigger on the page, mid-scroll,
 * which is felt as a hitch and can jump a scrubbed timeline. The viewport's
 * *width* has not changed, so nothing needs re-measuring; this tells
 * ScrollTrigger to ignore the height-only case. Set once, at module scope,
 * alongside the plugin it configures.
 */
ScrollTrigger.config({ ignoreMobileResize: true })

/**
 * Application-level smooth scrolling.
 *
 * Lenis is driven from GSAP's own ticker rather than its own rAF loop, so
 * scroll integration, ScrollTrigger updates and the canvas render loop all run
 * inside a single frame — the image can never lag a frame behind the scroll
 * position it was computed from.
 *
 * Lenis is the *only* smoothing layer in the chapter — the renderer reads its
 * output straight off ScrollTrigger with no second lerp on top — so all of the
 * film's inertia lives here.
 *
 * Mobile tuning:
 * - `syncTouch: false` — prevents Lenis adding a second smoothing pass on top
 *   of the OS's own touch momentum, which was causing a mushy, delayed feel on
 *   phones. False = Lenis still handles the scroll position, but defers inertia
 *   to the browser's native touch physics on touch devices.
 * - `touchMultiplier` is lowered on phones: native touch momentum already
 *   provides the distance; the old 1.4 multiplied it and felt too fast.
 * - `wheelMultiplier` stays at 1.15 for trackpad/mouse users on desktop.
 */
export function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Detect primary pointer type: 'fine' = mouse/trackpad, 'coarse' = touch screen
    const isTouchPrimary = window.matchMedia('(pointer: coarse)').matches

    const lenis = new Lenis({
      // Slightly crisper than the old 0.075 — one smoothing layer feels more
      // responsive without losing the cinematic glide.
      lerp: isTouchPrimary ? 0.1 : 0.08,
      wheelMultiplier: 1.15,
      // On touch devices the OS already applies momentum; keep the multiplier
      // at 1.0 so Lenis does not compound it into an over-scrolling feeling.
      touchMultiplier: isTouchPrimary ? 1.0 : 1.4,
      smoothWheel: true,
      // Do NOT add a second lerp on top of native touch inertia. Without this,
      // touch devices were running through two independent smoothing filters
      // (the OS's and Lenis's), compounding latency and producing a sluggish,
      // "chasing" feel on mobile that was absent on desktop.
      syncTouch: false,
    })

    const update = () => ScrollTrigger.update()
    lenis.on('scroll', update)

    const raf = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    registerSmoothScroll(lenis)

    return () => {
      registerSmoothScroll(null)
      lenis.off('scroll', update)
      gsap.ticker.remove(raf)
      gsap.ticker.lagSmoothing(500, 33)
      lenis.destroy()
    }
  }, [])
}

