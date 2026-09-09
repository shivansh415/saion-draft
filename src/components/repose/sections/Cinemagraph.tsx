import { useEffect, useRef } from 'react'

/**
 * An amenity film, presented as a picture rather than as a player.
 *
 * It replaces a `<Photo>` in the approved panels and keeps their composition
 * exactly: same figure, same box, same cover fit — so the panel's own parallax
 * and crop tweens go on addressing it unchanged (see `useStoryMotion`, which
 * looks for `img, video`).
 *
 * Three things make it behave:
 *
 *   the poster is the still the panel used to show, so the first paint is the
 *   approved frame and there is never a blank box waiting on the network;
 *
 *   it runs only while it is on or near the screen. An `IntersectionObserver`
 *   with a screen of margin either side starts it just before it arrives and
 *   pauses it once it is well gone — three 1080p films decoding at once, off
 *   screen, is the whole cost of this change if it is skipped;
 *
 *   it never seeks. Pausing holds the frame; resuming continues from it. That
 *   is what stops the jitter a `currentTime = 0` on every re-entry produces.
 */
interface Props {
  src: string
  poster: string
  /** Described for assistive technology exactly as the still it replaced was. */
  alt: string
  className?: string
}

export function Cinemagraph({ src, poster, alt, className = '' }: Props) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = ref.current
    if (!video) return

    // Reduced motion is a request not to move things. The poster is a real
    // photograph of the same amenity, so it stands in completely.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // The bytes are asked for here rather than in the markup. At
          // `preload="auto"` every cinemagraph on the page fetched itself in
          // full on mount — several films competing with the pictures the
          // visitor was actually looking at. The margin below is a whole
          // viewport, so the fetch still starts a screen early.
          if (video.preload !== 'auto') video.preload = 'auto'
          void video.play().catch(() => {})
        } else {
          video.pause()
        }
      },
      { rootMargin: '100% 0px 100% 0px', threshold: 0 },
    )
    observer.observe(video)
    return () => {
      observer.disconnect()
      video.pause()
    }
  }, [])

  return (
    <video
      ref={ref}
      className={`rp-film ${className}`}
      src={src}
      poster={poster}
      preload="none"
      muted
      loop
      playsInline
      disablePictureInPicture
      controlsList="nodownload noplaybackrate noremoteplayback"
      aria-label={alt}
      role="img"
    />
  )
}
