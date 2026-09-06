import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'

import { FINAL_FRAME_STILL, FOCAL_X, FOCAL_Y } from '../../data/opening'
import { lockScroll, unlockScroll } from '../../lib/scrollLock'
import { useCoverRect } from '../floor-explorer/useCoverRect'
import { EntranceHotspot } from './EntranceHotspot'
import { EntranceTransition } from './EntranceTransition'
import { CAMERA_ARRIVAL_SCALE, SWING_DEGREES } from './entranceCalibration'
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
  /**
   * True while the lifestyle chapter has the frame. The journey stands down
   * at once — timeline killed, every layer put back to rest, the page
   * released — under the chapter's own cover, so that when the frame comes
   * back the visitor meets the clean building.
   */
  dismissed: boolean
}

/**
 * The journey's clock, in seconds. One place, so the phases can be read
 * against each other: the doors begin to open at 1.7s with the camera well
 * into its approach, finish at 2.45s as the portal fills the frame, and the
 * threshold is crossed in the last four tenths of the walk.
 */
const CLOCK = {
  walk: 2.8,
  doorsAt: 1.7,
  doors: 0.75,
  thresholdAt: 2.4,
  threshold: 0.45,
  arrive: 2.8,
  settle: 1.3,
  backAt: 3.7,
  welcomeAt: 4.25,
  exploreAt: 4.7,
} as const

/** How far the camera keeps drifting once inside — a step or two into the lobby. */
const SETTLE_SCALE = 0.045

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

const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const list = window.matchMedia(query)
    const update = () => setMatches(list.matches)
    update()
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [query])
  return matches
}

/**
 * Chapter 03 — "Enter inside".
 *
 * Lives in the opening's sticky viewport above the floor explorer, over the
 * same held frame. At rest it is only the cue at the entrance. On a click it
 * takes the frame, suspends the explorer, locks the page, and walks the
 * visitor in:
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
export function ReceptionExperience({ active, onJourney, onExplore, dismissed, preload }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const rect = useCoverRect(rootRef, FINAL_FRAME_STILL.width, FINAL_FRAME_STILL.height, FOCAL_X, FOCAL_Y)
  const layout = useMemo(() => layoutEntrance(rect), [rect])
  const layoutRef = useRef(layout)
  useEffect(() => {
    layoutRef.current = layout
  }, [layout])

  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  const [phase, setPhase] = useState<Phase>('idle')
  const phaseRef = useRef<Phase>('idle')
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const lockedRef = useRef(false)

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

  const applyScene = useCallback((camera: HTMLElement, inside: HTMLElement, through: HTMLElement) => {
    const { walk, settle, open } = proxy.current
    const { target, centre, throughInset } = layoutRef.current

    // Exponential in the walk: a constant proportion of growth per unit of
    // time, which is how an approach reads on film. The settle continues it.
    const drift = 1 + SETTLE_SCALE * settle
    const scale = Math.pow(CAMERA_ARRIVAL_SCALE, walk) * drift

    // The door is brought to the centre ahead of the zoom — most of the way
    // by the time the leaves begin to turn — so it is looked at, not chased.
    const centring = 1 - Math.pow(1 - walk, 1.6)

    gsap.set(camera, {
      transformOrigin: `${target.x}px ${target.y}px`,
      x: (centre.x - target.x) * centring,
      y: (centre.y - target.y) * centring,
      scale,
    })
    gsap.set(inside, { scale: drift })

    // The opening the lobby is seen through, from the door to past the frame.
    // Written as a string here rather than tweened as one: a browser reports
    // a symmetric inset() collapsed to two values, which a tween of the
    // four-value form cannot interpolate from.
    const k = 1 - open
    gsap.set(through, {
      clipPath: insetOf({
        top: throughInset.top * k,
        right: throughInset.right * k,
        bottom: throughInset.bottom * k,
        left: throughInset.left * k,
      }),
    })
  }, [])

  /* --------------------------------------------------------------- *
   * Out
   * --------------------------------------------------------------- */
  const finishLeaving = useCallback(() => {
    timelineRef.current?.kill()
    timelineRef.current = null
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

    if (lockedRef.current) {
      unlockScroll()
      lockedRef.current = false
    }
    changePhase('idle')
    onJourney(false)
  }, [changePhase, onJourney])

  /* --------------------------------------------------------------- *
   * The choreography
   * --------------------------------------------------------------- */
  const build = useCallback((): gsap.core.Timeline | null => {
    const root = rootRef.current
    if (!root) return null
    const q = (selector: string) => root.querySelector<HTMLElement>(selector)
    const camera = q('[data-rc-camera]')
    const still = q('[data-rc-still]')
    const through = q('[data-rc-through]')
    const leafL = q('[data-rc-leaf="left"]')
    const leafR = q('[data-rc-leaf="right"]')
    const streak = q('[data-rc-streak]')
    const bloom = q('[data-rc-bloom]')
    const vignette = q('[data-rc-vignette]')
    const inside = q('[data-rc-inside]')
    const back = q('[data-rc-back]')
    const welcome = q('[data-rc-welcome]')
    const onward = q('[data-rc-explore]')
    const exterior = Array.from(root.querySelectorAll<HTMLElement>('[data-rc-exterior]'))
    if (!camera || !still || !through || !leafL || !leafR || !streak || !bloom || !vignette || !inside || !back || !welcome || !onward) {
      return null
    }

    proxy.current = { walk: 0, settle: 0, open: 0 }
    const update = () => applyScene(camera, inside, through)

    const timeline = gsap.timeline({
      paused: true,
      defaults: { ease: 'none' },
      onComplete: () => changePhase('inside'),
      onReverseComplete: finishLeaving,
    })

    if (reducedMotion) {
      // No camera, no doors: the lobby simply comes to meet the visitor.
      timeline
        .to(root, { '--rc-cue': 0, duration: 0.3 }, 0)
        .to(inside, { opacity: 1, duration: 0.9, ease: 'power1.inOut' }, 0.1)
        .fromTo(back, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 1.0)
        .fromTo(welcome, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 1.3)
        .fromTo(onward, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 1.6)
      return timeline
    }

    const T = CLOCK

    // 0. The cue retires — through the variable its stylesheet reads, so its
    //    own state rules keep the last word — and the still arrives over the
    //    frame (a 3.5/255 change).
    timeline.to(root, { '--rc-cue': 0, duration: 0.35, ease: 'power2.out' }, 0)
    timeline.to(still, { opacity: 1, duration: 0.3, ease: 'power1.inOut' }, 0)

    // 1. The approach. Quadratic in and out: from standing, to a walk, to a
    //    halt at the threshold; the exponential in `applyCamera` makes the
    //    door grow fastest while the walk is fastest.
    timeline.to(proxy.current, { walk: 1, duration: T.walk, ease: 'power1.inOut', onUpdate: update }, 0)

    // 2. The doors open inward for the visitor. A trace of what is behind
    //    them shows through the glass as they turn.
    timeline.to(leafL, { rotationY: SWING_DEGREES, opacity: 0.86, duration: T.doors, ease: 'power2.inOut' }, T.doorsAt)
    timeline.to(leafR, { rotationY: -SWING_DEGREES, opacity: 0.86, duration: T.doors, ease: 'power2.inOut' }, T.doorsAt)

    // 3. The threshold. The opening rushes past the edges of the frame, the
    //    glass flares once, the exterior softens and its edges go dark.
    timeline.to(proxy.current, { open: 1, duration: T.threshold, ease: 'power2.in', onUpdate: update }, T.thresholdAt)
    timeline.fromTo(
      streak,
      { opacity: 0, xPercent: -30 },
      { opacity: 0.3, xPercent: 20, duration: 0.32, ease: 'sine.inOut' },
      T.thresholdAt - 0.05,
    )
    timeline.to(streak, { opacity: 0, xPercent: 60, duration: 0.3, ease: 'sine.in' }, T.thresholdAt + 0.25)
    timeline.to(exterior, { filter: 'blur(0.6px)', duration: 0.35, ease: 'power1.in' }, T.thresholdAt + 0.05)
    timeline.fromTo(vignette, { opacity: 0 }, { opacity: 0.55, duration: 0.3, ease: 'sine.in' }, T.thresholdAt + 0.05)
    timeline.fromTo(bloom, { opacity: 0 }, { opacity: 0.5, duration: 0.32, ease: 'sine.in' }, T.thresholdAt + 0.1)

    // 4. Arrival. The full-size reception takes over from the one seen
    //    through the door — the two coincide here, and keep moving together
    //    through the settle — and the exterior is let go underneath.
    timeline.to(inside, { opacity: 1, duration: 0.25, ease: 'power1.inOut' }, T.arrive)
    timeline.to(camera, { opacity: 0, duration: 0.2 }, T.arrive + 0.2)
    timeline.to(bloom, { opacity: 0, duration: 0.6, ease: 'sine.out' }, T.arrive)
    timeline.to(vignette, { opacity: 0, duration: 0.7, ease: 'sine.out' }, T.arrive)
    timeline.to(proxy.current, { settle: 1, duration: T.settle, ease: 'power2.out', onUpdate: update }, T.arrive)

    // 5. Once the lobby has settled: the way back, and a word.
    timeline.fromTo(back, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, T.backAt)
    timeline.fromTo(welcome, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, T.welcomeAt)
    // And, last, the way on: into the lifestyle chapter.
    timeline.fromTo(onward, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, T.exploreAt)

    return timeline
  }, [applyScene, changePhase, finishLeaving, reducedMotion])

  /* --------------------------------------------------------------- *
   * In
   * --------------------------------------------------------------- */
  const enter = useCallback(() => {
    if (phaseRef.current !== 'idle' || !active) return
    changePhase('entering')
    onJourney(true)
    lockScroll()
    lockedRef.current = true

    // The pictures are almost always here already; if not, the click waits
    // for them rather than showing a door with nothing behind it.
    void Promise.all([warm(RECEPTION_ASSETS.building), warm(RECEPTION_ASSETS.reception)]).then(() => {
      if (phaseRef.current !== 'entering') return
      const timeline = build()
      if (!timeline) {
        finishLeaving()
        return
      }
      timelineRef.current = timeline
      timeline.play()
    })
  }, [active, build, changePhase, finishLeaving, onJourney])

  const leave = useCallback(() => {
    if (phaseRef.current === 'idle' || phaseRef.current === 'leaving') return
    changePhase('leaving')
    const timeline = timelineRef.current
    if (!timeline) {
      finishLeaving()
      return
    }
    timeline.timeScale(LEAVE_SPEED)
    timeline.reverse()
  }, [changePhase, finishLeaving])

  /* --------------------------------------------------------------- *
   * On — into the lifestyle chapter
   * --------------------------------------------------------------- */
  const explore = useCallback(() => {
    if (phaseRef.current !== 'inside') return
    onExplore()
  }, [onExplore])

  // The chapter has the frame: stand down at once, before anything is painted,
  // under the chapter's cover. The page is released here — the chapter needs it.
  useLayoutEffect(() => {
    if (dismissed && phaseRef.current !== 'idle') finishLeaving()
  }, [dismissed, finishLeaving])

  // Escape steps back out, from anywhere on the way in or inside.
  useEffect(() => {
    if (phase === 'idle') return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') leave()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, leave])

  // Never leave the page locked if this unmounts mid-journey.
  useEffect(
    () => () => {
      timelineRef.current?.kill()
      if (lockedRef.current) unlockScroll()
    },
    [],
  )

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
