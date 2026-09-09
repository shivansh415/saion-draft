import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

import { FINAL_FRAME_STILL, FOCAL_X, FOCAL_Y } from '../../data/opening'
import { useCoverRect } from '../floor-explorer/useCoverRect'
import { TERRACE_FOCUS } from '../floor-explorer/terraceZone'
import { lockScroll, unlockScroll } from '../../lib/scrollLock'
import { TERRACE_MODEL_URL } from './lazy'
import { TERRACE_AMENITIES, AMENITY_BY_ID } from './terraceAmenities'
import type { TerraceAmenity } from './terraceAmenities'
import { TERRACE_CHAPTER_COPY as COPY } from './terraceCopy'
import { TerraceScene } from './TerraceScene'
import '../../styles/terrace.css'

/**
 * Chapter 05 — the open terrace.
 *
 * Entered from the floor explorer, above Level 15. It is not a route and not
 * a page: it mounts over the building chapter, on the same document and the
 * same Lenis instance, with the page held still — so what it returns to is
 * the frame it left, unchanged, rather than a rebuilt one.
 *
 * It runs in four movements:
 *
 *   rise      the building still — the film's own final frame, at the exact
 *             rectangle the explorer paints it in — cranes up the tower on
 *             the crown, softening as it goes. No exterior geometry is
 *             invented for this: the render does the travelling.
 *   overview  the supplied terrace model, settling out of the crown into a
 *             near-plan view. Restrained travel, and one amenity at a time.
 *   detail    a portal opened from the amenity's own place on the terrace,
 *             which widens until it is the frame. A film plays here when one
 *             has been supplied; until then, its plate.
 *   descent   all of it, backwards, ending on the building it came from.
 */

interface Props {
  /** Back to the building and its floor explorer, exactly as it was left. */
  onReturn: () => void
}

type Phase = 'rising' | 'overview' | 'entering' | 'detail' | 'leaving' | 'descending'

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
 * How far the rise climbs, as a multiple of the render's own size, and how
 * much of the headroom it leaves unused.
 *
 * The two numbers are not free. The camera rises by scaling the render about
 * the crown and letting it fall through the frame — and the moment the render
 * has fallen further than the scale has grown, its top edge enters the frame
 * and the sky above the tower becomes the page's own ground. So the fall is
 * DERIVED from the scale rather than tweened beside it: at every frame the
 * crown sits as low as the magnification can carry it and not one pixel
 * lower. `RISE_HEADROOM` keeps a little of that budget in hand.
 */
const RISE_SCALE = 7
const RISE_HEADROOM = 0.92

/** Where the render stands at a given point in the rise, in the frame's px. */
function riseFrame(rect: { x: number; y: number; width: number; height: number }, progress: number) {
  const crown = {
    x: rect.x + (rect.width * TERRACE_FOCUS.x) / 100,
    y: rect.y + (rect.height * TERRACE_FOCUS.y) / 100,
  }
  const scale = 1 + progress * (RISE_SCALE - 1)
  // The crown's depth into the render is what the magnification has to spend.
  const depth = crown.y - rect.y
  const lift = Math.max(0, depth * scale - crown.y) * RISE_HEADROOM
  return { crown, scale, lift, centre: { x: crown.x, y: crown.y + lift } }
}

/** A circular reveal, driven from a proxy so its centre never has to move. */
function circleTo(
  element: HTMLElement,
  from: number,
  to: number,
  centre: { x: number; y: number },
  vars: gsap.TweenVars,
): gsap.core.Tween {
  const state = { r: from }
  element.style.clipPath = `circle(${from}px at ${centre.x}px ${centre.y}px)`
  return gsap.to(state, {
    ...vars,
    r: to,
    onUpdate: () => {
      element.style.clipPath = `circle(${state.r}px at ${centre.x}px ${centre.y}px)`
    },
  })
}

/**
 * Whether this browser can give us a context at all. Asked once, before the
 * chapter renders, so the plan can stand in from the first frame rather than
 * after a failed build.
 */
function hasWebGL(): boolean {
  try {
    const probe = document.createElement('canvas')
    return Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl'))
  } catch {
    return false
  }
}

/** The radius that covers the frame from ANY point inside it. */
const coverRadius = (width: number, height: number) => Math.hypot(width, height) * 1.02

/**
 * Detail imagery fetched and decoded ahead of need, keyed by URL — the same
 * device the floor explorer uses for its drawings, and for the same reason:
 * a portal that opens onto an undecoded picture opens onto nothing.
 */
const warmed = new Map<string, Promise<void>>()
function warmPoster(src: string): Promise<void> {
  let promise = warmed.get(src)
  if (!promise) {
    promise = new Promise<void>((resolve) => {
      const image = new Image()
      image.decoding = 'async'
      image.onload = () => image.decode().then(resolve, () => resolve())
      image.onerror = () => resolve()
      image.src = src
    })
    warmed.set(src, promise)
  }
  return promise
}

const settle = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

export function TerraceExperience({ onReturn }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const stillRef = useRef<HTMLDivElement | null>(null)
  const veilRef = useRef<HTMLDivElement | null>(null)
  const sceneRef = useRef<HTMLDivElement | null>(null)
  /**
   * The canvas is made by the effect below rather than rendered here.
   *
   * A canvas whose WebGL context has been force-lost can never give another
   * one, so a mounted-twice effect — which is exactly what React does in
   * development, and what any remount does — would build the scene, dispose
   * it, and then find the same element permanently unable to answer. Each
   * scene therefore gets its own element, which leaves with it.
   */
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const uiRef = useRef<HTMLDivElement | null>(null)
  const markRef = useRef<HTMLDivElement | null>(null)
  const portalRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const rect = useCoverRect(rootRef, FINAL_FRAME_STILL.width, FINAL_FRAME_STILL.height, FOCAL_X, FOCAL_Y)
  const coarse = useMediaQuery('(hover: none), (pointer: coarse)')
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  const [phase, setPhase] = useState<Phase>('rising')
  const [hovered, setHovered] = useState<TerraceAmenity | null>(null)
  const [open, setOpen] = useState<TerraceAmenity | null>(null)
  /**
   * True only while the rise has run out of building to climb and the model
   * has still not arrived. It is NOT the whole of the rising phase: the rise
   * always outlasts a warm model, and announcing a wait that is not happening
   * is worse than saying nothing.
   */
  const [waiting, setWaiting] = useState(false)
  /** True when the model or the context could not be had; the plan stands in. */
  const [failed, setFailed] = useState(() => !hasWebGL())

  const scene = useRef<TerraceScene | null>(null)
  /** How far up the building the rise has travelled, 0 → 1 and a little past. */
  const riseProgress = useRef({ v: 0 })
  const phaseRef = useRef<Phase>('rising')
  const setPhaseNow = useCallback((next: Phase) => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  /* --------------------------------------------------------------- *
   * The page is held exactly where the explorer left it, so the return
   * is the same frame rather than a re-measured one.
   * --------------------------------------------------------------- */
  useEffect(() => {
    lockScroll()
    return () => unlockScroll()
  }, [])

  /* --------------------------------------------------------------- *
   * Movement three — into an amenity, through a portal on its own place
   * --------------------------------------------------------------- */
  const enter = useCallback(
    (amenity: TerraceAmenity) => {
      if (phaseRef.current !== 'overview') return
      const portal = portalRef.current
      const canvas = canvasRef.current
      const ui = uiRef.current
      const sceneLayer = sceneRef.current
      if (!portal || !ui || !sceneLayer) return

      setPhaseNow('entering')
      setOpen(amenity)
      setHovered(null)
      const scene3d = scene.current
      scene3d?.setInteractive(false)

      const width = sceneLayer.clientWidth
      const height = sceneLayer.clientHeight
      const approach = scene3d?.approach(amenity.id)

      const timeline = gsap.timeline({
        onComplete: () => {
          setPhaseNow('detail')
          // Under a portal that fills the frame there is nothing to draw.
          scene3d?.setPaused(true)
          const video = videoRef.current
          if (video) void video.play().catch(() => undefined)
        },
      })
      if (approach) timeline.add(approach, 0)

      // The portal is struck at the amenity's own position on screen, read off
      // the camera as the expansion begins rather than where the amenity was
      // when the press landed — by then the dolly has already carried it. The
      // radius covers the frame from anywhere inside it, so the centre is free
      // to be filled in late.
      const centre = { x: width / 2, y: height / 2 }
      const open = () => {
        Object.assign(centre, scene3d?.project(amenity.id) ?? centre)
        return circleTo(portal, 0, coverRadius(width, height), centre, {
          duration: reducedMotion ? 0.3 : 1.05,
          ease: 'power3.inOut',
        })
      }

      const at = reducedMotion ? 0.15 : 0.62
      if (reducedMotion) {
        timeline.to(ui, { opacity: 0, duration: 0.2 }, 0)
      } else {
        timeline
          .to(ui, { opacity: 0, y: 10, duration: 0.45, ease: 'power2.in' }, 0)
          // No post-processing: the terrace itself softens, which is the whole
          // of the defocus and costs one composited filter.
          .to(canvas, { filter: 'blur(6px)', duration: 0.7, ease: 'power2.in' }, 0.45)
      }

      // The picture is decoded before the portal opens onto it — but never
      // waited on for ever; past the race the detail arrives as it loads.
      const ready = Promise.race([warmPoster(amenity.poster), settle(800)])
      timeline.addPause(at)
      void ready.then(() => {
        timeline.add(open(), Math.max(at, timeline.time()))
        timeline.removePause(at)
        if (timeline.paused()) timeline.play()
      })
    },
    [reducedMotion, setPhaseNow],
  )

  /* --------------------------------------------------------------- *
   * The scene
   *
   * Built once, taken down once. The model is fetched here rather than
   * anywhere upstream, so nothing about the opening waits on it — by the
   * time this runs it is usually already in the HTTP cache, put there by
   * `prefetchTerrace` when the visitor first reached for the crown.
   * --------------------------------------------------------------- */
  const readyRef = useRef<Promise<boolean> | null>(null)

  useEffect(() => {
    const element = sceneRef.current
    const mark = markRef.current
    if (!element || failed) return
    let cancelled = false

    const canvas = document.createElement('canvas')
    canvas.className = 'tr__canvas'
    canvas.setAttribute('role', 'img')
    canvas.setAttribute('aria-label', COPY.sceneLabel)
    element.prepend(canvas)
    canvasRef.current = canvas

    let instance: TerraceScene
    try {
      instance = new TerraceScene({
        canvas,
        coarse,
        reducedMotion,
        callbacks: {
          onHover: (id) => {
            const amenity = id ? (AMENITY_BY_ID.get(id) ?? null) : null
            setHovered(amenity)
            // Hover intent: the detail's picture is decoded before it is asked for.
            if (amenity) void warmPoster(amenity.poster)
          },
          // Written straight to the element: the mark follows the camera every
          // frame, and routing that through React state would re-render the
          // chapter sixty times a second for one translate.
          onMark: (point) => {
            if (!mark) return
            if (!point) {
              mark.removeAttribute('data-shown')
              return
            }
            mark.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%)`
            mark.setAttribute('data-shown', '')
          },
          onSelect: (id) => {
            const amenity = AMENITY_BY_ID.get(id)
            if (amenity) enter(amenity)
          },
        },
      })
    } catch (error) {
      console.warn('Terrace: WebGL is unavailable; showing the terrace plan instead.', error)
      canvas.remove()
      canvasRef.current = null
      queueMicrotask(() => setFailed(true))
      return
    }

    scene.current = instance
    const measure = () => instance.resize(element.clientWidth, element.clientHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)

    instance.start()
    readyRef.current = instance
      .load(TERRACE_MODEL_URL)
      .then(() => !cancelled)
      .catch((error) => {
        console.warn('Terrace: the model could not be loaded; showing the terrace plan instead.', error)
        if (!cancelled) setFailed(true)
        return false
      })

    return () => {
      cancelled = true
      observer.disconnect()
      instance.dispose()
      canvas.remove()
      if (canvasRef.current === canvas) canvasRef.current = null
      if (scene.current === instance) scene.current = null
    }
    // The scene is built for the input and motion profile it opens with; a
    // media change mid-chapter does not rebuild the WebGL context under it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* --------------------------------------------------------------- *
   * Movement one — the rise
   * --------------------------------------------------------------- */
  const risen = useRef(false)
  useEffect(() => {
    if (risen.current || rect.width === 0) return
    risen.current = true

    const still = stillRef.current
    const veil = veilRef.current
    const sceneLayer = sceneRef.current
    const ui = uiRef.current
    if (!still || !veil || !sceneLayer || !ui) return

    const width = rect.containerWidth
    const height = rect.containerHeight
    const rise = riseProgress.current
    const at = (progress: number) => {
      const frame = riseFrame(rect, progress)
      gsap.set(still, { scale: frame.scale, y: frame.lift })
    }
    // Everything is measured from the crown, so the render grows out of the
    // roof rather than out of the middle of the frame, and the terrace opens
    // where the rise ends rather than at an assumed point.
    const { crown, centre } = riseFrame(rect, 1)

    gsap.set(still, { transformOrigin: `${crown.x}px ${crown.y}px` })
    at(0)
    sceneLayer.style.clipPath = `circle(0px at ${centre.x}px ${centre.y}px)`

    const arrive = () => {
      const scene3d = scene.current
      const timeline = gsap.timeline({
        onComplete: () => {
          setPhaseNow('overview')
          scene3d?.setInteractive(true)
          rootRef.current?.focus({ preventScroll: true })
        },
      })

      if (reducedMotion) {
        sceneLayer.style.clipPath = 'none'
        scene3d?.settle()
        timeline
          .to(sceneLayer, { opacity: 1, duration: 0.4 }, 0)
          .to([still, veil], { opacity: 0, duration: 0.4 }, 0)
          .to(ui, { opacity: 1, duration: 0.4 }, 0.2)
        return timeline
      }

      // The terrace opens out of the roof the rise arrived at, and the camera
      // begins its own fall in the same beat — one movement, not two.
      scene3d?.settle()
      timeline
        .to(sceneLayer, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0)
        .add(
          circleTo(sceneLayer, 0, coverRadius(width, height), centre, {
            duration: 1.45,
            ease: 'expo.out',
          }),
          0,
        )
        // The last of the climb happens under the opening terrace.
        .to(rise, { v: 1.28, duration: 1.3, ease: 'power2.in', onUpdate: () => at(rise.v) }, 0)
        .to(still, { opacity: 0, duration: 1.1, ease: 'power2.in' }, 0)
        .to(veil, { opacity: 0, duration: 1.1, ease: 'power2.out' }, 0.35)
        .set(sceneLayer, { clipPath: 'none' })
        .fromTo(ui, { opacity: 0 }, { opacity: 1, duration: 0.9, ease: 'power2.out' }, 0.85)
      return timeline
    }

    const climb = gsap.timeline()
    if (reducedMotion) {
      climb.to(still, { opacity: 0.35, duration: 0.3 }, 0).to(veil, { opacity: 0.7, duration: 0.3 }, 0)
    } else {
      climb
        // Up the facade. Scale and fall are one value, so the render can never
        // come off the top of the frame — see `riseFrame`.
        .to(rise, { v: 1, duration: 2, ease: 'power2.in', onUpdate: () => at(rise.v) }, 0)
        .to(still, { filter: 'blur(6px)', duration: 1.2, ease: 'power2.in' }, 0.8)
        .to(veil, { opacity: 0.82, duration: 1.3, ease: 'power2.in' }, 0.7)
    }

    let cancelled = false
    const held = new Promise<void>((resolve) => {
      climb.eventCallback('onComplete', resolve)
    })
    const ready = readyRef.current ?? Promise.resolve(true)
    let arrived = false
    void ready.then(() => {
      arrived = true
    })
    // Only a climb that finishes with the model still outstanding says so.
    void held.then(() => {
      if (!cancelled && !arrived) setWaiting(true)
    })
    let tail: gsap.core.Timeline | null = null
    void Promise.all([held, ready]).then(() => {
      if (cancelled) return
      setWaiting(false)
      tail = arrive()
    })

    return () => {
      cancelled = true
      climb.kill()
      tail?.kill()
    }
  }, [rect, reducedMotion, setPhaseNow])

  // The model can only fail after the rise has already committed to it; when
  // it does, the plan takes the frame with the same choreography.
  useEffect(() => {
    if (!failed || phaseRef.current !== 'rising') return
    const still = stillRef.current
    const veil = veilRef.current
    const sceneLayer = sceneRef.current
    const ui = uiRef.current
    if (!still || !veil || !sceneLayer || !ui) return
    sceneLayer.style.clipPath = 'none'
    const timeline = gsap.timeline({ onComplete: () => setPhaseNow('overview') })
    timeline
      .to(sceneLayer, { opacity: 1, duration: 0.8, ease: 'power2.out' }, 0)
      .to([still, veil], { opacity: 0, duration: 0.7 }, 0)
      .fromTo(ui, { opacity: 0 }, { opacity: 1, duration: 0.8 }, 0.35)
    return () => {
      timeline.kill()
    }
  }, [failed, setPhaseNow])

  /* --------------------------------------------------------------- *
   * …and back out of it
   * --------------------------------------------------------------- */
  const leave = useCallback(() => {
    if (phaseRef.current !== 'detail') return
    const portal = portalRef.current
    const canvas = canvasRef.current
    const ui = uiRef.current
    const sceneLayer = sceneRef.current
    const amenity = open
    if (!portal || !ui || !sceneLayer || !amenity) return

    setPhaseNow('leaving')
    const scene3d = scene.current
    scene3d?.setPaused(false)
    const video = videoRef.current
    if (video) {
      video.pause()
      video.currentTime = 0
    }

    const width = sceneLayer.clientWidth
    const height = sceneLayer.clientHeight
    const centre = scene3d?.project(amenity.id) ?? { x: width / 2, y: height / 2 }

    const timeline = gsap.timeline({
      onComplete: () => {
        setOpen(null)
        setPhaseNow('overview')
        scene3d?.setInteractive(true)
        portal.style.clipPath = 'circle(0px at 50% 50%)'
        rootRef.current?.focus({ preventScroll: true })
      },
    })

    timeline
      .add(
        circleTo(portal, coverRadius(width, height), 0, centre, {
          duration: reducedMotion ? 0.25 : 0.85,
          ease: reducedMotion ? 'none' : 'power3.inOut',
        }),
        0,
      )
      .to(canvas, { filter: 'blur(0px)', duration: reducedMotion ? 0.2 : 0.9, ease: 'power2.out' }, 0.2)
      .to(ui, { opacity: 1, y: 0, duration: reducedMotion ? 0.2 : 0.7, ease: 'power2.out' }, 0.35)
    const withdraw = scene3d?.withdraw()
    if (withdraw) timeline.add(withdraw, 0.15)
  }, [open, reducedMotion, setPhaseNow])

  /* --------------------------------------------------------------- *
   * Movement four — the descent, back onto the building
   * --------------------------------------------------------------- */
  const descend = useCallback(() => {
    if (phaseRef.current !== 'overview') return
    const still = stillRef.current
    const veil = veilRef.current
    const sceneLayer = sceneRef.current
    const ui = uiRef.current
    if (!still || !veil || !sceneLayer || !ui) return

    setPhaseNow('descending')
    const scene3d = scene.current
    scene3d?.setInteractive(false)
    setHovered(null)

    const rise = riseProgress.current
    const at = (progress: number) => {
      const frame = riseFrame(rect, progress)
      gsap.set(still, { scale: frame.scale, y: frame.lift })
    }
    const { centre } = riseFrame(rect, 1)
    const timeline = gsap.timeline({ onComplete: onReturn })

    if (reducedMotion) {
      timeline.to([ui, sceneLayer], { opacity: 0, duration: 0.3 }, 0)
      return
    }

    scene3d?.depart()
    timeline
      .to(ui, { opacity: 0, y: 8, duration: 0.4, ease: 'power2.in' }, 0)
      // The terrace closes back into the roof it grew out of, and the render
      // comes down the way it went up.
      .add(
        circleTo(sceneLayer, coverRadius(rect.containerWidth, rect.containerHeight), 0, centre, {
          duration: 1.0,
          ease: 'power3.inOut',
        }),
        0.15,
      )
      .to(sceneLayer, { opacity: 0, duration: 0.5, ease: 'power2.in' }, 0.75)
      .to(veil, { opacity: 0.9, duration: 0.5 }, 0.1)
      .fromTo(
        still,
        { opacity: 0 },
        { opacity: 1, duration: 0.6, ease: 'power2.out' },
        0.55,
      )
      .to(rise, { v: 0, duration: 1.35, ease: 'power3.out', onUpdate: () => at(rise.v) }, 0.55)
      .to(still, { filter: 'blur(0px)', duration: 1.35, ease: 'power3.out' }, 0.55)
      .to(veil, { opacity: 0, duration: 0.9, ease: 'power2.out' }, 0.9)
  }, [onReturn, rect, reducedMotion, setPhaseNow])

  /* --------------------------------------------------------------- *
   * Escape steps back one movement, the way it does in the explorer.
   * --------------------------------------------------------------- */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (phaseRef.current === 'detail') leave()
      else if (phaseRef.current === 'overview') descend()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [leave, descend])

  const interactive = phase === 'overview'
  const shown = open ?? hovered

  return (
    <div
      className="tr"
      ref={rootRef}
      tabIndex={-1}
      data-phase={phase}
      data-failed={failed || undefined}
      aria-label={COPY.title}
    >
      {/* The rise. The still is the film's own final frame, at the rectangle
          the explorer paints it in, so the first frame of this chapter is
          identical to the last frame of the one before it. */}
      <div className="tr__rise" aria-hidden="true">
        <div
          className="tr__still"
          ref={stillRef}
          style={{ left: rect.x, top: rect.y, width: rect.width || '100%', height: rect.height || '100%' }}
        >
          <img
            src={FINAL_FRAME_STILL.src}
            width={FINAL_FRAME_STILL.width}
            height={FINAL_FRAME_STILL.height}
            alt=""
            decoding="async"
            draggable={false}
          />
        </div>
        <div className="tr__veil" ref={veilRef} />
      </div>

      {/* The terrace. The canvas is inserted here by the scene itself. */}
      <div className="tr__scene" ref={sceneRef}>
        {/* The plan stands in wherever the model or the context cannot be had. */}
        {failed && (
          <img
            className="tr__plan"
            src="/assets/repose-experience/open-terrace-01.webp"
            alt={COPY.sceneLabel}
            decoding="async"
            draggable={false}
          />
        )}

        {/* One hairline on the amenity in hand — the same mark the building
            makes on a level, rather than a hotspot pinned over it. */}
        <div className="tr__mark" ref={markRef} aria-hidden="true">
          <span className="tr__mark-ring" />
        </div>
      </div>

      {/* Everything written on the terrace, in one group so the portal can
          take the frame from it in a single tween. */}
      <div className="tr__ui" ref={uiRef}>
        <header className="tr__head">
          <p className="tr__eyebrow">{COPY.eyebrow}</p>
          <h2 className="tr__title">{COPY.title}</h2>
          <p className="tr__lead">{COPY.lead}</p>

          {/* The pointer may leave the terrace for this without the mark
              going with it — see `holdHover`. */}
          <div
            className="tr__readout"
            aria-live="polite"
            onPointerEnter={() => scene.current?.holdHover(true)}
            onPointerLeave={() => scene.current?.holdHover(false)}
          >
            {shown && (
              <>
                <span className="tr__readout-index">{shown.index}</span>
                <span className="tr__readout-label">{shown.label}</span>
                <button
                  type="button"
                  className="tr__explore"
                  onClick={() => enter(shown)}
                  tabIndex={interactive ? 0 : -1}
                >
                  <span className="tr__explore-rule" />
                  {COPY.explore}
                  <span className="tr__explore-arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              </>
            )}
          </div>
        </header>

        {/* Without a pointer over the model there is nothing to hover, so the
            amenities are also a list — and it is the whole of the chapter
            wherever WebGL is not available. */}
        <nav className="tr__index" aria-label="Terrace amenities">
          <ol>
            {TERRACE_AMENITIES.map((amenity) => (
              <li key={amenity.id}>
                <button
                  type="button"
                  className={`tr-amenity${shown?.id === amenity.id ? ' is-shown' : ''}`}
                  onMouseEnter={() => failed && interactive && setHovered(amenity)}
                  onMouseLeave={() => failed && setHovered(null)}
                  onPointerEnter={() => !coarse && scene.current?.highlight(amenity.id)}
                  onPointerLeave={() => !coarse && scene.current?.highlight(null)}
                  onFocus={() => scene.current?.highlight(amenity.id)}
                  onBlur={() => scene.current?.highlight(null)}
                  onClick={() => enter(amenity)}
                  tabIndex={interactive ? 0 : -1}
                >
                  <span className="tr-amenity__index">{amenity.index}</span>
                  <span className="tr-amenity__rule" />
                  <span className="tr-amenity__label">{amenity.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="tr__foot">
          <button
            type="button"
            className="tr__back"
            onClick={descend}
            tabIndex={interactive ? 0 : -1}
          >
            <span className="tr__back-arrow" aria-hidden="true">
              ←
            </span>
            {COPY.back}
          </button>
          <p className="tr__hint">{failed ? COPY.note : coarse ? COPY.hintTouch : COPY.hint}</p>
        </div>
      </div>

      {/* The detail. It is closed — a circle of no radius — until an amenity
          opens it, and it is where a supplied film plays. */}
      <div className="tr__portal" ref={portalRef} data-open={phase === 'detail' || undefined}>
        {open && (
          <div className="tr__detail">
            <img className="tr__detail-media" src={open.poster} alt={open.label} decoding="async" draggable={false} />
            {open.video && (
              <video
                className="tr__detail-media tr__detail-video"
                ref={videoRef}
                src={open.video}
                poster={open.poster}
                playsInline
                muted
                loop
                preload="none"
              />
            )}
            <div className="tr__detail-scrim" />
            <div className="tr__detail-copy">
              <span className="tr__detail-index">{open.index}</span>
              <h3 className="tr__detail-title">{open.label}</h3>
              <p className="tr__detail-note">{open.note}</p>
            </div>
            <button type="button" className="tr__back tr__back--detail" onClick={leave}>
              <span className="tr__back-arrow" aria-hidden="true">
                ←
              </span>
              {COPY.backToOverview}
            </button>
          </div>
        )}
      </div>

      {/* Held only while the model is still on its way, and only after the
          climb has run out of frame to travel. */}
      <p className="tr__waiting" data-shown={waiting || undefined} role="status">
        {COPY.rising}
      </p>
    </div>
  )
}
