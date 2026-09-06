import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import {
  breakAt,
  breakSpan,
  CHAPTER_HEIGHT_VH,
  CHAPTER_UNITS,
  FINAL_IN_END,
  FINAL_IN_START,
  FRAME_SOURCES,
  HANDOFF,
  HERO_EXIT_END,
  HERO_EXIT_START,
  HINT_EXIT_END,
  resolveFrame,
} from '../../data/opening'
import { useImageSequence } from '../../hooks/useImageSequence'
import { FloorExplorer } from '../floor-explorer/FloorExplorer'
import { ReceptionExperience } from '../reception/ReceptionExperience'
import { CanvasSequence } from './CanvasSequence'
import type { CanvasSequenceHandle } from './CanvasSequence'
import { ChapterBreak } from './ChapterBreak'
import { FinalReveal } from './FinalReveal'
import { OpeningCopy } from './OpeningCopy'
import { ScrollHint } from './ScrollHint'
import '../../styles/opening.css'

gsap.registerPlugin(ScrollTrigger)

/**
 * Chapter 01 — "The Approach".
 *
 * A single sticky viewport holds one canvas for the entire chapter. Scroll
 * progress drives the film; nothing plays on its own, and reversing the scroll
 * reverses the camera. Overlay typography is animated by GSAP on separate
 * elements from the frame renderer, so the two never contend for the same
 * properties.
 *
 * The scroll track is longer than the film. Past the film's end the final
 * frame holds while the closing title retires and the floor explorer settles
 * over it (the `HANDOFF` beats); the explorer then takes input for the rest
 * of the track. The film itself is untouched by this: its beats are fractions
 * of the film track, not of the whole chapter.
 */
interface Props {
  /**
   * True while the lifestyle chapter has the frame (and while it is handing
   * it back). The explorer stands down and the reception's journey is put to
   * rest, so the chapter returns to the clean building.
   */
  lifestyleActive: boolean
  /** From inside the reception: on into the lifestyle chapter. */
  onExplore: () => void
}

export function OpeningExperience({ lifestyleActive, onExplore }: Props) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const canvasRef = useRef<CanvasSequenceHandle | null>(null)
  const meterRef = useRef<HTMLDivElement | null>(null)

  /** True once the hand-off has settled and the explorer may take input. */
  const [explorerActive, setExplorerActive] = useState(false)
  const explorerActiveRef = useRef(false)

  /** True while the walk into the reception has the frame; the explorer stands down. */
  const [entering, setEntering] = useState(false)

  /**
   * Raw scroll progress, written by ScrollTrigger, read by the rAF loop.
   *
   * Lenis already smooths the raw wheel/touch input and drives ScrollTrigger
   * from its own rAF-synced ticker, so this value is already a continuous,
   * inertial curve — not a step function. Feeding it straight into
   * `resolveFrame` (rather than running a second lerp on top of it) matters:
   * two stacked smoothing filters compound their latency, which reads as a
   * sluggish, delayed image rather than a smooth one. One smoothing layer,
   * owned by Lenis, is both smoother-looking and more responsive.
   */
  const targetRef = useRef(0)
  /** Guards against redundant repaints. */
  const lastKeyRef = useRef('')
  /** True when the previous paint used a stand-in rather than the exact frame. */
  const approximateRef = useRef(true)

  const onProgress = useCallback((fraction: number) => {
    const meter = meterRef.current
    if (meter) meter.style.transform = `scaleX(${fraction})`
  }, [])

  const { controllerRef, firstFrameReady, primed } = useImageSequence(FRAME_SOURCES, {
    onProgress,
  })

  /* --------------------------------------------------------------- *
   * Scroll → frame
   * --------------------------------------------------------------- */
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    // The explorer becomes interactive only once the hand-off has settled —
    // a single state flip at the threshold, never a per-scroll update.
    const syncExplorer = (progress: number) => {
      const active = progress * CHAPTER_UNITS >= HANDOFF.activeAt - 1e-6
      if (active !== explorerActiveRef.current) {
        explorerActiveRef.current = active
        setExplorerActive(active)
      }
    }

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        targetRef.current = self.progress
        syncExplorer(self.progress)
      },
    })

    // Honour a position restored by the browser or a mid-chapter reload.
    targetRef.current = trigger.progress
    syncExplorer(trigger.progress)

    let frameId = 0

    const tick = () => {
      frameId = requestAnimationFrame(tick)

      const controller = controllerRef.current
      const canvas = canvasRef.current
      if (!controller || !canvas) return

      // Section progress → film units; past 1 the film simply holds its last frame.
      const { a, b, mix } = resolveFrame(targetRef.current * CHAPTER_UNITS)
      const indexA = Math.round(a)
      const indexB = Math.round(b)

      controller.setPriority(indexA)
      controller.warm(indexA)

      const key = `${indexA}:${indexB}:${mix.toFixed(3)}`
      if (key === lastKeyRef.current && !approximateRef.current) return
      lastKeyRef.current = key

      const exactA = controller.get(indexA)
      const imageA = exactA ?? controller.getNearest(indexA)
      if (!imageA) {
        // Nothing to show yet — leave whatever is already on the canvas rather
        // than clearing it. Retry on the next frame.
        approximateRef.current = true
        return
      }

      let imageB: HTMLImageElement | null = null
      let exactB = true
      if (mix > 0.001 && indexB !== indexA) {
        const found = controller.get(indexB)
        imageB = found ?? controller.getNearest(indexB)
        exactB = found !== null
      }

      approximateRef.current = exactA === null || !exactB
      canvas.draw(imageA, imageB, mix)
    }

    frameId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frameId)
      trigger.kill()
    }
  }, [controllerRef])

  /* --------------------------------------------------------------- *
   * Scroll → typography
   * --------------------------------------------------------------- */
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
        },
        defaults: { ease: 'none' },
      })

      // A zero-effect spine so every position below reads in film units: 1 is
      // the end of the film track, and the hand-off beats sit past it.
      timeline.to({}, { duration: CHAPTER_UNITS }, 0)

      timeline.to(
        '[data-opening-hint]',
        { opacity: 0, y: 12, duration: HINT_EXIT_END, ease: 'power1.in' },
        0,
      )

      timeline.to(
        '[data-opening-hero]',
        {
          yPercent: -9,
          scale: 1.035,
          opacity: 0,
          filter: 'blur(5px)',
          duration: HERO_EXIT_END - HERO_EXIT_START,
          ease: 'power2.in',
        },
        HERO_EXIT_START,
      )

      timeline.to(
        '[data-opening-scrim]',
        { opacity: 0, duration: HERO_EXIT_END - HERO_EXIT_START + 0.02 },
        HERO_EXIT_START,
      )

      /* ----------------------------------------------------------- *
       * Chapter break — the approach ends, the picture is exchanged
       * behind a title card, and the build begins.
       *
       * Every beat is a fraction of the break (0 → 1 across the band)
       * resolved into film units, so the card's internal pacing is
       * stated once, here, and stays right if the band is ever
       * lengthened or shortened in `CHAPTER_BREAK`.
       *
       * Nothing below runs on a clock: the whole card is scrubbed, so
       * scrolling back up disassembles it in the order it was built.
       * ----------------------------------------------------------- */

      // The push carries the camera through the exchange; on a reduced-motion
      // display it shrinks to almost nothing, and the sweep stands down.
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const push = reduced ? 1.008 : 1.055
      const blur = reduced ? 0 : 6

      timeline.fromTo(
        '[data-cb-veil]',
        { opacity: 0 },
        // Slow to start, so the last frame of the approach genuinely holds in
        // the clear before the frame begins to go.
        { opacity: 1, duration: breakSpan(0, 0.36), ease: 'power2.in' },
        breakAt(0),
      )

      // The canvas is pushed in and softened INTO the exchange and released out
      // of it, so the two clips are never at the same apparent focal length at
      // the moment they change places — the mismatch has nowhere to register.
      timeline.fromTo(
        '[data-opening-canvas]',
        { scale: 1, filter: 'blur(0px)' },
        { scale: push, filter: `blur(${blur}px)`, duration: breakSpan(0, 0.5), ease: 'power1.in' },
        breakAt(0),
      )
      timeline.to(
        '[data-opening-canvas]',
        { scale: 1, filter: 'blur(0px)', duration: breakSpan(0.5, 1), ease: 'power1.out' },
        breakAt(0.5),
      )

      timeline.fromTo(
        '[data-cb-field]',
        { opacity: 0 },
        { opacity: 1, duration: breakSpan(0.1, 0.4) },
        breakAt(0.1),
      )
      timeline.fromTo(
        '[data-cb-rule]',
        { scaleY: 0 },
        {
          scaleY: 1,
          duration: breakSpan(0.12, 0.5),
          stagger: breakSpan(0, 0.035),
          ease: 'power2.out',
        },
        breakAt(0.12),
      )

      timeline.fromTo(
        '[data-cb-type]',
        { opacity: 0, y: 0, filter: 'blur(0px)' },
        { opacity: 1, duration: breakSpan(0.16, 0.36) },
        breakAt(0.16),
      )
      // `y: 0` on both ends for the same reason as the entrance timeline: the
      // resting translate is a percentage in CSS, which comes back out of
      // getComputedStyle already resolved to pixels. Without zeroing the pixel
      // component GSAP would add the two and the line would never clear its
      // mask.
      timeline.fromTo(
        '[data-cb-line]',
        { yPercent: 116, y: 0 },
        {
          yPercent: 0,
          y: 0,
          duration: breakSpan(0.18, 0.54),
          stagger: breakSpan(0, 0.05),
          ease: 'power3.out',
        },
        breakAt(0.18),
      )
      timeline.fromTo(
        '[data-cb-hrule]',
        { scaleX: 0 },
        { scaleX: 1, duration: breakSpan(0.3, 0.58), ease: 'power2.out' },
        breakAt(0.3),
      )
      timeline.fromTo(
        '[data-cb-meta]',
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: breakSpan(0.34, 0.6), ease: 'power2.out' },
        breakAt(0.34),
      )

      timeline.fromTo(
        '[data-cb-sweep]',
        { xPercent: -135, x: 0 },
        { xPercent: 135, x: 0, duration: breakSpan(0.2, 0.84), ease: 'none' },
        breakAt(0.2),
      )
      timeline.fromTo(
        '[data-cb-sweep]',
        { opacity: 0 },
        { opacity: reduced ? 0 : 1, duration: breakSpan(0.2, 0.34) },
        breakAt(0.2),
      )
      timeline.to(
        '[data-cb-sweep]',
        { opacity: 0, duration: breakSpan(0.66, 0.84) },
        breakAt(0.66),
      )

      // The card retires first, then the veil, so the site is revealed by the
      // darkness lifting rather than by the type getting out of its way.
      timeline.to(
        '[data-cb-type]',
        { opacity: 0, y: -18, filter: 'blur(3px)', duration: breakSpan(0.66, 0.9), ease: 'power2.in' },
        breakAt(0.66),
      )
      timeline.to(
        '[data-cb-field]',
        { opacity: 0, duration: breakSpan(0.64, 0.94), ease: 'power2.in' },
        breakAt(0.64),
      )
      timeline.to(
        '[data-cb-veil]',
        { opacity: 0, duration: breakSpan(0.62, 1), ease: 'power2.out' },
        breakAt(0.62),
      )

      timeline.fromTo(
        '[data-opening-final-scrim]',
        { opacity: 0 },
        { opacity: 1, duration: FINAL_IN_END - FINAL_IN_START },
        FINAL_IN_START - 0.012,
      )

      timeline.fromTo(
        '[data-opening-final]',
        { opacity: 0, yPercent: 5, filter: 'blur(6px)' },
        {
          opacity: 1,
          yPercent: 0,
          filter: 'blur(0px)',
          duration: FINAL_IN_END - FINAL_IN_START,
          ease: 'power2.out',
        },
        FINAL_IN_START,
      )

      /* ----------------------------------------------------------- *
       * Hand-off — the film holds its last frame; the closing title
       * retires and the floor explorer settles over the same picture.
       * ----------------------------------------------------------- */

      timeline.to(
        '[data-opening-final]',
        {
          opacity: 0,
          yPercent: -4,
          filter: 'blur(4px)',
          duration: HANDOFF.copyOutEnd - HANDOFF.copyOutStart,
          ease: 'power2.in',
        },
        HANDOFF.copyOutStart,
      )

      const explorerIn = HANDOFF.explorerInEnd - HANDOFF.explorerInStart

      // The explorer's still is the film's final frame, so this crossfade only
      // ever changes the grade — never the picture.
      //
      // It brings in the layer and nothing else. The explorer's own copy and
      // level rail used to be scrubbed in here alongside it, which meant the
      // film ended on a building already covered in interface; they are now
      // the explorer's to reveal, when the visitor asks for them.
      timeline.to(
        '[data-opening-final-scrim]',
        { opacity: 0, duration: explorerIn * 0.7 },
        HANDOFF.explorerInStart,
      )
      timeline.to('[data-fx-root]', { opacity: 1, duration: explorerIn * 0.7 }, HANDOFF.explorerInStart)
    }, section)

    return () => context.revert()
  }, [])

  /* --------------------------------------------------------------- *
   * Entrance — plays once the first frame is actually on screen
   * --------------------------------------------------------------- */
  useEffect(() => {
    if (!firstFrameReady) return
    const section = sectionRef.current
    if (!section) return

    const context = gsap.context(() => {
      // Each element's hidden state is declared in CSS so nothing untweened is
      // ever painted, and restated here as the `from` of a fromTo. That restating
      // matters: a percentage translate set in CSS comes back out of
      // getComputedStyle already resolved to pixels, so a plain `to({yPercent: 0})`
      // would read the current yPercent as 0 and animate nothing at all.
      const intro = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.15 })

      intro
        .fromTo(
          '[data-opening-line]',
          { yPercent: 116, y: 0 },
          { yPercent: 0, y: 0, duration: 1.55, stagger: 0.16 },
        )
        .fromTo(
          '[data-opening-rule]',
          { scaleX: 0 },
          { scaleX: 1, duration: 1.5, ease: 'power2.out' },
          0.62,
        )
        .fromTo(
          '[data-opening-tagline]',
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 1.25 },
          0.8,
        )
        .fromTo(
          '[data-opening-brand]',
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 1.15 },
          1.02,
        )
        .fromTo('[data-opening-hint-inner]', { opacity: 0 }, { opacity: 1, duration: 1.1 }, 1.2)
    }, section)

    return () => context.revert()
  }, [firstFrameReady])

  return (
    <section
      ref={sectionRef}
      className="opening"
      data-opening-root
      style={{ height: `${CHAPTER_HEIGHT_VH}vh` }}
      aria-label="Reposé Residence — the approach"
    >
      <div className="opening__viewport">
        <CanvasSequence ref={canvasRef} className="opening__canvas" />

        <div className="opening__scrim" data-opening-scrim />
        <div className="opening__scrim opening__scrim--final" data-opening-final-scrim />

        <OpeningCopy />
        <FinalReveal />
        <ScrollHint />

        {/* The hand-over from the approach to the build. Last of the opening's
            own layers, so its veil covers every one of them. */}
        <ChapterBreak />

        {/* Chapter 02 rests over the held final frame; the hand-off above scrubs it in. */}
        <FloorExplorer active={explorerActive} suspended={entering || lifestyleActive} />

        {/* Chapter 03 rests over the same frame, above the explorer: only the cue at
            the entrance until it is asked for; then the walk into the reception.
            From inside, the way on is Chapter 04 — the lifestyle — which mounts
            after this section and, at its end, hands the frame back here. */}
        <ReceptionExperience
          active={explorerActive}
          onJourney={setEntering}
          onExplore={onExplore}
          dismissed={lifestyleActive}
        />

        <div className="opening__meter" data-primed={primed || undefined}>
          <div className="opening__meter-fill" ref={meterRef} />
        </div>
      </div>
    </section>
  )
}
