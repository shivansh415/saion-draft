import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'

import { WALKTHROUGH_COPY, WALKTHROUGH_FILMS } from './walkthroughData'
import type { WalkthroughFilm } from './walkthroughData'

/**
 * The stage — where the films are watched.
 *
 * A cinema rather than a gallery: one film at a time, as large as the frame
 * allows, on the ink ground, with the least chrome that still tells the
 * visitor where they are and how to move. The eyebrow and Close at the top,
 * the film's own title and the 01 / 02 index beneath, and two arrows.
 *
 * It is mounted underneath the ident and told when to come in (`live`), so
 * the ident's veil dissolves onto a stage that is already there, already
 * moving — nothing is seen to load.
 *
 * A film with no `src` yet shows its placeholder: the same frame, a slow
 * light in it, and the arch as a watermark, so the composition is what it
 * will be when the footage arrives and only the picture changes.
 */

const ARCH = 'M56 262 V128 A54 54 0 0 1 164 128 V262'
const ARCH_INNER = 'M70 262 V140 A40 40 0 0 1 150 140 V262'

interface Props {
  /** The ident has begun to leave: come in. */
  live: boolean
  /** The ident is gone: the keys are the stage's. */
  armed: boolean
  onClose: () => void
}

export function WalkthroughStage({ live, armed, onClose }: Props) {
  const root = useRef<HTMLDivElement | null>(null)
  const [current, setCurrent] = useState(0)
  /** The frame is mid-crossfade; a second press waits its turn. */
  const switching = useRef(false)
  const film = WALKTHROUGH_FILMS[current]
  const count = WALKTHROUGH_FILMS.length

  /* --------------------------------------------------------------- *
   * Entrance — begun by the ident's exit, not by mount
   * --------------------------------------------------------------- */
  useLayoutEffect(() => {
    const element = root.current
    if (!element || !live) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const context = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      // Solid quickly: the ident's veil above waits for this before it goes.
      tl.fromTo(element, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power1.inOut' }, 0)
      if (!reduced) {
        tl.fromTo(
          '[data-ws-frame]',
          { scale: 1.045, opacity: 0, filter: 'blur(6px)' },
          { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 1.3 },
          0.05,
        )
        tl.fromTo(
          '[data-ws-chrome]',
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.9, stagger: 0.08 },
          0.35,
        )
      }
    }, element)
    // The DIALOG takes focus, not the Close button.
    //
    // Focusing a control programmatically is enough for Chrome to treat it as
    // keyboard-reached, so `:focus-visible` matched and every visitor — mouse
    // or not — was met by a focus ring drawn around Close the instant the
    // stage appeared. Focusing the container puts a screen reader in the right
    // place and still leaves Tab to reach Close first, with no ring on a
    // press that never used the keyboard.
    element.focus({ preventScroll: true })
    return () => context.revert()
  }, [live])

  /* --------------------------------------------------------------- *
   * Switching films — a crossfade of the frame, the title following
   * --------------------------------------------------------------- */
  const go = useCallback(
    (direction: 1 | -1) => {
      if (switching.current) return
      const element = root.current
      if (!element) return
      const next = (current + direction + count) % count
      if (next === current) return
      switching.current = true

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const picture = element.querySelector('[data-ws-picture]')
      const words = element.querySelectorAll('[data-ws-word]')
      const tl = gsap.timeline({
        onComplete: () => {
          switching.current = false
        },
      })
      if (reduced) {
        setCurrent(next)
        tl.to({}, { duration: 0.05 })
        return
      }
      tl.to(picture, { opacity: 0, scale: 1.02, duration: 0.38, ease: 'power2.in' }, 0)
      tl.to(words, { opacity: 0, y: -8 * direction, duration: 0.28, ease: 'power2.in', stagger: 0.03 }, 0)
      tl.call(() => setCurrent(next), undefined, 0.4)
      tl.fromTo(picture, { opacity: 0, scale: 1.02 }, { opacity: 1, scale: 1, duration: 0.75, ease: 'power3.out' }, 0.42)
      tl.fromTo(
        words,
        { opacity: 0, y: 12 * direction },
        { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out', stagger: 0.05 },
        0.5,
      )
    },
    [count, current],
  )

  useEffect(() => {
    if (!armed) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      else if (event.key === 'ArrowRight') go(1)
      else if (event.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [armed, go, onClose])

  return (
    <div
      className="ws"
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={WALKTHROUGH_COPY.eyebrow}
      data-ws-root
      data-live={live || undefined}
      data-lenis-prevent
      data-scroll-lock-allow
      tabIndex={-1}
    >
      <header className="ws__top" data-ws-chrome>
        {/* On a phone the full line wraps to two beside Close and crowds it;
            the project's name is on the screen behind them either way, so the
            narrow layout keeps only what names this screen. */}
        <span className="ws__eyebrow">
          <span className="ws__eyebrow-project">{WALKTHROUGH_COPY.eyebrowProject}</span>
          {WALKTHROUGH_COPY.eyebrow}
        </span>
        <button type="button" className="ws__close" onClick={onClose}>
          <span>{WALKTHROUGH_COPY.close}</span>
          <span className="ws__close-x" aria-hidden="true" />
        </button>
      </header>

      <div className="ws__frame" data-ws-frame>
        <div className="ws__picture" data-ws-picture>
          <Picture film={film} />
        </div>
        <span className="ws__frame-edge" aria-hidden="true" />
      </div>

      <footer className="ws__foot" data-ws-chrome>
        <div className="ws__words">
          <span className="ws__index" data-ws-word>
            {film.index}
            <span className="ws__index-of">/ {String(count).padStart(2, '0')}</span>
            {film.duration && <span className="ws__duration">{film.duration}</span>}
          </span>
          <h2 className="ws__title" data-ws-word>
            {film.title}
          </h2>
          <p className="ws__subtitle" data-ws-word>
            {film.subtitle}
          </p>
        </div>

        <nav className="ws__nav" aria-label="Films">
          <button type="button" className="ws__arrow" onClick={() => go(-1)} aria-label={WALKTHROUGH_COPY.previous}>
            <span aria-hidden="true">&larr;</span>
          </button>
          <span className="ws__dots" aria-hidden="true">
            {WALKTHROUGH_FILMS.map((entry, i) => (
              <span key={entry.id} className="ws__dot" data-on={i === current || undefined} />
            ))}
          </span>
          <button type="button" className="ws__arrow" onClick={() => go(1)} aria-label={WALKTHROUGH_COPY.next}>
            <span aria-hidden="true">&rarr;</span>
          </button>
        </nav>
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * The picture in the frame — the film, or its placeholder
 * ------------------------------------------------------------------ */
function Picture({ film }: { film: WalkthroughFilm }) {
  if (film.src) {
    return (
      <video
        key={film.id}
        className="ws__video"
        src={film.src}
        poster={film.poster ?? undefined}
        controls
        playsInline
        preload="metadata"
      />
    )
  }
  return (
    <div className="ws__placeholder" key={film.id} data-ws-placeholder>
      <div className="ws__ph-light" aria-hidden="true" />
      <svg className="ws__ph-arch" viewBox="0 60 220 216" fill="none" aria-hidden="true" focusable="false">
        <path d={ARCH} pathLength="1" />
        <path d={ARCH_INNER} pathLength="1" />
        <path d="M14 262 H206" pathLength="1" />
      </svg>
      <div className="ws__ph-centre">
        <span className="ws__ph-play" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M8 5.5v13l11-6.5z" />
          </svg>
        </span>
        <span className="ws__ph-label">
          {WALKTHROUGH_COPY.placeholder} &middot; {film.index}
        </span>
      </div>
    </div>
  )
}
