import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react'
import type { Ref } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'

import { LOADER_COPY, LOADER_MAX_MS, LOADER_MIN_MS } from '../../data/opening'
import { lockScroll, unlockScroll } from '../../lib/scrollLock'

/**
 * Reposé Residence — the preloader.
 *
 * The frame is held here until the opening chapter can actually be travelled
 * through: the first frames of the film in hand, the display face loaded, the
 * canvas already painted underneath. Nothing else on the site is waited for.
 *
 * What is drawn is the building's own logic rather than a spinner — an arch in
 * line, and inside it storeys accumulating from the ground up as the film
 * arrives. The arch is the same figure the lifestyle chapter's loader and the
 * closing portal are built on, so the first thing a visitor sees and the last
 * thing they pass through are the same shape.
 *
 * Everything is one SVG and two GSAP timelines — the outline draws itself once,
 * and the storeys are bound to real load progress. No layout is written to
 * while it is on screen, so it cannot shift anything behind it.
 */

/* ------------------------------------------------------------------ *
 * Geometry. One place, so the drawing and the maths cannot disagree.
 * ------------------------------------------------------------------ */

/**
 * The viewBox is the drawing's own bounding box with an even margin, not a
 * round number the drawing happens to sit inside: the arch runs x 14→206 and
 * y 74→262, so this box puts its centre (110, 168) exactly at the centre of
 * the element — which is what the grid then centres on the screen. Without
 * this the composition would sit visibly low, mathematically centred and
 * optically not.
 */
const VIEW = { x: 0, y: 60, w: 220, h: 216 } as const
/** Where the building meets the ground. */
const GROUND = 262
/** The inner arch — the opening the storeys rise into. */
const INNER = { left: 70, right: 150, spring: 140, radius: 40 } as const
const APEX = INNER.spring - INNER.radius // 100
/**
 * Travel of the datum line, and of the clip it rides: ground to a little above
 * the crown, so the last storey is fully exposed at 100%.
 */
const RISE = GROUND - APEX + 10

const OUTER_PATH = 'M56 262 V128 A54 54 0 0 1 164 128 V262'
const INNER_PATH = `M${INNER.left} ${GROUND} V${INNER.spring} A${INNER.radius} ${INNER.radius} 0 0 1 ${INNER.right} ${INNER.spring} V${GROUND}`
const GROUND_PATH = 'M14 262 H206'

/** Storey lines, ground upward. The arch clip trims the upper ones to its curve. */
const SLABS = Array.from({ length: 11 }, (_, i) => GROUND - 12 - i * 14)

export interface OpeningLoaderHandle {
  /** Real load progress, 0 → 1. Called off the loader queue, not from React. */
  setProgress(fraction: number): void
}

interface Props {
  ref?: Ref<OpeningLoaderHandle>
  /**
   * Everything the chapter wants is in hand. The loader still finishes its own
   * minimum on screen before it leaves.
   */
  ready: boolean
  /**
   * The floor below which the chapter is never revealed — the first frame and
   * the fonts. Past `LOADER_MAX_MS` this alone is enough to let the loader go,
   * so a slow line cannot strand anyone behind it.
   */
  minimum: boolean
  /** The exit has begun: the chapter is live and takes the scroll back. */
  onReveal: () => void
  /** The exit has finished: take the loader down. */
  onDone: () => void
}

export function OpeningLoader({ ref, ready, minimum, onReveal, onDone }: Props) {
  const root = useRef<HTMLDivElement | null>(null)
  const plate = useRef<SVGSVGElement | null>(null)
  const rise = useRef<SVGRectElement | null>(null)
  const level = useRef<SVGLineElement | null>(null)
  const percent = useRef<HTMLSpanElement | null>(null)

  /** Latest real progress, and the eased value actually on screen. */
  const target = useRef(0)
  const shown = useRef({ value: 0 })
  /** Set the moment the exit starts, so nothing runs twice. */
  const leaving = useRef(false)
  /** This component's own hold on the page. */
  const held = useRef(false)

  // The gate below polls on an interval rather than re-running an effect, so
  // the current answers are kept in refs. A render's worth of staleness is
  // immaterial at a 100ms cadence.
  const readyRef = useRef(ready)
  const minimumRef = useRef(minimum)
  const revealRef = useRef(onReveal)
  const doneRef = useRef(onDone)
  useEffect(() => {
    readyRef.current = ready
    minimumRef.current = minimum
    revealRef.current = onReveal
    doneRef.current = onDone
  }, [ready, minimum, onReveal, onDone])

  /**
   * Moves the storeys, the level line and the readout to `value`.
   *
   * Progress arrives in ~32 steps, not per frame, and each step eases into the
   * next, so the drawing advances continuously rather than ratcheting. Only
   * transforms and one text node are written — no layout, ever.
   */
  const drive = useCallback((value: number, duration = 0.7) => {
    gsap.to(shown.current, {
      value,
      duration,
      ease: 'power2.out',
      overwrite: true,
      onUpdate: () => {
        const v = shown.current.value
        if (rise.current) gsap.set(rise.current, { scaleY: v, svgOrigin: `110 ${GROUND}` })
        if (level.current) gsap.set(level.current, { y: -RISE * v })
        if (percent.current) percent.current.textContent = String(Math.round(v * 100)).padStart(2, '0')
      },
    })
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      setProgress(fraction: number) {
        // Monotonic: progress is a floor, never a rewind.
        target.current = Math.max(target.current, Math.min(1, Math.max(0, fraction)))
        drive(target.current)
      },
    }),
    [drive],
  )

  /* --------------------------------------------------------------- *
   * Hold the page, and set the pre-state before the first paint
   * --------------------------------------------------------------- */
  useLayoutEffect(() => {
    lockScroll()
    held.current = true
    return () => {
      if (held.current) {
        held.current = false
        unlockScroll()
      }
    }
  }, [])

  /* --------------------------------------------------------------- *
   * Draw in, wait, draw out
   * --------------------------------------------------------------- */
  useLayoutEffect(() => {
    const element = root.current
    if (!element) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mountedAt = performance.now()
    // The eased counter is a plain object created once with the component; held
    // locally so the cleanup below is looking at the same one it started with.
    const counter = shown.current
    let poll = 0
    let exit: gsap.core.Timeline | null = null

    const context = gsap.context(() => {
      if (reduced) {
        // No line work: the drawing is simply present, and the loader will
        // leave on a fade.
        gsap.set('[data-ol-draw]', { strokeDashoffset: 0, opacity: 1 })
        gsap.set('[data-ol-meta], [data-ol-foot]', { opacity: 1, y: 0 })
        return
      }

      const intro = gsap.timeline({ defaults: { ease: 'power2.inOut' } })
      intro
        .to('[data-ol-ground]', { strokeDashoffset: 0, opacity: 1, duration: 0.85 }, 0)
        .to('[data-ol-outer]', { strokeDashoffset: 0, opacity: 1, duration: 1.5 }, 0.14)
        .to('[data-ol-inner]', { strokeDashoffset: 0, opacity: 1, duration: 1.4 }, 0.34)
        .to('[data-ol-meta]', { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' }, 0.2)
        .to('[data-ol-foot]', { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' }, 0.42)
    }, element)

    const leave = () => {
      if (leaving.current) return
      leaving.current = true

      // The page is given back the instant the exit starts, so the chapter is
      // already live and settled behind the fade rather than waking up into it.
      if (held.current) {
        held.current = false
        unlockScroll()
      }
      revealRef.current()

      if (reduced) {
        exit = gsap
          .timeline({ onComplete: () => doneRef.current() })
          .to(element, { opacity: 0, duration: 0.4, ease: 'power1.out' })
        return
      }

      // The readout finishes honestly before the drawing goes.
      drive(1, 0.34)

      exit = gsap.timeline({ defaults: { ease: 'power2.inOut' }, onComplete: () => doneRef.current() })
      exit
        .to('[data-ol-meta], [data-ol-foot]', { opacity: 0, y: -8, duration: 0.4, ease: 'power2.in' }, 0)
        // The arch opens outward, storeys and all, and the chapter is behind
        // it — the same move the closing portal makes, at the other end of the
        // loop. The building is not emptied first: the whole of what was built
        // travels, which is what makes it read as passing through rather than
        // as an animation being cleared away.
        .to(plate.current, { scale: 2.15, opacity: 0, duration: 0.92 }, 0.12)
        .to(element, { opacity: 0, duration: 0.54, ease: 'power1.inOut' }, 0.4)
    }

    // The gate. Checked on a coarse interval rather than every frame — nothing
    // here is time-critical to the millisecond, and the film's rAF loop is
    // already running underneath.
    const check = () => {
      const elapsed = performance.now() - mountedAt
      if (elapsed < LOADER_MIN_MS) return
      if (readyRef.current || (minimumRef.current && elapsed >= LOADER_MAX_MS)) {
        window.clearInterval(poll)
        leave()
      }
    }
    poll = window.setInterval(check, 100)

    return () => {
      window.clearInterval(poll)
      exit?.kill()
      gsap.killTweensOf(counter)
      context.revert()
    }
  }, [drive])

  return createPortal(
    <div
      className="ol"
      ref={root}
      role="status"
      aria-live="polite"
      aria-label={LOADER_COPY.status}
      data-opening-loader
    >
      <div className="ol__meta" data-ol-meta>
        <span>{LOADER_COPY.developer}</span>
        <span className="ol__pct">
          <span ref={percent}>00</span>
          <i>%</i>
        </span>
      </div>

      <svg
        className="ol__plate"
        ref={plate}
        viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          {/* The opening the storeys rise into: everything inside is trimmed
              to the arch, so the upper floors take its curve for free. */}
          <clipPath id="ol-arch">
            <path d={`${INNER_PATH} Z`} />
          </clipPath>
          {/* Bound to real progress. Scaled from the ground line upward. */}
          <clipPath id="ol-rise">
            <rect ref={rise} x="60" y={APEX - 10} width="100" height={GROUND - APEX + 20} />
          </clipPath>
        </defs>

        <g clipPath="url(#ol-arch)">
          <g clipPath="url(#ol-rise)" className="ol__storeys" data-ol-storeys>
            {SLABS.map((y) => (
              <line key={y} x1={INNER.left} y1={y} x2={INNER.right} y2={y} />
            ))}
          </g>

          {/* The datum line rides the top of what has arrived. Trimmed to the
              same arch, so it narrows to the curve as it climbs and has left
              the drawing by the time the building is complete. */}
          <line
            className="ol__level"
            data-ol-level
            ref={level}
            x1={INNER.left - 14}
            y1={GROUND}
            x2={INNER.right + 14}
            y2={GROUND}
          />
        </g>

        <path className="ol__line" data-ol-draw data-ol-ground d={GROUND_PATH} pathLength="1" />
        <path className="ol__line" data-ol-draw data-ol-outer d={OUTER_PATH} pathLength="1" />
        <path
          className="ol__line ol__line--soft"
          data-ol-draw
          data-ol-inner
          d={INNER_PATH}
          pathLength="1"
        />
      </svg>

      <div className="ol__foot" data-ol-foot>
        <span className="ol__project">{LOADER_COPY.project}</span>
        <span className="ol__place">{LOADER_COPY.location}</span>
      </div>
    </div>,
    document.body,
  )
}
