import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import {
  CHAPTER_UNITS,
  FINAL_FRAME_STILL,
  FOCAL_X,
  FOCAL_Y,
  RECEPTION_BAND,
  RECEPTION_EXIT_AT,
  RECEPTION_SPAN,
  unitFraction,
} from '../../data/opening'
import { glideTo, pageTop } from '../../lib/pageScroll'
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
}

/**
 * The journey's clock, in seconds. It is never PLAYED on this clock — the
 * scroll writes the timeline's progress — but the numbers are what hold the
 * phases against each other, so they are stated in time and the band is
 * mapped onto the whole of it: the doors begin to open at 1.7s with the
 * camera well into its approach, finish at 2.45s as the portal fills the
 * frame, and the threshold is crossed in the last four tenths of the walk.
 */
const CLOCK = {
  walk: 2.8,
  doorsAt: 1.7,
  // The swing takes half again as long as it did. Everything here is scrubbed
  // rather than played, so a longer beat is a longer stretch of scroll — the
  // doors part under the visitor's own hand instead of snapping open while the
  // camera is still walking in.
  doors: 1.15,
  thresholdAt: 2.4,
  threshold: 0.45,
  arrive: 2.8,
  settle: 1.3,
  backAt: 3.7,
  welcomeAt: 4.25,
  exploreAt: 4.7,
} as const

/** The whole of it, so the band can be mapped onto the walk rather than onto a guess. */
const RUN = CLOCK.exploreAt + 0.9

/** Where the visitor is inside rather than on their way in — just past arrival. */
const INSIDE_AT = (CLOCK.arrive + 0.35) / RUN

/** How far the camera keeps drifting once inside — a step or two into the lobby. */
const SETTLE_SCALE = 0.045

/** Leaving is the same journey in reverse, a touch brisker. */
const LEAVE_SPEED = 1.35

/**
 * Longest the walk waits for its two stills before it is built regardless.
 *
 * They are 6.6MB together, so on a slow line waiting for both meant the whole
 * chapter silently did not happen. Three seconds is past any warm cache and
 * short of the band being scrolled through.
 */
const RECEPTION_WARM_CEILING_MS = 3000

/** `value`, held inside `[low, high]`. If the range has collapsed, its middle. */
const within = (value: number, low: number, high: number): number =>
  low > high ? (low + high) / 2 : value < low ? low : value > high ? high : value

function useReducedMotion(): boolean {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const list = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setMatches(list.matches)
    update()
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [])
  return matches
}

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

  const reducedMotion = useReducedMotion()

  const [phase, setPhase] = useState<Phase>('idle')
  const phaseRef = useRef<Phase>('idle')
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  /** Mirrors the `entering` flag last handed up, so scroll never re-renders for nothing. */
  const underwayRef = useRef(false)
  /**
   * True while the opening section is anywhere near the viewport.
   *
   * Only the Escape key reads it. Once the visitor has scrolled past this
   * chapter for good the walk stays where it ended — it is off screen, and
   * winding it back would be work nobody can see — but a key press down there
   * belongs to whatever they are actually looking at.
   */
  const [nearby, setNearby] = useState(true)

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
    const { target, centre, throughInset, film, viewport } = layoutRef.current

    // Exponential in the walk: a constant proportion of growth per unit of
    // travel, which is how an approach reads on film. The settle continues it.
    const drift = 1 + SETTLE_SCALE * settle
    const scale = Math.pow(CAMERA_ARRIVAL_SCALE, walk) * drift

    // The door is brought to the centre ahead of the zoom — most of the way
    // by the time the leaves begin to turn — so it is looked at, not chased.
    const centring = 1 - Math.pow(1 - walk, 1.6)

    // The camera may never uncover the frame.
    //
    // It scales about the DOOR, which sits low and right of centre, and the
    // exponent above leads the translate ahead of the zoom — near the start of
    // the walk `centring` is about 1.6x `walk`, so the picture is being moved
    // half again as fast as it is being grown. Through roughly the first half
    // of the approach that lifts the film's bottom edge clear of the bottom of
    // the viewport by up to ~4% of its height, and what shows in the gap is the
    // canvas underneath, still holding the building exactly where it was: the
    // road appears to break and jump upward along a hard horizontal seam.
    //
    // So the lead is allowed only as far as the frame can pay for it. Each axis
    // is held inside the range in which the scaled frame still contains the
    // viewport; by the time the doors begin to turn the frame is large enough
    // that the clamp no longer binds, and at arrival it is seven times over —
    // so the choreography past the threshold, and the pixel-exact hand-over to
    // the full-size lobby, are untouched.
    const left = target.x + (film.x - target.x) * scale
    const top = target.y + (film.y - target.y) * scale

    gsap.set(camera, {
      transformOrigin: `${target.x}px ${target.y}px`,
      x: within((centre.x - target.x) * centring, viewport.width - (left + film.width * scale), -left),
      y: within((centre.y - target.y) * centring, viewport.height - (top + film.height * scale), -top),
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
  /**
   * Everything back to rest. Called when the band is left at its start — never
   * to tear the timeline down, which would break the scrub the visitor is
   * still holding.
   */
  /**
   * Every layer put back to rest — the state the timeline is built FROM.
   *
   * Restated explicitly, never cleared wholesale, since the scene's geometry
   * lives in the same inline styles React writes. Shared by the reset at the
   * band's start and by the rebuild below.
   */
  const restScene = useCallback(() => {
    // Mutated, never replaced: the timeline tweens THIS object, and handing it
    // a new one would leave the camera driven by an orphan.
    Object.assign(proxy.current, { walk: 0, settle: 0, open: 0 })

    const root = rootRef.current
    if (!root) return
    const q = (selector: string) => root.querySelectorAll<HTMLElement>(selector)
    gsap.set(q('[data-rc-camera]'), { x: 0, y: 0, scale: 1, opacity: 1 })
    gsap.set(q('[data-rc-still]'), { opacity: 0 })
    gsap.set(q('[data-rc-through]'), { clipPath: insetOf(layoutRef.current.throughInset) })
    gsap.set(q('[data-rc-leaf]'), { rotationY: 0, opacity: 1 })
    gsap.set(q('[data-rc-streak], [data-rc-bloom], [data-rc-vignette], [data-rc-back], [data-rc-welcome], [data-rc-explore]'), { opacity: 0 })
    gsap.set(q('[data-rc-inside]'), { opacity: 0, scale: 1 })
    gsap.set(q('[data-rc-exterior]'), { filter: 'none' })
    gsap.set(root, { '--rc-cue': 1 })
  }, [])

  const resetScene = useCallback(() => {
    restScene()
    changePhase('idle')
  }, [restScene, changePhase])

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

    Object.assign(proxy.current, { walk: 0, settle: 0, open: 0 })
    const update = () => applyScene(camera, inside, through)

    // Paused, and it stays paused: its progress is written by the scroll (see
    // the scrub below), never played. So the visitor walks in at their own
    // pace and walks back out by scrolling up, through the same frames.
    const timeline = gsap.timeline({ paused: true, defaults: { ease: 'none' } })

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
    //    frame (a 3.5/255 change, so it can simply appear).
    timeline.to(root, { '--rc-cue': 0, duration: 0.35, ease: 'power2.out' }, 0)
    timeline.to(still, { opacity: 1, duration: 0.3, ease: 'power1.inOut' }, 0)

    // 1. The approach. Quadratic in and out: from standing, to a walk, to a
    //    halt at the threshold; the exponential in `applyScene` makes the
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

    // 5. Once the lobby has settled: the way back, a word, and the way on.
    timeline.fromTo(back, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, T.backAt)
    timeline.fromTo(welcome, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, T.welcomeAt)
    timeline.fromTo(onward, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, T.exploreAt)

    return timeline
  }, [applyScene, reducedMotion])

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
  /** The scrub itself, so a rebuild can ask it where the page is. */
  const scrubRef = useRef<ScrollTrigger | null>(null)
  const driveRef = useRef<(progress: number) => void>(() => {})

  useEffect(() => {
    if (!active) return
    let cancelled = false
    // The two stills are 6.6MB between them, and until BOTH have loaded and
    // decoded the scrub has no timeline to write to — `drive()` returns at
    // once, `onJourney` is never handed up, and the visitor scrolls the whole
    // 260vh band with nothing happening, arriving at the residence chapter
    // having never seen the lobby. On a ~1 Mbps line that is every visitor.
    //
    // So the wait has a ceiling. Past it the timeline is built anyway: the
    // choreography is geometry, not pixels, and it runs correctly over
    // whichever of the two stills has arrived, with the other filling in as
    // it lands. A walk through a picture that is still sharpening is a
    // chapter; no walk at all is not.
    const stills = Promise.all([warm(RECEPTION_ASSETS.building), warm(RECEPTION_ASSETS.reception)])
    const ceiling = new Promise<void>((resolve) => window.setTimeout(resolve, RECEPTION_WARM_CEILING_MS))
    void Promise.race([stills, ceiling]).then(() => {
      if (cancelled) return
      // A REBUILD — a resize or a rotation while the walk is under way — must
      // start from rest. The timeline is all `to()` tweens, and a `to` records
      // its start value from the DOM the first time it renders: built over a
      // scene that was mid-walk (doors turned, camera gone, lobby up), the new
      // timeline read THOSE as its starting points, so scrolling back out
      // left the doors open and the lobby standing until the band's very
      // first pixel snapped everything to the building at once. Putting the
      // layers at rest first costs nothing visible: the previous timeline is
      // killed and the current progress re-applied in the same tick below,
      // before the frame is painted.
      timelineRef.current?.kill()
      timelineRef.current = null
      restScene()
      const timeline = build()
      if (!timeline) return
      timelineRef.current = timeline
      ready.current = true
      // Whatever the band already says — a reload part-way down, or a rebuild
      // after a resize — must land on the frame the visitor is looking at.
      //
      // This used to be a whole-document `ScrollTrigger.refresh()`, and that
      // is a synchronous re-measure of every trigger and every pin on the
      // page. It fires the moment the hand-off settles and the explorer takes
      // input — which is to say, in the middle of the visitor's scroll, a beat
      // before the level rail and the floor plans appear — and it cost a frame
      // long enough to be felt as a single jolt in the scroll, every time,
      // right there.
      //
      // Nothing about the document changed here: a timeline was built. All
      // that is actually wanted is for the new timeline to be put at the
      // progress the page is already at, which the scrub can simply be asked
      // for. Genuine height changes still refresh — the section's own resize
      // handling, and the chapters below as they mount.
      const scrub = scrubRef.current
      if (scrub) driveRef.current(scrub.progress)
    })
    return () => {
      cancelled = true
    }
    // `layout` is in here so a resize rebuilds the choreography against the
    // new geometry: every camera position is derived from the cover rect.
  }, [active, build, layout, restScene])

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
      // The band's own ends are the only thing that decides this: above it the
      // walk is at rest, past it the visitor is inside.
      //
      // It used to be forced to 0 whenever this trigger reported `isActive`
      // false, to keep the Escape key from staying bound for the rest of the
      // document. That trigger ends at `bottom bottom` — the exact scroll
      // position at which the walk COMPLETES — so the flag went false while
      // the arrived lobby was still filling the screen, and the whole scene
      // was reset to rest under the visitor: the lobby vanished, the clean
      // building snapped back in its place, and the residence chapter then
      // rose over that. Which is precisely the jump between the reception and
      // the amenities that this was reported as. Escape is gated on `nearby`
      // instead, which is measured against the viewport rather than against
      // the end of the scrub.
      const t = Math.min(1, Math.max(0, (progress * CHAPTER_UNITS - RECEPTION_BAND.start) / RECEPTION_SPAN))

      timeline.progress(t)

      // The explorer stands down for the whole of the walk, and takes the
      // building back the moment the band is left at its start. Handed up only
      // on a change: this runs on every scroll frame.
      const underway = t > 0
      if (underway !== underwayRef.current) {
        underwayRef.current = underway
        onJourney(underway)
      }

      const next: Phase = t <= 0 ? 'idle' : t >= INSIDE_AT ? 'inside' : 'entering'
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
    scrubRef.current = trigger
    driveRef.current = drive

    // Is the section on screen at all? Measured separately from the scrub,
    // because the scrub's own range ends where the walk ends and the section
    // goes on for the settle and the hand-off after it.
    const visibility = ScrollTrigger.create({
      trigger: section,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => setNearby(self.isActive),
    })

    return () => {
      scrubRef.current = null
      trigger.kill()
      visibility.kill()
    }
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
    // The TRACK, not the section: the scrub runs `top top` → `bottom bottom`,
    // so its whole range is the section's height less the sticky viewport that
    // stays on screen through it. Measuring against the section's full height
    // overshot every destination by that viewport — which put "Back to
    // building" a third of the way back INTO the walk instead of out of it,
    // and sent "Enter inside" past the arrival altogether.
    const track = section.offsetHeight - window.innerHeight
    glideTo(pageTop(section) + track * unitFraction(unit), duration)
  }, [])

  /** "Enter inside" — the walk, at about the pace it always played at. */
  const enter = useCallback(() => {
    if (!active) return
    travelTo(RECEPTION_BAND.end, 2.6)
  }, [active, travelTo])

  /** "Back to building" — the same walk in reverse, a touch brisker. */
  const leave = useCallback(() => {
    travelTo(RECEPTION_EXIT_AT, 2.6 / LEAVE_SPEED)
  }, [travelTo])

  /* --------------------------------------------------------------- *
   * On — into the lifestyle chapter
   * --------------------------------------------------------------- */
  const explore = useCallback(() => {
    onExplore()
  }, [onExplore])

  // Escape steps back out, from anywhere on the way in or inside.
  useEffect(() => {
    if (phase === 'idle' || !nearby) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') leave()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, nearby, leave])

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
