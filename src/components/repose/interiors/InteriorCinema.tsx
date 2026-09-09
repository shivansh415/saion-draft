import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react'

import { lockScroll, unlockScroll } from '../../../lib/scrollLock'
import { gsap, ScrollTrigger } from '../motion/gsap'
import { INTERIORS, RESIDENCE_COPY, type Interior, type InteriorId } from './interiorsData'

/**
 * The residence chapter's films.
 *
 * Not a gallery and not a modal. The card the visitor pressed becomes the
 * window: the frame it occupies grows out of that exact rectangle to fill the
 * viewport, its arched head flattening as it goes, while the chapter behind it
 * settles back and softens. The film is already running before the frame has
 * finished opening, so the arrival is a continuous move into the room rather
 * than a cut to a player.
 *
 * WHY A GROWING BOX AND NOT A CLIP-PATH. `inset()` interpolation is only as
 * reliable as the two strings matching in shape and unit, and a `round` term
 * makes that fragile across engines. Animating the frame's own top/left/width/
 * height in pixels is exact everywhere, and because the video is `object-fit:
 * cover` inside it, the browser recomputes the crop every frame for free —
 * which IS the crop interpolation the transition wants. The arch is the two
 * top corner radii, in pixels, opening from a true semicircle to nothing.
 *
 * ALL FOUR films are mounted here from the start, and this is the only place
 * a `<video>` for them exists. That is what makes the preloading ladder work:
 * the element the visitor hovers to warm is the same element that plays, so a
 * warmed film is not re-fetched on the press. Every one of them starts at
 * `preload="none"`, so mounting them costs a tag each and no bytes.
 */

export interface CinemaHandle {
  /** The section is in view: let the films fetch their metadata, quietly. */
  prime: () => void
  /** This card is being considered — warm its film properly. */
  warm: (id: InteriorId) => void
}

interface Props {
  /**
   * The room whose film is open, the card rectangle it grows from, and that
   * card's own arched head as a [top-left, top-right] radius pair.
   */
  open: { room: Interior; from: DOMRect; arch: [string, string] } | null
  /** The chapter behind, which recedes while a film has the frame. */
  host: React.RefObject<HTMLElement | null>
  onClose: () => void
}

/**
 * Putting the chapter back after a film — the one step that must not be done
 * with `clearProps`.
 *
 * The host is `.ri__page`, and `.ri__page` is the element ScrollTrigger PINS
 * for the length of the four reveals. That pin is a `transform` written onto
 * this same element (`translate(0, …)`, its pinType here being "transform"),
 * so `clearProps: 'transform'` did not undo the recede — it deleted the pin,
 * dropping the page thousands of pixels out of the frame. What was left was
 * an empty ivory screen with four cards far above it, no way to press them,
 * and no way back but a reload.
 *
 * So: undo exactly what the recede set, and nothing else. The scale is
 * returned to 1 through GSAP (which recomposes the transform and leaves the
 * pin's translate where it is), opacity and filter are cleared because
 * nothing else writes them, and ScrollTrigger is asked to re-assert the pin
 * immediately rather than at whatever scroll event happens next.
 */
function restoreHost(element: HTMLElement | null): void {
  if (!element) return
  gsap.set(element, { scale: 1, clearProps: 'opacity,filter' })
  ScrollTrigger.update()
}

type Level = 'none' | 'metadata' | 'auto'
const RANK: Record<Level, number> = { none: 0, metadata: 1, auto: 2 }

export const InteriorCinema = forwardRef<CinemaHandle, Props>(function InteriorCinema(
  { open, host, onClose },
  ref,
) {
  const layer = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const back = useRef<HTMLButtonElement>(null)
  const videos = useRef(new Map<InteriorId, HTMLVideoElement>())
  const levels = useRef(new Map<InteriorId, Level>())
  const timeline = useRef<gsap.core.Timeline | null>(null)
  /** Whether a film has actually had the frame, so a close undoes only a real open. */
  const wasOpen = useRef(false)
  /**
   * The progress bar and the directional cursor are written straight to the
   * DOM rather than held in state. Both change many times a second — the
   * cursor on every pointer move — and this component renders four `<video>`
   * elements, so a state update per move re-rendered all of them for two
   * inline transforms. Nothing else reads either value.
   */
  const meter = useRef<HTMLElement>(null)
  const cursor = useRef<HTMLSpanElement>(null)
  const cursorAt = useRef<{ x: number; y: number } | null>(null)
  const cursorRaf = useRef(0)

  /* --------------------------------------------------------------- *
   * The preload ladder: none → metadata (section in view) → auto
   * (this card is being considered). Only ever upward, and `load()` is
   * called once per rung: calling it again on a video that is already
   * buffering throws the buffer away and starts over, which is exactly
   * the stall the ladder exists to prevent.
   * --------------------------------------------------------------- */
  const raise = useCallback((id: InteriorId, level: Level) => {
    const video = videos.current.get(id)
    if (!video) return
    const current = levels.current.get(id) ?? 'none'
    if (RANK[level] <= RANK[current]) return
    levels.current.set(id, level)
    video.preload = level
    video.load()
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      prime: () => INTERIORS.forEach((room) => raise(room.id, 'metadata')),
      warm: (id) => raise(id, 'auto'),
    }),
    [raise],
  )

  /* --------------------------------------------------------------- *
   * The move in, and the move back out
   * --------------------------------------------------------------- */
  useLayoutEffect(() => {
    const layerEl = layer.current
    const frameEl = frame.current
    if (!layerEl || !frameEl) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    timeline.current?.kill()

    if (!open) {
      // Nothing was opened, so there is nothing to undo. Without this the
      // first mount runs the whole close sequence over a chapter that was
      // never receded — including, before this was understood, a clearProps
      // on a page ScrollTrigger had just pinned.
      if (!wasOpen.current) return
      wasOpen.current = false

      // The layer stops taking input at once rather than when the fade ends:
      // for the length of that fade it is still a full-screen box over the
      // cards, and a press in that moment used to land on the film.
      gsap.set(layerEl, { pointerEvents: 'none' })

      // Animate out instead of cutting to prevent a white flash. The host
      // chapter is restored smoothly while the cinema layer fades.
      const closeTl = gsap.timeline({
        onComplete: () => {
          gsap.set(layerEl, { autoAlpha: 0 })
          restoreHost(host.current)
        },
      })
      timeline.current = closeTl
      if (reduced) {
        gsap.set(layerEl, { autoAlpha: 0 })
        restoreHost(host.current)
      } else {
        closeTl
          .to(layerEl, { autoAlpha: 0, duration: 0.45, ease: 'power2.inOut' }, 0)
          .to(host.current, { scale: 1, opacity: 1, filter: 'none', duration: 0.5, ease: 'power2.out' }, 0)
      }
      return
    }

    wasOpen.current = true

    const { room, from, arch } = open
    const video = videos.current.get(room.id)
    const veil = layerEl.querySelector('.ri-cinema__veil')
    const chrome = layerEl.querySelectorAll('.ri-cinema__chrome')
    const type = layerEl.querySelectorAll('[data-cinema-type]')

    // The film is asked to run at the very start, not on arrival: by the time
    // the frame has opened it is a moving picture, not a poster that then
    // starts. Its poster is the same still the card was showing, so there is
    // nothing blank in between whatever the network has managed.
    if (video) {
      raise(room.id, 'auto')
      video.currentTime = 0
      void video.play().catch(() => {})
    }

    const vw = window.innerWidth
    const vh = window.innerHeight

    gsap.set(layerEl, { autoAlpha: 1, pointerEvents: 'auto' })
    gsap.set(frameEl, {
      top: from.top,
      left: from.left,
      width: from.width,
      height: from.height,
      // The card's own arched head, exactly as it is painted.
      borderTopLeftRadius: arch[0],
      borderTopRightRadius: arch[1],
      willChange: 'top,left,width,height',
    })
    gsap.set(video ?? null, { scale: 1.16, filter: 'blur(14px)' })
    gsap.set(chrome, { autoAlpha: 0 })
    gsap.set(type, { autoAlpha: 0, y: 26 })

    if (reduced) {
      gsap.set(frameEl, {
        top: 0,
        left: 0,
        width: vw,
        height: vh,
        borderTopLeftRadius: '0%',
        borderTopRightRadius: '0%',
        willChange: 'auto',
      })
      gsap.set(video ?? null, { scale: 1, filter: 'none' })
      gsap.set([...chrome, ...type], { autoAlpha: 1, y: 0 })
      gsap.set(veil, { opacity: 1 })
      return
    }

    const tl = gsap.timeline({
      onComplete: () => {
        // The blur is the expensive part of this and it has done its work;
        // a full-screen filtered video left in place costs every frame after.
        gsap.set(video ?? null, { filter: 'none' })
        gsap.set(frameEl, { willChange: 'auto' })
      },
    })
    timeline.current = tl

    tl.fromTo(veil, { opacity: 0 }, { opacity: 1, duration: 0.55, ease: 'power2.out' }, 0)
      // The chapter recedes rather than disappears — it is still there, behind
      // the room, and it comes back to exactly this.
      .to(
        host.current,
        { scale: 0.965, opacity: 0.28, filter: 'blur(5px)', duration: 1, ease: 'power3.inOut' },
        0,
      )
      .to(
        frameEl,
        {
          top: 0,
          left: 0,
          width: vw,
          height: vh,
          borderTopLeftRadius: '0%',
          borderTopRightRadius: '0%',
          duration: 1.05,
          ease: 'power4.inOut',
        },
        0,
      )
      // Settling out of the crop a beat behind the frame, so the picture is
      // still easing as the edges land. This is the refraction.
      .to(video ?? null, { scale: 1, filter: 'blur(0px)', duration: 1.25, ease: 'power3.out' }, 0.04)
      .to(chrome, { autoAlpha: 1, duration: 0.5, ease: 'power2.out' }, 0.72)
      .to(type, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.09, ease: 'power3.out' }, 0.78)

    return () => {
      tl.kill()
    }
  }, [open, host, raise])

  /* --------------------------------------------------------------- *
   * The page is held while a film has the frame — through the one
   * shared lock, so nothing can be scrolled underneath it.
   * --------------------------------------------------------------- */
  useEffect(() => {
    if (!open) return
    lockScroll()
    const opener = document.activeElement as HTMLElement | null
    back.current?.focus({ preventScroll: true })
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', key, true)
    return () => {
      window.removeEventListener('keydown', key, true)
      unlockScroll()
      opener?.focus?.({ preventScroll: true })
    }
  }, [open, onClose])

  /* Pause whatever is not on screen — one film runs at a time, ever. */
  useEffect(() => {
    videos.current.forEach((video, id) => {
      if (open && id === open.room.id) return
      video.pause()
    })
    if (!open && meter.current) meter.current.style.transform = 'scaleX(0)'
  }, [open])

  const time = useCallback((event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget
    const bar = meter.current
    if (!bar || !video.duration) return
    bar.style.transform = `scaleX(${video.currentTime / video.duration})`
  }, [])

  /* The cursor follows on the frame, not on the event: a trackpad can deliver
     pointer moves faster than the screen refreshes. */
  const follow = useCallback((event: React.PointerEvent) => {
    cursorAt.current = { x: event.clientX, y: event.clientY }
    if (cursorRaf.current) return
    cursorRaf.current = requestAnimationFrame(() => {
      cursorRaf.current = 0
      const element = cursor.current
      const at = cursorAt.current
      if (!element || !at) return
      element.style.transform = `translate3d(${at.x}px, ${at.y}px, 0)`
      element.style.opacity = '1'
    })
  }, [])

  const unfollow = useCallback(() => {
    cursorAt.current = null
    if (cursor.current) cursor.current.style.opacity = '0'
  }, [])

  useEffect(
    () => () => {
      if (cursorRaf.current) cancelAnimationFrame(cursorRaf.current)
    },
    [],
  )

  const room = open?.room ?? null

  return (
    <div
      className="ri-cinema"
      ref={layer}
      role="dialog"
      aria-modal="true"
      aria-label={room ? `${room.title} — film` : 'Interior film'}
      aria-hidden={room ? undefined : true}
      onPointerMove={follow}
      onPointerLeave={unfollow}
    >
      <div className="ri-cinema__veil" />

      <div className="ri-cinema__frame" ref={frame}>
        {INTERIORS.map((entry) => (
          <video
            key={entry.id}
            ref={(element) => {
              if (element) videos.current.set(entry.id, element)
              else videos.current.delete(entry.id)
            }}
            className="ri-cinema__film"
            data-shown={room?.id === entry.id || undefined}
            src={entry.video}
            poster={entry.still}
            preload="none"
            muted
            loop
            playsInline
            disablePictureInPicture
            /* Not a player: no controls, nothing to download, nothing to cast. */
            controlsList="nodownload noplaybackrate noremoteplayback"
            aria-hidden="true"
            tabIndex={-1}
            onTimeUpdate={room?.id === entry.id ? time : undefined}
          />
        ))}
        <div className="ri-cinema__wash" aria-hidden="true" />
      </div>

      {/* Editorial type over the film. Presentation lines only. */}
      <div className="ri-cinema__type">
        <span className="ri-cinema__index t-micro" data-cinema-type>
          {room?.index}
        </span>
        <h2 className="ri-cinema__title t-display" data-cinema-type>
          {room?.title}
        </h2>
        <p className="ri-cinema__line" data-cinema-type>
          <em>{room?.line}</em>
        </p>
      </div>
      <span className="ri-cinema__meta t-micro" data-cinema-type>
        {room?.meta}
      </span>

      <button type="button" className="ri-cinema__back ri-cinema__chrome t-ui" ref={back} onClick={onClose}>
        <span aria-hidden="true">←</span>
        {RESIDENCE_COPY.back}
      </button>

      <div className="ri-cinema__progress ri-cinema__chrome" aria-hidden="true">
        <i ref={meter} />
      </div>

      {/* A minimal directional cursor, on fine pointers only (see the
          stylesheet's `any-hover` guard). Mounted once and moved by hand —
          see the refs above. Nothing depends on it. */}
      <span className="ri-cinema__cursor" aria-hidden="true" ref={cursor}>
        <i />
      </span>
    </div>
  )
})
