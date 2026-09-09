import { useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import gsap from 'gsap'

import { unit3dCamera } from './unit3dViews'
import type { Unit3dView } from './unit3dViews'

/**
 * The drawing standing up — the flat plan becoming the supplied 3D render of
 * the same apartment, in the same frame, and back again.
 *
 * It is one box (the stage) holding two layers registered to each other by
 * `unit3dViews.ts`: the drawing, filling the sheet exactly as it always has,
 * and the render, laid over the part of the sheet the apartment occupies. So
 * nothing travels between two pictures — the apartment is already in the same
 * place in both, and what the transition does is change what it is made of.
 *
 * One paused timeline is built per view and played forward or reversed, which
 * is what makes the way back the way out, exactly, and what lets a visitor
 * change their mind mid-transition without the two states ever fighting:
 *
 *   the frame       pushes in around the apartment, so the sheet's margins,
 *                   its header and its area figures leave the frame as the
 *                   solid view takes it;
 *   the drawing     lifts a little, tips a couple of degrees off the flat,
 *                   and goes;
 *   the render      rises into it — a soft edge sweeping up the apartment
 *                   from the floor, out of blur, out of a fractional drop,
 *                   settling level.
 *
 * The sweep is a masked gradient driven by `--fx-build` (see the stylesheet):
 * the render is not wiped in from an edge of the frame but built up the
 * height of the apartment itself, which is the difference between a
 * transition that reads as a slide and one that reads as walls rising.
 *
 * A residence with no supplied render renders its children and nothing else —
 * not a wrapper, not a class, no stage — so every other unit in the explorer
 * is exactly the DOM it was before this existed.
 *
 * Reduced motion keeps the registration and drops the motion: the two layers
 * cross-fade in place, the apartment turning solid where it lies, no push in,
 * no sweep, no tilt.
 */

interface Props {
  /** The residence's solid view, or null where none is supplied. */
  view: Unit3dView | null
  /** True to stand the plan up; false to lay it back down. */
  solid: boolean
  reducedMotion: boolean
  /** The flat drawing, exactly as it renders without this. */
  children: ReactNode
}

/** The way out, in seconds. The way back is the same, a little brisker. */
const REVERSE_TIMESCALE = 1.25

export function PlanMorph({ view, solid, reducedMotion, children }: Props) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const flatRef = useRef<HTMLDivElement | null>(null)
  const solidRef = useRef<HTMLImageElement | null>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  // Which state the timeline has been left in, so that seating a view is
  // never mistaken for a transition into it.
  const atRef = useRef(false)

  useLayoutEffect(() => {
    const stage = stageRef.current
    const flat = flatRef.current
    const render = solidRef.current
    if (!view || !stage || !flat || !render) return

    const camera = unit3dCamera(view)
    const timeline = gsap.timeline({ paused: true })

    if (reducedMotion) {
      // Registered in place, the apartment simply turns solid where it lies.
      gsap.set(render, { '--fx-build': 1 })
      timeline
        .fromTo(flat, { opacity: 1 }, { opacity: 0, duration: 0.32, ease: 'power1.inOut' }, 0)
        .fromTo(render, { opacity: 0 }, { opacity: 1, duration: 0.32, ease: 'power1.inOut' }, 0)
    } else {
      timeline
        // The frame closes on the apartment.
        .fromTo(
          stage,
          { scale: 1, xPercent: 0, yPercent: 0, transformOrigin: camera.transformOrigin },
          {
            scale: camera.scale,
            xPercent: camera.xPercent,
            yPercent: camera.yPercent,
            duration: 1.4,
            ease: 'power2.inOut',
          },
          0,
        )
        // The render rises into its place — the sweep is what is watched,
        // so it carries the length of the transition; the drop, the blur and
        // the tilt are only there to keep it from arriving flat.
        .fromTo(
          render,
          { scale: 0.985, yPercent: 1, rotateX: 4 },
          { scale: 1, yPercent: 0, rotateX: 0, duration: 1.05, ease: 'expo.out' },
          0.05,
        )
        .fromTo(render, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power1.out' }, 0.05)
        .fromTo(render, { '--fx-build': 0 }, { '--fx-build': 1, duration: 1.05, ease: 'power1.inOut' }, 0.05)
        .fromTo(
          render,
          { filter: 'blur(6px)' },
          { filter: 'blur(0px)', duration: 0.55, ease: 'power2.out' },
          0.05,
        )
        // The drawing holds while the render rises over it — the render's own
        // ground is opaque, so the apartment is taken room by room as the
        // sweep passes, and what is left to fade is the sheet's margins, its
        // header and its area figures, which the frame is carrying out anyway.
        // Faded any earlier and the frame is briefly empty paper, which reads
        // as one picture leaving and another arriving rather than as one plan
        // standing up.
        .fromTo(flat, { opacity: 1 }, { opacity: 0, duration: 0.72, ease: 'power2.inOut' }, 0.6)
        .fromTo(
          flat,
          { scale: 1, rotateX: 0 },
          { scale: 1.015, rotateX: -2, duration: 0.95, ease: 'power2.out' },
          0.45,
        )
    }

    timelineRef.current = timeline
    // Whatever state this view is mounted in is where it starts.
    timeline.progress(solid ? 1 : 0).pause()
    atRef.current = solid

    return () => {
      timelineRef.current = null
      timeline.kill()
      gsap.set([stage, flat, render], { clearProps: 'all' })
    }
    // `solid` is read once, to seat the view; the effect below animates it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, reducedMotion])

  useLayoutEffect(() => {
    const timeline = timelineRef.current
    if (!timeline || atRef.current === solid) return
    atRef.current = solid
    if (solid) {
      timeline.timeScale(1).play()
    } else {
      timeline.timeScale(REVERSE_TIMESCALE).reverse()
    }
  }, [solid])

  // No supplied render, no stage: the drawing renders exactly as it did.
  if (!view) return <>{children}</>

  return (
    <div className="fx-morph" data-fx-morph ref={stageRef}>
      <div className="fx-morph__flat" ref={flatRef}>
        {children}
      </div>
      <img
        className="fx-morph__solid"
        data-fx-morph-solid
        ref={solidRef}
        src={view.src}
        alt=""
        aria-hidden="true"
        decoding="async"
        draggable={false}
        style={{
          left: `${view.align.left * 100}%`,
          top: `${view.align.top * 100}%`,
          width: `${view.align.width * 100}%`,
          height: `${view.align.height * 100}%`,
        }}
      />
    </div>
  )
}
