import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

import { registerSmoothScroll } from '../lib/scrollLock'

gsap.registerPlugin(ScrollTrigger)

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
 * film's inertia lives here. That let the value below move from a light touch
 * to genuine glide without the sluggish, "chasing" feel a second smoothing
 * pass on top of it used to cause.
 */
export function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({
      lerp: 0.075,
      wheelMultiplier: 1.15,
      touchMultiplier: 1.4,
      smoothWheel: true,
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
