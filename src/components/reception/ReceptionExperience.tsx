import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import {
  CHAPTER_UNITS,
  FINAL_FRAME_STILL,
  FOCAL_X,
  FOCAL_Y,
  RECEPTION_BAND,
  RECEPTION_SPAN,
  unitFraction,
} from '../../data/opening'
import { glideTo, pageTop } from '../../lib/pageScroll'
import { useCoverRect } from '../floor-explorer/useCoverRect'
import { EntranceHotspot } from './EntranceHotspot'
import { EntranceTransition } from './EntranceTransition'
import { insetOf, layoutEntrance } from './entranceLayout'
import { RECEPTION_ASSETS, RECEPTION_COPY } from './receptionCopy'
import '../../styles/reception.css'

type Phase = 'idle' | 'entering' | 'inside' | 'leaving'

interface Props {
  /** True once the film has ended and the clean building is on screen. */
  active: boolean
  /** Told when the journey takes the frame and when it gives it back. */
  onJourney: (underway: boolean) => void
  /** From inside the lobby: on into the lifestyle chapter. */
  onExplore: () => void
  /**
   * The opening has been revealed, so the journey's two large stills may
   * start arriving. Before this they must not: they are 6.6MB between them
   * and would be competing with the film's own critical frames for the same
   * bandwidth, on the one connection, at the one moment it matters.
   */
  preload: boolean
}

/** Leaving is the same journey in reverse, a touch brisker. */
const LEAVE_SPEED = 1.35

/** Fetch-and-decode, once, so the click never waits on the network. */
const warmed = new Map<string, Promise<void>>()
function warm(src: string): Promise<void> {
  let promise = warmed.get(src)
  if (!promise) {
    promise = new Promise<void>((resolve) => {
      const image = new Image()
      image.decoding = 'async'
      image.fetchPriority = 'low'
      image.onload = () => image.decode().then(resolve, () => resolve())
      image.onerror = () => resolve()
      image.src = src
    })
    warmed.set(src, promise)
  }
  return promise
}

/**
 * Chapter 03 — "Enter inside".
 *
 * Lives in the opening's sticky viewport above the floor explorer, over the
 * same held frame. At rest it is only the cue at the entrance. It is walked
 * into BY SCROLLING: across `RECEPTION_BAND` the chapter's scroll progress is
 * mapped onto this timeline's progress, so descending walks the visitor in and
 * ascending walks them back out, continuously and at their own pace.
 *
 * It used to be played on a clock by a click, and the page was locked for the
 * length of the walk. That made the completed building a dead end for anyone
 * who simply kept scrolling — the single thing this rewrite exists to fix. The
 * cue at the door and the "back" control are still here and still work; they
 * are now NAVIGATION, gliding the page to either end of the band, so there is
 * only ever one driver for the timeline and a click can never fight a scroll.
 *
 * The walk itself:
 *
 *   approach   the camera drives at the door — scale, and a translate that
 *              brings the door to the centre as it grows — as one continuous
 *              move, slow to start, quickest as the door fills the frame
 *   doors      the leaves turn inward on their stiles; the reception, already
 *              behind them, is seen through the opening
 *   threshold  the opening grows past the edges of the frame while the glass
 *              flares and the exterior softens and darkens at its edges; the
 *              full-size reception takes over from the one seen through the
 *              door at the instant the two coincide
 *   settle     a step or two further in; then the copy
 *
 * Every layer is driven from one timeline, so leaving is the same timeline
 * reversed: the visitor steps back out through the doors, which close, and
 * the camera pulls back to the clean building — not to the explorer.
 */
export function ReceptionExperience({ active, onJourney, onExplore, preload }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const rect = useCoverRect(rootRef, FINAL_FRAME_STILL.width, FINAL_FRAME_STILL.height, FOCAL_X, FOCAL_Y)
  const layout = useMemo(() => layoutEntrance(rect), [rect])
  const layoutRef = useRef(layout)
  useEffect(() => {
    layoutRef.current = layout
  }, [layout])

  const [phase, setPhase] = useState<Phase>('idle')
  const phaseRef = useRef<Phase>('idle')
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  /** Mirrors the `entering` flag last handed up, so scroll never re-renders for nothing. */
  const underwayRef = useRef(false)

  const changePhase = useCallback((next: Phase) => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  // Both pictures are fetched and decoded ahead of the first click, at low
  // priority so the film's frames are never made to wait for them — and not
  // begun at all until the opening has been revealed and the critical frames
  // are in hand. There are minutes of film between the reveal and the earliest
  // possible click, which is ample; the click path warms them again anyway, so
  // this is a head start rather than a dependency.
  useEffect(() => {
    if (!preload) return
    let cancelled = false
    const start = () => {
      if (cancelled) return
      void warm(RECEPTION_ASSETS.building)
      void warm(RECEPTION_ASSETS.reception)
    }
    // Off the reveal's own frames; the timeout is the floor, for a page that
    // never goes idle because the visitor is already scrolling.
    const idle =
      typeof requestIdleCallback === 'function'
        ? requestIdleCallback(start, { timeout: 1200 })
        : window.setTimeout(start, 900)
    return () => {
      cancelled = true
      if (typeof cancelIdleCallback === 'function') cancelIdleCallback(idle)
      else window.clearTimeout(idle)
    }
  }, [preload])

  /* --------------------------------------------------------------- *
   * The camera
   *
   * One object drives every camera-dependent transform, so the reception
   * seen through the door and the reception at full size move in lockstep
   * through the moment one takes over from the other.
   * --------------------------------------------------------------- */
  const proxy = useRef({ walk: 0, settle: 0, open: 0 })


  /* --------------------------------------------------------------- *
   * Out
   * --------------------------------------------------------------- */
  /**
   * Everything back to rest. Called when the band is left at its start — never
   * to tear the timeline down, which would break the scrub the visitor is
   * still holding.
   */
  const resetScene = useCallback(() => {
    proxy.current = { walk: 0, settle: 0, open: 0 }

    // Rest is restated explicitly — never cleared wholesale, since the scene's
    // geometry lives in the same inline styles React writes.
    const root = rootRef.current
    if (root) {
      const q = (selector: string) => root.querySelectorAll<HTMLElement>(selector)
      gsap.set(q('[data-rc-camera]'), { x: 0, y: 0, scale: 1, opacity: 1 })
      gsap.set(q('[data-rc-still]'), { opacity: 0 })
      gsap.set(q('[data-rc-through]'), { clipPath: insetOf(layoutRef.current.throughInset) })
      gsap.set(q('[data-rc-leaf]'), { rotationY: 0, opacity: 1 })
      gsap.set(q('[data-rc-streak], [data-rc-bloom], [data-rc-vignette], [data-rc-back], [data-rc-welcome], [data-rc-explore]'), { opacity: 0 })
      gsap.set(q('[data-rc-inside]'), { opacity: 0, scale: 1 })
      gsap.set(q('[data-rc-exterior]'), { filter: 'none' })
      gsap.set(root, { '--rc-cue': 1 })
    }

    changePhase('idle')
  }, [changePhase])

  /* --------------------------------------------------------------- *
   * The choreography
   * --------------------------------------------------------------- */
  const build = useCallback((): gsap.core.Timeline | null => {
    const root = rootRef.current
    if (!root) return null
    const q = (selector: string) => root.querySelector<HTMLElement>(selector)
    const camera = q('[data-rc-camera]')
    const inside = q('[data-rc-inside]')
    const back = q('[data-rc-back]')
    const welcome = q('[data-rc-welcome]')
    const onward = q('[data-rc-explore]')
    if (!camera || !inside || !back || !welcome || !onward) {
      return null
    }

    // Paused, and it stays paused: its progress is written by the scroll, never
    // played. The timeline is a simple dissolve — the building fades out, the
    // reception fades in, and the controls follow.
    const timeline = gsap.timeline({ paused: true, defaults: { ease: 'none' } })

    // 0. The cue retires
    timeline.to(root, { '--rc-cue': 0, duration: 0.3, ease: 'power2.out' }, 0)

    // 1. Smooth dissolve: building fades out, reception fades in
    //    The crossfade is slow and overlapping so there is no visible cut.
    timeline.to(camera, { opacity: 0, duration: 1.8, ease: 'power2.inOut' }, 0.2)
    timeline.to(inside, { opacity: 1, duration: 2.0, ease: 'power2.inOut' }, 0.3)

    // 2. Once the reception is mostly in: the controls arrive
    timeline.fromTo(back, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 2.4)
    timeline.fromTo(welcome, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, 2.6)
    timeline.fromTo(onward, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, 2.8)

    return timeline
  }, [])

  /* --------------------------------------------------------------- *
   * The scrub — the walk in, driven by the page
   *
   * Built ONCE, as soon as the explorer has settled and the two stills
   * are decoded, and then simply held at whatever progress the band
   * says. Building it here rather than on demand is what removes the
   * old asynchronous gap: by the time the band can be reached the
   * timeline already exists, so scrolling into it never shows a door
   * with nothing behind it.
   * --------------------------------------------------------------- */
  const ready = useRef(false)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    void Promise.all([warm(RECEPTION_ASSETS.building), warm(RECEPTION_ASSETS.reception)]).then(() => {
      if (cancelled) return
      const timeline = build()
      if (!timeline) return
      timelineRef.current?.kill()
      timelineRef.current = timeline
      ready.current = true
      // Whatever the band already says — a reload part-way down, or a rebuild
      // after a resize, must land on the frame the visitor is looking at.
      ScrollTrigger.refresh()
    })
    return () => {
      cancelled = true
    }
    // `layout` is in here so a resize rebuilds the choreography against the
    // new geometry: every camera position is derived from the cover rect.
  }, [active, build, layout])

  useEffect(
    () => () => {
      timelineRef.current?.kill()
      timelineRef.current = null
    },
    [],
  )

  useEffect(() => {
    const section = document.querySelector<HTMLElement>('[data-opening-root]')
    if (!section) return

    const drive = (progress: number) => {
      const timeline = timelineRef.current
      if (!timeline) return

      // Chapter progress → film units → position within the reception band.
      const units = progress * CHAPTER_UNITS
      const t = Math.min(1, Math.max(0, (units - RECEPTION_BAND.start) / RECEPTION_SPAN))

      timeline.progress(t)

      // The explorer stands down for the whole of the walk, and takes the
      // building back the moment the band is left at its start. Handed up only
      // on a change: this runs on every scroll frame.
      const underway = t > 0
      if (underway !== underwayRef.current) {
        underwayRef.current = underway
        onJourney(underway)
      }

      const next: Phase = t <= 0 ? 'idle' : t >= 0.55 ? 'inside' : 'entering'
      if (next !== phaseRef.current) {
        if (next === 'idle') resetScene()
        else changePhase(next)
      }
    }

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      // Not `scrub`: this drives a timeline's progress directly rather than
      // tweening anything of its own, and Lenis has already smoothed the input
      // (see the note in `OpeningExperience` about stacking two filters).
      onUpdate: (self) => drive(self.progress),
      onRefresh: (self) => drive(self.progress),
    })
    return () => trigger.kill()
  }, [changePhase, onJourney, resetScene])

  /* --------------------------------------------------------------- *
   * The controls — navigation, not a second driver
   *
   * Each one travels the page to a position in the band. The scrub above
   * remains the only thing that ever writes the timeline's progress, so a
   * press and a scroll can never contend for it.
   * --------------------------------------------------------------- */
  const travelTo = useCallback((unit: number, duration: number) => {
    const section = document.querySelector<HTMLElement>('[data-opening-root]')
    if (!section) return
    glideTo(pageTop(section) + section.offsetHeight * unitFraction(unit), duration)
  }, [])

  /** "Enter inside" — the walk, at about the pace it always played at. */
  const enter = useCallback(() => {
    if (!active) return
    travelTo(RECEPTION_BAND.end, 2.6)
  }, [active, travelTo])

  /** "Back to building" — the same walk in reverse, a touch brisker. */
  const leave = useCallback(() => {
    travelTo(RECEPTION_BAND.start, 2.6 / LEAVE_SPEED)
  }, [travelTo])

  /* --------------------------------------------------------------- *
   * On — into the lifestyle chapter
   * --------------------------------------------------------------- */
  const explore = useCallback(() => {
    onExplore()
  }, [onExplore])

  // Escape steps back out, from anywhere on the way in or inside.
  useEffect(() => {
    if (phase === 'idle') return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') leave()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, leave])

  return (
    <div
      className="rc"
      ref={rootRef}
      data-rc-root
      data-phase={phase}
      data-active={active || undefined}
      aria-hidden={!active}
    >
      <EntranceTransition layout={layout} sources={preload} />

      <button
        type="button"
        className="rc__back"
        data-rc-back
        onClick={leave}
        tabIndex={phase === 'inside' || phase === 'entering' ? 0 : -1}
        aria-hidden={phase === 'idle'}
      >
        <span className="rc__back-rule" aria-hidden="true" />
        {RECEPTION_COPY.back}
      </button>

      <p className="rc__welcome" data-rc-welcome aria-hidden={phase !== 'inside'}>
        {RECEPTION_COPY.welcome}
      </p>

      <button
        type="button"
        className="rc__explore"
        data-rc-explore
        onClick={explore}
        tabIndex={phase === 'inside' ? 0 : -1}
        aria-hidden={phase !== 'inside'}
      >
        {RECEPTION_COPY.explore}
        <span className="rc__explore-arrow" aria-hidden="true">
          →
        </span>
      </button>

      {active && <EntranceHotspot rect={rect} onEnter={enter} />}
    </div>
  )
}
