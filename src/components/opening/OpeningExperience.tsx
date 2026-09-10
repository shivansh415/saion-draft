import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import {
  breakAt,
  breakSpan,
  CHAPTER_HEIGHT_VH,
  CHAPTER_UNITS,
  CRITICAL_FRAMES,
  FONT_WAIT_MS,
  FRAME_SOURCES,
  HANDOFF,
  HERO_EXIT_END,
  HERO_EXIT_START,
  HINT_EXIT_END,
  LIFESTYLE_MOUNT_AT,
  resolveFrame,
  unitFraction,
} from '../../data/opening'
import { useImageSequence } from '../../hooks/useImageSequence'
import { FloorExplorer } from '../floor-explorer/FloorExplorer'
import { AmenitiesHotspot } from './AmenitiesHotspot'
import { ReceptionExperience } from '../reception/ReceptionExperience'
import { prefetchLifestyle } from '../repose/lazy'
import { CanvasSequence } from './CanvasSequence'
import type { CanvasSequenceHandle } from './CanvasSequence'
import { ChapterBreak } from './ChapterBreak'
import { OpeningCopy } from './OpeningCopy'
import { OpeningLoader } from './OpeningLoader'
import type { OpeningLoaderHandle } from './OpeningLoader'
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
   * True while the terrace has the frame. It covers this chapter completely
   * — a fixed layer, not a section after it — so the film has nothing worth
   * painting and nothing here should answer a pointer or a Tab.
   */
  terraceActive: boolean
  /**
   * On into the lifestyle chapter, from the reception inside or from the
   * amenities cue on the podium. Both travel the page to its beginning.
   */
  onExplore: () => void
  /** Up to the terrace, from above Level 15 in the floor explorer. */
  onTerrace: () => void
  /**
   * The visitor is deep enough in this chapter that the next one should be in
   * the document below them. Fired once on the way down; the chapter is put
   * there BELOW the current position, so the document grows and nothing moves
   * under the visitor — which is what makes the journey continuous rather
   * than a hand-over between two states.
   */
  onNearLifestyle: () => void
}

export function OpeningExperience({ terraceActive, onExplore, onTerrace, onNearLifestyle }: Props) {
  /**
   * True when this chapter's picture is nobody's business: the visitor has
   * scrolled past it into the chapters below, or the terrace has covered it.
   *
   * It used to mean "the lifestyle chapter is mounted". That is no longer the
   * same thing — the lifestyle chapter is now put into the document long
   * before the visitor reaches it, and the two are on one continuous scroll —
   * so it is measured rather than inferred.
   */
  const [scrolledPast, setScrolledPast] = useState(false)
  const covered = scrolledPast || terraceActive
  const sectionRef = useRef<HTMLElement | null>(null)
  const canvasRef = useRef<CanvasSequenceHandle | null>(null)
  const meterRef = useRef<HTMLDivElement | null>(null)
  const loaderRef = useRef<OpeningLoaderHandle | null>(null)

  /** True once the hand-off has settled and the explorer may take input. */
  const [explorerActive, setExplorerActive] = useState(false)
  const explorerActiveRef = useRef(false)

  /**
   * The preloader is up until the film can be travelled through, and the
   * chapter is not live until it begins to leave. `loaderUp` takes it out of
   * the tree once its exit has finished; `revealed` flips a beat earlier, when
   * the exit starts, so the opening title plays into the fade rather than
   * behind it.
   */
  const [loaderUp, setLoaderUp] = useState(true)
  const [revealed, setRevealed] = useState(false)
  const [fontsReady, setFontsReady] = useState(() => document.fonts?.status === 'loaded')

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
  /**
   * True while the chapter's picture is nobody's business — the lifestyle
   * chapter has the page and this section is scrolled out of the viewport
   * behind it. The rAF loop keeps its cadence but stops resolving, warming and
   * compositing frames, which is the whole of its cost.
   */
  const dormantRef = useRef(false)
  /** Mirrors `revealed` for the rAF loop, which must not re-subscribe to read it. */
  const revealedRef = useRef(false)

  const onProgress = useCallback((fraction: number) => {
    const meter = meterRef.current
    if (meter) meter.style.transform = `scaleX(${fraction})`
  }, [])

  // Straight to the loader's drawing. Deliberately not React state: the film
  // must not re-render the chapter thirty-two times on its way in.
  const onCriticalProgress = useCallback((fraction: number) => {
    loaderRef.current?.setProgress(fraction)
  }, [])

  const { controllerRef, firstFrameReady, primed, criticalReady } = useImageSequence(FRAME_SOURCES, {
    criticalCount: CRITICAL_FRAMES,
    onProgress,
    onCriticalProgress,
  })

  /* --------------------------------------------------------------- *
   * The reveal gate
   *
   * The chapter is never shown before the display face has loaded (the
   * title is set in it, and a swap after the reveal is exactly the jump
   * this is here to prevent) or before the first frame is on the canvas.
   * Neither is waited on for ever.
   * --------------------------------------------------------------- */
  useEffect(() => {
    if (fontsReady) return

    let cancelled = false
    const done = () => {
      if (!cancelled) setFontsReady(true)
    }
    // Either answer releases the gate: a face that will not load must not hold
    // the visitor, and the fallback stack is legible on its own.
    document.fonts?.ready.then(done, done)
    const timer = window.setTimeout(done, FONT_WAIT_MS)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [fontsReady])

  const onReveal = useCallback(() => setRevealed(true), [])
  const onLoaderDone = useCallback(() => setLoaderUp(false), [])

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
      if (dormantRef.current) return

      const controller = controllerRef.current
      const canvas = canvasRef.current
      if (!controller || !canvas) return

      // Section progress → film units; past 1 the film simply holds its last frame.
      const { a, b, mix } = resolveFrame(targetRef.current * CHAPTER_UNITS)
      const indexA = Math.round(a)
      const indexB = Math.round(b)

      controller.setPriority(indexA)
      // Pre-decoding a rolling window ahead of the playhead is what keeps fast
      // scrubbing smooth. It is also two dozen 1600×900 decodes, and while the
      // preloader has the frame they would all land in the same few frames as
      // its line work — measurably, a 166ms stall a fifth of a second in. The
      // page is held at zero until the reveal, so there is nothing to scrub
      // towards yet: the window is warmed from the reveal onward, by which time
      // it is well ahead of any thumb.
      if (revealedRef.current) controller.warm(indexA)

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

  // The lifestyle chapter covers this one completely and scrolls it out of the
  // viewport, so while it holds the page there is nothing here worth painting.
  // Coming back, the next tick is forced to repaint rather than trusting the
  // key it left behind.
  useEffect(() => {
    dormantRef.current = covered
    if (!covered) {
      lastKeyRef.current = ''
      approximateRef.current = true
    }
  }, [covered])

  useEffect(() => {
    revealedRef.current = revealed
    // From here the film is no longer the only thing the page wants: the
    // reception's stills and the lifestyle bundle are about to ask for the
    // same pipe, and whatever is left of the film should be weighed against
    // them rather than outranking them.
    if (revealed) controllerRef.current?.setEager(false)
  }, [revealed, controllerRef])

  // The lifestyle chapter is a separate bundle, fetched only when the building
  // is complete and one of its two cues could actually be pressed — off the
  // critical path on the way in, and warm well before anyone reaches for it.
  useEffect(() => {
    if (explorerActive) prefetchLifestyle()
  }, [explorerActive])

  // Is this chapter still on screen at all? Everything expensive here — the
  // frame resolution, the compositing, the explorer's pointer handling — is
  // switched off while it is not.
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => setScrolledPast(!self.isActive),
    })
    return () => trigger.kill()
  }, [])

  // And: put the next chapter into the document, once, on the way down.
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: () => `top top-=${section.offsetHeight * unitFraction(LIFESTYLE_MOUNT_AT)}`,
      invalidateOnRefresh: true,
      onEnter: onNearLifestyle,
      // Deliberately no `onLeaveBack`: once the chapter is in the document it
      // stays. Taking it out again on the way up would change the document's
      // height under a moving scroll, which is exactly the jump this
      // architecture exists to avoid. The arch at the far end is the only
      // thing that removes it, and it does so behind its own cover.
    })
    return () => trigger.kill()
  }, [onNearLifestyle])

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

      /* ----------------------------------------------------------- *
       * WHY DUBAI? — during the construction, when the building is
       * half-built. The text fades in and slides up, then retires
       * before the tower completes. It sits on the left gutter, on a
       * colour panel that wipes in under it, so it stays readable over
       * the bright construction frames.
       *
       * Film units: 0.58 → 0.76. The chapter break ends at 0.512,
       * so the building is well into construction by the time this
       * appears.
       * ----------------------------------------------------------- */
      timeline.fromTo(
        '[data-why-dubai]',
        { opacity: 0 },
        { opacity: 1, duration: 0.06, ease: 'power2.out' },
        0.58,
      )
      // The colour field, wiped in from the left a beat ahead of the type so the
      // words land on it rather than arriving with it. A clip on one flat
      // gradient — nothing here filters the canvas underneath.
      timeline.fromTo(
        '[data-why-panel]',
        { clipPath: 'inset(0% 100% 0% 0%)', opacity: 0 },
        { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, duration: 0.09, ease: 'power3.out' },
        0.575,
      )
      timeline.fromTo(
        '[data-why-heading]',
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.08, ease: 'power3.out' },
        0.58,
      )
      timeline.fromTo(
        '[data-why-body]',
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.08, ease: 'power3.out' },
        0.62,
      )
      // Retire
      timeline.to(
        '[data-why-dubai]',
        { opacity: 0, y: -20, duration: 0.06, ease: 'power2.in' },
        0.74,
      )

      /* ----------------------------------------------------------- *
       * TALLEST BUILDING — right-side, once the building is complete.
       * Film units: in at 0.78, out at 0.92.
       * ----------------------------------------------------------- */
      timeline.fromTo(
        '[data-tallest-eyebrow]',
        { opacity: 0 },
        { opacity: 1, duration: 0.05, ease: 'power2.out' },
        0.78,
      )
      timeline.fromTo(
        '[data-tallest-rule]',
        { scaleX: 0 },
        { scaleX: 1, duration: 0.06, ease: 'power2.out' },
        0.80,
      )
      timeline.fromTo(
        '[data-tallest-heading]',
        { opacity: 0, x: 30 },
        { opacity: 1, x: 0, duration: 0.08, ease: 'power3.out' },
        0.80,
      )
      timeline.fromTo(
        '[data-tallest-sub]',
        { opacity: 0 },
        { opacity: 1, duration: 0.05, ease: 'power2.out' },
        0.85,
      )
      timeline.fromTo(
        '[data-tallest]',
        { opacity: 1 },
        { opacity: 0, duration: 0.05, ease: 'power2.in' },
        0.92,
      )

      /* ----------------------------------------------------------- *
       * Hand-off — the film holds its last frame and the floor
       * explorer settles over the same picture.
       *
       * There is no closing title card here any more. The film used to
       * arrive at the completed tower, dim behind a grade, and hold a
       * "Stately Serenity" card before handing over; the building now
       * simply completes and stays on screen, so the approach runs
       * straight into the explorer and the two cues on the render.
       * ----------------------------------------------------------- */

      const explorerIn = HANDOFF.explorerInEnd - HANDOFF.explorerInStart

      // The explorer's still is the film's final frame, so this crossfade only
      // ever changes the grade — never the picture.
      //
      // It brings in the layer and nothing else. The explorer's own copy and
      // level rail used to be scrubbed in here alongside it, which meant the
      // film ended on a building already covered in interface; they are now
      // the explorer's to reveal, when the visitor asks for them.
      timeline.to('[data-fx-root]', { opacity: 1, duration: explorerIn * 0.7 }, HANDOFF.explorerInStart)
    }, section)

    return () => context.revert()
  }, [])

  /* --------------------------------------------------------------- *
   * Entrance — plays once the chapter is actually being looked at
   *
   * Gated on the reveal, not merely on the first frame: the loader covers
   * the frame for a second or two, and a title that had already animated
   * in behind it would simply be *there* when the loader lifted. It now
   * begins as the arch opens, so the two moves are one.
   * --------------------------------------------------------------- */
  useEffect(() => {
    if (!firstFrameReady || !revealed) return
    const section = sectionRef.current
    if (!section) return

    const context = gsap.context(() => {
      // Each element's hidden state is declared in CSS so nothing untweened is
      // ever painted, and restated here as the `from` of a fromTo. That restating
      // matters: a percentage translate set in CSS comes back out of
      // getComputedStyle already resolved to pixels, so a plain `to({yPercent: 0})`
      // would read the current yPercent as 0 and animate nothing at all.
      // Timed against the loader's exit: the title starts to rise just as the
      // arch opens and the ground begins to clear, so it is caught mid-move
      // rather than found already standing there.
      const intro = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.4 })

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
  }, [firstFrameReady, revealed])

  return (
    <section
      ref={sectionRef}
      className="opening"
      data-opening-root
      style={{ height: `${CHAPTER_HEIGHT_VH}vh` }}
      aria-label="Reposé Residence — the approach"
      inert={terraceActive || undefined}
    >
      <div className="opening__viewport">
        <CanvasSequence ref={canvasRef} className="opening__canvas" />

        <div className="opening__scrim" data-opening-scrim />

        <OpeningCopy />
        <ScrollHint />

        {/* The hand-over from the approach to the build. Last of the opening's
            own layers, so its veil covers every one of them. */}
        <ChapterBreak />

        {/* WHY DUBAI? — appears during the construction sequence (seq 02),
            scrubbed by the same timeline as the chapter break. */}
        <div className="why-dubai" data-why-dubai aria-hidden="true">
          <div className="why-dubai__block">
            <span className="why-dubai__panel" data-why-panel />
            <h2 className="why-dubai__heading" data-why-heading>WHY DUBAI?</h2>
            <p className="why-dubai__body" data-why-body>
              From global trade and innovation to luxury living and world-class
              experiences, Dubai has become a magnet for ambition. It's where
              opportunity meets security—drawing millions who want more
              than just a place to live.
            </p>
          </div>
        </div>

        {/* TALLEST BUILDING IN AL FURJAN — after construction completes, right-side */}
        <div className="tallest-building" data-tallest aria-hidden="true">
          <span className="tallest-building__eyebrow" data-tallest-eyebrow>Reposé Residence · Al Furjan</span>
          <span className="tallest-building__rule" data-tallest-rule />
          <h2 className="tallest-building__heading" data-tallest-heading>
            Tallest<br />
            <em>in Al Furjan.</em>
          </h2>
          <span className="tallest-building__sub" data-tallest-sub>The uptown of Dubai</span>
        </div>

        {/* Chapter 02 rests over the held final frame; the hand-off above scrubs it in. */}
        <FloorExplorer active={explorerActive} onTerrace={onTerrace} suspended={entering || covered} />

        {/* The way to the amenities, marked on the storey it belongs to. It is a
            sibling of the explorer so the stylesheet can retire it the moment the
            explorer is revealed and the level bands claim those pixels. */}
        <AmenitiesHotspot active={explorerActive && !entering && !covered} onExplore={onExplore} />

        {/* Chapter 03 rests over the same frame, above the explorer: only the cue at
            the entrance until it is asked for; then the walk into the reception.
            From inside, the way on is Chapter 04 — the lifestyle — which mounts
            after this section and, at its end, hands the frame back here. */}
        <ReceptionExperience
          active={explorerActive}
          onJourney={setEntering}
          onExplore={onExplore}
          preload={revealed}
        />

        <div className="opening__meter" data-primed={primed || undefined}>
          <div className="opening__meter-fill" ref={meterRef} />
        </div>
      </div>

      {/* Holds the frame — and the page — until the film can be travelled
          through. It portals to <body>, so its position in the tree is
          bookkeeping rather than layout. */}
      {loaderUp && (
        <OpeningLoader
          ref={loaderRef}
          ready={firstFrameReady && fontsReady && criticalReady}
          minimum={firstFrameReady && fontsReady}
          onReveal={onReveal}
          onDone={onLoaderDone}
        />
      )}
    </section>
  )
}
