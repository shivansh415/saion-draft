import { useLayoutEffect, type RefObject } from 'react'

import { gsap, ScrollTrigger } from './gsap'

/**
 * The residence chapter's motion.
 *
 * The chapter is a SCROLL-DRIVEN CHAPTER, not a section that happens to
 * animate on entry. The page is pinned and the four rooms arrive one at a
 * time as the visitor descends — kitchen, living room, bedroom, bathroom —
 * and the last stretch of the pin holds all four together before the journey
 * moves on to the amenities. Scrolling back up takes them away again in the
 * order they came.
 *
 * The reveal is deliberately NOT a fade-up. Each card is an arched opening
 * that fills from its crown down (a clip on the frame), with the picture
 * settling out of its own crop inside that mask, and the numeral, name and
 * cue arriving after the picture rather than with it. What moves the card
 * itself is a few pixels, which is what stops the whole thing reading as a
 * slide-in.
 *
 * `prime` is called once, when the row is close enough to be considered: the
 * rung of the film preloading ladder that belongs to scroll position rather
 * than to the pointer (see `interiors/InteriorCinema`).
 */
export function useResidenceMotion(
  root: RefObject<HTMLElement | null>,
  active: boolean,
  prime: () => void,
) {
  useLayoutEffect(() => {
    if (!active || !root.current) return
    const element = root.current
    const mm = gsap.matchMedia()

    const ctx = gsap.context(() => {
      // Posters first, films second: by the time the row is a screen away the
      // pictures are already in, and only then do the films ask for anything.
      ScrollTrigger.create({
        trigger: element,
        start: 'top bottom',
        once: true,
        onEnter: prime,
      })

      /* ------------------------------------------------------------- *
       * The chapter's own arrival — before the pin, as the section
       * scrolls up into the frame.
       * ------------------------------------------------------------- */
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.ri__title .rp-clip > span', {
          yPercent: 112,
          y: 0,
          duration: 1.15,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: { trigger: element, start: 'top 68%', once: true },
        })
        gsap.from('.ri__eyebrow, .ri__lead', {
          y: 24,
          opacity: 0,
          duration: 1,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: { trigger: element, start: 'top 68%', once: true },
        })

        // The corners belong to the chapter, not to the pinned page, so they
        // drift for its whole length rather than being held still with it.
        gsap.fromTo(
          '.ri-botanical--top-left',
          { yPercent: -4, scale: 1.02 },
          {
            yPercent: 3,
            scale: 1,
            ease: 'none',
            scrollTrigger: { trigger: element, start: 'top bottom', end: 'bottom top', scrub: 0.9 },
          },
        )
        gsap.fromTo(
          '.ri-botanical--bottom-right',
          { yPercent: 5, scale: 1 },
          {
            yPercent: -3,
            scale: 1.03,
            ease: 'none',
            scrollTrigger: { trigger: element, start: 'top bottom', end: 'bottom top', scrub: 0.9 },
          },
        )
      })

      /* ------------------------------------------------------------- *
       * The four rooms — pinned, one per beat
       *
       * Five beats: one for each room, and a fifth in which all four
       * simply stand together before the pin releases into the tail.
       * Only on a pointer-sized screen; a phone reads the same cards
       * down a column and reveals each on its own way in, which is
       * both cheaper and far less to go wrong on a small viewport.
       * ------------------------------------------------------------- */
      mm.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', () => {
        const cards = gsap.utils.toArray<HTMLElement>('.ri-card', element)
        if (!cards.length) return

        const reveal = gsap.timeline({
          scrollTrigger: {
            trigger: element,
            start: 'top top',
            end: () => `+=${window.innerHeight * (cards.length + 1) * 0.62}`,
            pin: '.ri__page',
            pinSpacing: true,
            anticipatePin: 1,
            scrub: 0.72,
            invalidateOnRefresh: true,
            /*
             * HIGHER than every pin in the amenities (they are all 10) and
             * than the arch (0), because refresh order must follow DOCUMENT
             * order: a pin inserts a spacer, and every trigger after it in the
             * page shifts by that spacer's height. Measured at 5, this pin was
             * refreshed last, so the three amenity pins and the arch had all
             * been positioned as though these ~3000px did not exist — and the
             * arch, at the very end, could then never reach its own completion.
             * That is the journey's way back to the building, so it is not a
             * cosmetic ordering detail.
             */
            refreshPriority: 20,
          },
          defaults: { ease: 'none' },
        })

        cards.forEach((card, i) => {
          // Not `reveal` — that name is the timeline these tweens go on.
          const curtain = card.querySelector('.ri-card__reveal')
          const picture = card.querySelector('.ri-card__frame img')
          const foot = card.querySelectorAll('.ri-card__index, .ri-card__name, .ri-card__cue')
          const at = i

          reveal
            // The card is present before its picture is: it moves a few pixels,
            // no more, so the arrival belongs to the mask rather than to a slide.
            .fromTo(card, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.42, ease: 'power2.out' }, at)
            // The opening fills from its crown down.
            //
            // The clip is on `.ri-card__reveal`, NOT on the frame: the frame
            // carries the arch (a border-radius with overflow), and a
            // rectangular clip on that same element gave the compositor two
            // clips to combine on one promoted layer. Its fallback painted one
            // full-width row of the picture along the frame's top edge — a
            // hairline above the crown, for exactly as long as the clip was
            // between its two ends. The three sides this clip does not cut
            // overscan by 2px so its edges never sit on the frame's own.
            .fromTo(
              curtain,
              { clipPath: 'inset(-2px -2px 100% -2px)' },
              { clipPath: 'inset(-2px -2px 0% -2px)', duration: 0.85, ease: 'power3.inOut' },
              at,
            )
            // …and the picture settles out of its own crop inside it, a beat
            // slower, so the two are still moving when the mask lands.
            .fromTo(
              picture,
              { scale: 1.24, yPercent: -5 },
              { scale: 1, yPercent: 0, duration: 1.05, ease: 'power2.out' },
              at,
            )
            // The words follow the picture rather than arriving with it.
            .fromTo(
              foot,
              { autoAlpha: 0, y: 14 },
              { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.12, ease: 'power3.out' },
              at + 0.45,
            )
            // Everything already standing drifts up a little as the next
            // arrives — the only parallax in the row, and it is a few pixels.
            .to(card, { y: -10, duration: cards.length - i, ease: 'none' }, at + 1)
        })

        return () => {
          gsap.set(cards, { clearProps: 'transform,opacity,visibility' })
        }
      })

      /* ------------------------------------------------------------- *
       * Phones: the same four cards, read down a column, each revealed
       * on its own way in. No pin.
       * ------------------------------------------------------------- */
      mm.add('(max-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
        gsap.utils.toArray<HTMLElement>('.ri-card', element).forEach((card) => {
          const trigger = { trigger: card, start: 'top 88%', once: true }
          gsap.fromTo(card, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out', scrollTrigger: trigger })
          gsap.fromTo(
            card.querySelector('.ri-card__reveal'),
            { clipPath: 'inset(-2px -2px 100% -2px)' },
            { clipPath: 'inset(-2px -2px 0% -2px)', duration: 1.1, ease: 'power3.inOut', scrollTrigger: trigger },
          )
          gsap.fromTo(
            card.querySelector('.ri-card__frame img'),
            { scale: 1.2 },
            { scale: 1, duration: 1.3, ease: 'power2.out', scrollTrigger: trigger },
          )
          gsap.fromTo(
            card.querySelectorAll('.ri-card__index, .ri-card__name, .ri-card__cue'),
            { autoAlpha: 0, y: 12 },
            { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out', delay: 0.35, scrollTrigger: trigger },
          )
        })
      })
    }, element)

    return () => {
      mm.revert()
      ctx.revert()
    }
  }, [root, active, prime])
}
