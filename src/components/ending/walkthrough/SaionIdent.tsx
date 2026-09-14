import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

import { MARK_LETTERS, MARK_VIEW } from './saionMark'
import { WALKTHROUGH_COPY } from './walkthroughData'

/**
 * The SAION ident — what plays between the closing call and the films.
 *
 * A studio ident rather than a loader: nothing is being waited for, so it is
 * free to be a piece of time in its own right, and it is built out of the
 * site's own figure. The arch that draws itself at the very top of the journey,
 * that the visitor walks through into the reception, and that carries them out
 * of the amenities, is drawn once more here — and this time the light behind
 * it is let out.
 *
 *   dark          the frame goes to ink over the closing call
 *   slit          a hairline of light stands up at the centre, as if a door
 *                 had opened a crack
 *   arch          the arch draws itself around it, ground first
 *   light         the opening fills with the reception's warm light
 *   burst         the light comes through — a flash, the arch thrown open
 *                 past the frame — and what is standing in the after-image
 *                 is the wordmark, resolving letter by letter from the centre
 *   sweep         one highlight passes along the letters
 *   lockup        PROPERTIES tracks in beneath, the strapline under it
 *   hold, exit    the lockup lifts and softens as the frame gives way to
 *                 the stage beneath
 *
 * Roughly four and a half seconds. One GSAP timeline, labelled, so Skip and
 * the brief replay both just seek. Nothing here touches layout while it is
 * on screen; every move is transform, opacity, filter, or a stroke offset.
 */

/* ------------------------------------------------------------------ *
 * The arch — the same geometry as the preloader's, so it is the same figure.
 * ------------------------------------------------------------------ */
const VIEW = { x: 0, y: 60, w: 220, h: 216 } as const
const GROUND = 262
const OUTER_PATH = 'M56 262 V128 A54 54 0 0 1 164 128 V262'
const INNER_PATH = `M70 ${GROUND} V140 A40 40 0 0 1 150 140 V${GROUND}`
const GROUND_PATH = 'M14 262 H206'

/** Where the timeline's beats sit, in seconds. Labels, so seeking is by name. */
const BEAT = {
  burst: 2.2,
  exit: 4.45,
  end: 5.6,
} as const

/** A brief replay starts just before the burst — the arch has been seen. */
const BRIEF_FROM = BEAT.burst - 0.12

interface Props {
  /** Second and later plays skip the arch and open on the burst. */
  brief: boolean
  /** The lockup is leaving; the stage may come in underneath. */
  onExit: () => void
  /** The frame is clear; unmount. */
  onDone: () => void
}

export function SaionIdent({ brief, onExit, onDone }: Props) {
  const root = useRef<HTMLDivElement | null>(null)
  const timeline = useRef<gsap.core.Timeline | null>(null)
  const exited = useRef(false)
  const onExitRef = useRef(onExit)
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onExitRef.current = onExit
    onDoneRef.current = onDone
  })

  /** Handed up once, however the exit is reached — the timeline or Skip. */
  const exit = () => {
    if (exited.current) return
    exited.current = true
    onExitRef.current()
  }

  useLayoutEffect(() => {
    const element = root.current
    if (!element) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const context = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'power2.out' },
        onComplete: () => onDoneRef.current(),
      })
      timeline.current = tl

      const letters = gsap.utils.toArray<SVGPathElement>('[data-wi-letter]')
      const caps = gsap.utils.toArray<HTMLElement>('[data-wi-cap]')

      /* 0 — dark ------------------------------------------------------ */
      tl.fromTo('[data-wi-veil]', { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power1.inOut' }, 0)

      /* 1 — the slit -------------------------------------------------- */
      tl.fromTo(
        '[data-wi-slit]',
        { scaleY: 0, opacity: 0 },
        { scaleY: 1, opacity: 1, duration: 0.85, ease: 'power3.inOut' },
        0.28,
      )

      /* 2 — the arch draws itself, ground first ----------------------- */
      tl.to('[data-wi-ground]', { strokeDashoffset: 0, opacity: 1, duration: 0.7 }, 0.6)
      tl.to('[data-wi-outer]', { strokeDashoffset: 0, opacity: 1, duration: 1.3 }, 0.72)
      tl.to('[data-wi-inner]', { strokeDashoffset: 0, opacity: 0.85, duration: 1.15 }, 0.9)

      /* 3 — the opening fills with light ------------------------------ */
      tl.fromTo('[data-wi-light]', { opacity: 0 }, { opacity: 1, duration: 0.95, ease: 'power2.in' }, 1.35)
      tl.to('[data-wi-slit]', { opacity: 0, duration: 0.5, ease: 'power1.in' }, 1.6)
      tl.fromTo('[data-wi-bloom]', { opacity: 0, scale: 0.6 }, { opacity: 0.55, scale: 1, duration: 0.9, ease: 'power2.in' }, 1.5)

      /* 4 — the burst ------------------------------------------------- */
      tl.addLabel('burst', BEAT.burst)
      tl.fromTo('[data-wi-flash]', { opacity: 0 }, { opacity: 1, duration: 0.14, ease: 'power4.in' }, 'burst')
      tl.to('[data-wi-flash]', { opacity: 0, duration: 0.95, ease: 'power2.out' }, 'burst+=0.14')
      // The arch is thrown open past the frame — the same move the portal
      // makes at the end of the amenities.
      // Its line goes out faster than it grows: past about three times its
      // size the legs are two stray verticals crossing the frame, and they
      // must be gone before the flash has decayed enough to show them.
      tl.to('[data-wi-arch]', { scale: 7.5, duration: 0.65, ease: 'power3.in' }, 'burst+=0.02')
      tl.to('[data-wi-arch]', { opacity: 0, duration: 0.28, ease: 'power2.in' }, 'burst+=0.06')
      tl.to('[data-wi-light]', { opacity: 0, duration: 0.5 }, 'burst+=0.1')
      tl.to('[data-wi-bloom]', { opacity: 0.32, scale: 1.6, duration: 1.4, ease: 'power2.out' }, 'burst')

      /* 5 — the wordmark resolves from the centre outward ------------- */
      tl.fromTo(
        letters,
        { opacity: 0, scale: 1.16, filter: 'blur(16px)' },
        {
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
          duration: 0.95,
          ease: 'power3.out',
          stagger: { each: 0.07, from: 'center' },
        },
        'burst+=0.1',
      )

      /* 6 — one highlight along the letters --------------------------- */
      tl.fromTo(
        '[data-wi-sweep]',
        { attr: { x: -MARK_VIEW.width * 0.45 } },
        { attr: { x: MARK_VIEW.width * 1.05 }, duration: 1.05, ease: 'power2.inOut' },
        'burst+=0.55',
      )

      /* 7 — the lockup ------------------------------------------------ */
      tl.fromTo(
        caps,
        { opacity: 0, y: 8, filter: 'blur(3px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.6, ease: 'power2.out', stagger: 0.035 },
        'burst+=0.9',
      )
      tl.fromTo(
        '[data-wi-rule]',
        { scaleX: 0 },
        { scaleX: 1, duration: 0.9, ease: 'power3.out' },
        'burst+=1.15',
      )
      tl.fromTo(
        '[data-wi-strap]',
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.7 },
        'burst+=1.35',
      )
      tl.fromTo('[data-wi-skip]', { opacity: 0 }, { opacity: 1, duration: 0.5 }, 1.2)

      /* 8 — hold, then the exit --------------------------------------- */
      tl.addLabel('exit', BEAT.exit)
      tl.call(exit, undefined, 'exit')
      tl.to('[data-wi-skip]', { opacity: 0, duration: 0.3 }, 'exit')
      tl.to(
        '[data-wi-lockup]',
        { scale: 1.06, opacity: 0, filter: 'blur(10px)', duration: 0.75, ease: 'power2.in' },
        'exit',
      )
      tl.to('[data-wi-bloom]', { opacity: 0, duration: 0.6 }, 'exit')
      // Not before the stage is solid underneath (it comes in over 0.35 s from
      // the same instant): two half-transparent inks over the page would let
      // the closing call show through the crossover.
      tl.to('[data-wi-veil]', { opacity: 0, duration: 0.7, ease: 'power1.inOut' }, 'exit+=0.4')
      tl.addLabel('end', BEAT.end)
      tl.to({}, { duration: 0.01 }, 'end')

      if (reduced) {
        // No ident under reduced motion. Seeking renders every tween's end
        // state, so this is the finished lockup, held still for a moment so
        // the name is read, and then the plain fade to the stage.
        tl.seek(BEAT.exit - 0.7, true)
      } else if (brief) {
        tl.seek(BRIEF_FROM, true)
      }
    }, element)

    return () => {
      context.revert()
      timeline.current = null
    }
  }, [brief])

  /** Skip: seek to the exit rather than cutting, so the frame is never left dirty. */
  const skip = () => {
    const tl = timeline.current
    if (!tl || exited.current) return
    if (tl.time() >= BEAT.exit) return
    tl.seek('exit', true)
    exit()
  }
  const skipRef = useRef(skip)
  useEffect(() => {
    skipRef.current = skip
  })

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === ' ' || event.key === 'Enter') {
        event.preventDefault()
        skipRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="wi" ref={root} aria-hidden="true" data-wi-root>
      <div className="wi__veil" data-wi-veil />

      <div className="wi__bloom" data-wi-bloom />
      <div className="wi__flash" data-wi-flash />

      <div className="wi__slit" data-wi-slit />

      <svg
        className="wi__arch"
        data-wi-arch
        viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
        fill="none"
        focusable="false"
      >
        <defs>
          <clipPath id="wi-opening">
            <path d={INNER_PATH} />
          </clipPath>
          <linearGradient id="wi-light-grad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#f3dfbf" stopOpacity="0.95" />
            <stop offset="0.55" stopColor="#f6f4f1" stopOpacity="0.6" />
            <stop offset="1" stopColor="#f6f4f1" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <rect
          className="wi__light"
          data-wi-light
          x={VIEW.x}
          y={VIEW.y}
          width={VIEW.w}
          height={VIEW.h}
          fill="url(#wi-light-grad)"
          clipPath="url(#wi-opening)"
        />
        <path className="wi__line" data-wi-ground d={GROUND_PATH} pathLength="1" />
        <path className="wi__line" data-wi-outer d={OUTER_PATH} pathLength="1" />
        <path className="wi__line wi__line--soft" data-wi-inner d={INNER_PATH} pathLength="1" />
      </svg>

      <div className="wi__lockup" data-wi-lockup>
        <svg
          className="wi__mark"
          viewBox={`${MARK_VIEW.x} ${MARK_VIEW.y} ${MARK_VIEW.width} ${MARK_VIEW.height}`}
          focusable="false"
        >
          <defs>
            <clipPath id="wi-mark-clip">
              {MARK_LETTERS.map((letter) => (
                <path key={letter.glyph} d={letter.d} clipRule="evenodd" />
              ))}
            </clipPath>
            {/* A breath of tone down each letter, so the highlight that
                crosses them has something to be brighter than. */}
            <linearGradient id="wi-letter-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#d8d4cc" />
            </linearGradient>
            <linearGradient id="wi-sweep-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
          {MARK_LETTERS.map((letter) => (
            <path
              key={letter.glyph}
              className="wi__letter"
              data-wi-letter
              d={letter.d}
              fillRule="evenodd"
            />
          ))}
          {/* One highlight, clipped to the letters, that crosses them once. */}
          <rect
            className="wi__sweep"
            data-wi-sweep
            x={-MARK_VIEW.width * 0.45}
            y={-10}
            width={MARK_VIEW.width * 0.42}
            height={MARK_VIEW.height + 20}
            fill="url(#wi-sweep-grad)"
            clipPath="url(#wi-mark-clip)"
          />
        </svg>

        <div className="wi__caps">
          {Array.from(WALKTHROUGH_COPY.properties).map((character, i) => (
            <span key={i} data-wi-cap>
              {character}
            </span>
          ))}
        </div>

        <div className="wi__strap-row">
          <span className="wi__rule" data-wi-rule />
          <span className="wi__strap" data-wi-strap>
            {WALKTHROUGH_COPY.strap}
          </span>
          <span className="wi__rule" data-wi-rule />
        </div>
      </div>

      <button type="button" className="wi__skip" data-wi-skip onClick={skip} tabIndex={-1}>
        {WALKTHROUGH_COPY.skip}
      </button>
    </div>
  )
}
