import { useCallback, useEffect, useRef, useState } from 'react'
import '../styles/preloader.css'

import { FRAME_SOURCES, PRIME_COUNT } from '../data/opening'

/**
 * Critical assets to prepare while the preloader covers the page.
 *
 * The opening's first PRIME_COUNT frames are the most important — they must
 * all be decoded before the scroll film can begin. Reception and lifestyle
 * hero images are also warmed so no click later stalls on the network.
 */
const CRITICAL_IMAGES: readonly string[] = [
  // Opening sequence — the first batch that lets the film begin
  ...FRAME_SOURCES.slice(0, PRIME_COUNT),
  // Reception images (now compressed)
  '/assets/reception-entry/building-final.webp',
  '/assets/reception-entry/reception-final.webp',
  // Opening branding
  '/assets/opening/branding/saion-logo.png',
  '/assets/opening/building/final-frame.webp',
]

interface Props {
  /** Called once all critical assets are ready and the exit animation has played. */
  onReady: () => void
}

/**
 * Full-screen preloader with an SVG "R" monogram draw animation.
 *
 * While the animation plays, every critical image is fetched and decoded
 * in the background. The preloader stays until both conditions are met:
 *   1. The minimum animation time has elapsed (the "R" must finish drawing)
 *   2. All critical images are loaded (or timed out)
 *
 * The exit is a cinematic clip-path shrink that reveals the page underneath.
 */
export function SitePreloader({ onReady }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [exiting, setExiting] = useState(false)
  const readyRef = useRef(false)
  const onReadyRef = useRef(onReady)

  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  const exit = useCallback(() => {
    if (readyRef.current) return
    readyRef.current = true
    setExiting(true)
  }, [])

  // Load all critical images
  useEffect(() => {
    let cancelled = false
    let loaded = 0
    const total = CRITICAL_IMAGES.length
    const startTime = performance.now()

    // Minimum time the preloader is shown (let the SVG animation play)
    const MIN_DISPLAY_MS = 2800

    const updateProgress = () => {
      if (cancelled) return
      const fraction = loaded / total
      setProgress(fraction)
    }

    const checkDone = () => {
      if (cancelled) return
      if (loaded < total) return

      const elapsed = performance.now() - startTime
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed)

      setTimeout(() => {
        if (!cancelled) exit()
      }, remaining)
    }

    // Fetch and decode all critical images concurrently
    CRITICAL_IMAGES.forEach((src) => {
      const image = new Image()
      image.decoding = 'async'

      const settle = () => {
        if (cancelled) return
        loaded++
        updateProgress()
        checkDone()
      }

      image.onload = () => {
        image.decode().then(settle, settle)
      }
      image.onerror = settle
      image.src = src
    })

    // Safety timeout: never leave the user staring at the preloader
    const fallback = setTimeout(() => {
      if (!cancelled && !readyRef.current) exit()
    }, 12000)

    return () => {
      cancelled = true
      clearTimeout(fallback)
    }
  }, [exit])

  // After exit animation completes, remove the preloader
  const handleAnimationEnd = useCallback(() => {
    if (exiting) {
      onReadyRef.current()
    }
  }, [exiting])

  return (
    <div
      ref={rootRef}
      className="site-preloader"
      data-exiting={exiting || undefined}
      onAnimationEnd={handleAnimationEnd}
      role="status"
      aria-label="Loading Reposé Residence"
    >
      {/* Corner accents */}
      <div className="site-preloader__corner site-preloader__corner--tl" />
      <div className="site-preloader__corner site-preloader__corner--tr" />
      <div className="site-preloader__corner site-preloader__corner--bl" />
      <div className="site-preloader__corner site-preloader__corner--br" />

      {/* SVG Monogram — the "R" draws itself */}
      <svg
        className="site-preloader__monogram"
        viewBox="0 0 100 120"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Outer frame */}
        <rect
          className="stroke-path"
          x="8" y="8" width="84" height="104"
          rx="2"
          style={{ animationDelay: '0.2s' }}
        />
        {/* The R letterform — drawn with a single path */}
        <path
          className="stroke-path"
          d="M 30 95 L 30 25 L 55 25 Q 72 25 72 40 Q 72 55 55 55 L 30 55 L 65 95"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ animationDelay: '0.5s', strokeWidth: 2.5 }}
        />
        {/* Subtle diamond accent */}
        <path
          className="fill-path"
          d="M 50 108 L 53 112 L 50 116 L 47 112 Z"
          style={{ animationDelay: '2.2s' }}
        />
      </svg>

      {/* Title */}
      <div className="site-preloader__title">
        <div className="site-preloader__name">Reposé Residence</div>
      </div>

      <div className="site-preloader__rule" />

      <div className="site-preloader__developer">
        By SAION Properties
      </div>

      {/* Progress bar */}
      <div className="site-preloader__progress">
        <div
          className="site-preloader__bar"
          style={{ '--progress': progress } as React.CSSProperties}
        />
      </div>

      <div className="site-preloader__percent">
        {Math.round(progress * 100).toString().padStart(2, '0')}%
      </div>

      {/* Location */}
      <div className="site-preloader__location">
        Al Furjan · Dubai
      </div>
    </div>
  )
}
