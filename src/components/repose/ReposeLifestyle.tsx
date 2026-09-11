import { useCallback, useEffect, useRef, useState } from 'react'

import { lockScroll, unlockScroll } from '../../lib/scrollLock'
import { ArchPortal } from './ArchPortal'
import {
  ASSET_BASE,
  CHAPTER_COUNT,
  DEFERRED_PHOTOS,
  amenityDetails,
  chapters,
  project,
} from './data/experience'
import type { DetailKey } from './data/experience'
import { warmPhotos } from './data/warmPhotos'
import { ResidenceChapter } from './interiors/ResidenceChapter'
import { ScrollTrigger } from './motion/gsap'
import { glideTo, pageTop } from './motion/hostScroll'
import { useStoryMotion } from './motion/useStoryMotion'
import {
  AmenitiesIndex,
  AmenitiesMap,
  ConnectednessExperience,
  ConvenienceExperience,
  FamilyExperience,
  FinalRepose,
  HorizontalAmenities,
  InteriorExperience,
  Photo,
  TerraceExperience,
  WaterExperience,
} from './sections/Story'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from './ui/dialog'
import { Arrival } from '../ending/Arrival'
import './styles/experience.css'

interface Props {
  /**
   * The arch has become the building. The chapter is finished with — take it
   * down and put the page back on the settled tower.
   *
   * There is no second way out any more. Scrolling back up out of the chapter
   * used to remove it; on one continuous document that would change the
   * document's height under a moving scroll, so the way up is now simply the
   * way down, travelled backwards.
   */
  onReturn: () => void
}

/**
 * Where the chapter is.
 *
 *   residence  the new residence chapter — the four interiors and their
 *              films — reached from the reception by scrolling on, with no
 *              loader between the two
 *   exploring  the amenities journey — flows directly from the residence
 */
type Phase = 'residence' | 'exploring'
type Modal = 'menu' | 'enquire' | DetailKey

const TOWER_SRC = `${ASSET_BASE}/tower-original.png`

/**
 * Both pictures of the final exchange, fetched and decoded ahead of it.
 *
 * At low priority, and deliberately NOT at mount: the tower is a 2.6MB PNG
 * wanted only on the chapter's last screen, and starting it while the loader
 * is up put it in direct competition with the four photographs the first
 * screens actually need. It now follows the rest of the chapter's imagery,
 * which still leaves it nine sections of scrolling ahead of the arch.
 */
function warmSource(src: string): void {
  const image = new Image()
  image.decoding = 'async'
  image.fetchPriority = 'low'
  image.src = src
  void image.decode().catch(() => {})
}

/** The film's final frame, the other half of the arch's exchange. */
const FINAL_FRAME_SRC = '/assets/opening/building/final-frame.webp'

/**
 * Everything after the reception, in one bundle and one scroll.
 *
 *   reception ──scroll──▶ RESIDENCE (four interiors, four films)
 *             ──tail────▶ amenities loader
 *             ──────────▶ 01 amenity index · 02 rhythm · 03 water · 04 terrace
 *                         05 family · 06 interiors · 07 essentials
 *                         08 Al Furjan · 09 AMENITIES MAP · 10 finale ──▶ arch
 *
 * What is the approved experience's own is left alone — sections, styles,
 * motion, pacing, panels. What was standalone is not here: no reception of
 * its own (the application's reception is the reception), no Lenis of its
 * own (the application's one instance drives everything, through
 * `motion/hostScroll`), no page shell.
 *
 * There is no loader on the way IN. This chapter is put into the document
 * below the visitor while they are still on the building, so the reception
 * runs on into the residence by scrolling and by nothing else. The loader
 * belongs to the handover from the residence to the amenities — where the
 * client asked for it, and where the wait is real: its pictures, its faces
 * and its three films.
 *
 * The chapter ends in `ArchPortal`: the arch becomes the building, the page
 * is placed at the opening's end, and `onReturn` hands the frame back.
 */
export function ReposeLifestyle({ onReturn }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const horizontal = useRef<ScrollTrigger | null>(null)
  const portal = useRef<ScrollTrigger | null>(null)
  const pendingNavigation = useRef<string | null>(null)

  const main = useRef<HTMLDivElement>(null)

  const [phase, setPhase] = useState<Phase>('residence')
  /** True once the chapter's own imagery is in and the arch's may follow. */
  const [portalSources, setPortalSources] = useState(false)
  const [modal, setModal] = useState<Modal | null>(null)

  const returnRef = useRef(onReturn)
  useEffect(() => {
    returnRef.current = onReturn
  }, [onReturn])

  /* --------------------------------------------------------------- *
   * The handover — the residence chapter's tail reaches the middle of
   * the screen and the amenity sections mount directly. No loader.
   * --------------------------------------------------------------- */
  useEffect(() => {
    if (phase !== 'residence' || !root.current) return
    const tail = root.current.querySelector<HTMLElement>('[data-residence-tail]')
    if (!tail) return
    const trigger = ScrollTrigger.create({
      trigger: tail,
      start: 'top 62%',
      once: true,
      onEnter: () => {
        setPhase('exploring')
      },
    })
    return () => trigger.kill()
  }, [phase])

  const exploring = phase === 'exploring'
  /** True once the amenity sections are in the document at all. */
  const amenities = phase !== 'residence'
  useStoryMotion(root, exploring, horizontal)

  /* --------------------------------------------------------------- *
   * The rest of the chapter, fetched behind the visitor
   *
   * The loader waited for the first screens and nothing more. From here
   * the remaining photographs are warmed in the order they are met, a
   * few at a time and at low priority, so each section is decoded before
   * it is reached — and so nothing in this queue can ever be competing
   * with the picture the visitor is actually looking at.
   *
   * It starts a moment after the reveal rather than with it: the chapter's
   * entry animation gets the frame to itself.
   * --------------------------------------------------------------- */
  useEffect(() => {
    if (!exploring) return
    let cancelled = false
    let warm: ReturnType<typeof warmPhotos> | null = null
    const begin = () => {
      warm = warmPhotos(DEFERRED_PHOTOS, ASSET_BASE, { concurrency: 3, priority: 'low' })
      // The arch's two pictures last of all — 2.8MB between them, and not
      // wanted until the final screen.
      void warm.promise.then(() => {
        if (cancelled) return
        // Decoded here, and rendered into the portal's own elements by the
        // same flag — one fetch, and a bitmap already in hand for the
        // pixel-exact exchange at the end.
        warmSource(TOWER_SRC)
        warmSource(FINAL_FRAME_SRC)
        setPortalSources(true)
      })
    }
    const idle =
      typeof requestIdleCallback === 'function'
        ? requestIdleCallback(begin, { timeout: 1500 })
        : window.setTimeout(begin, 1200)
    return () => {
      cancelled = true
      if (typeof cancelIdleCallback === 'function') cancelIdleCallback(idle)
      else window.clearTimeout(idle)
      warm?.cancel()
    }
  }, [exploring])

  useEffect(() => {
    if (exploring) root.current?.querySelector<HTMLElement>('#life-title')?.focus({ preventScroll: true })
  }, [exploring])

  /* --------------------------------------------------------------- *
   * Navigation and panels
   * --------------------------------------------------------------- */
  const goTo = useCallback((id: string) => {
    if (id === 'finale-end') {
      const end = portal.current?.end
      // The arch's own scroll position. Travelling there runs the arch, and
      // the arch is what hands the page back.
      if (end !== undefined) glideTo(end)
      return
    }
    if (id === 'rhythm' && horizontal.current) {
      glideTo(horizontal.current.start)
      return
    }
    const target = root.current?.querySelector<HTMLElement>(`#${id}`)
    if (target) glideTo(pageTop(target))
  }, [])

  // The dialog remembers the control that opened it and gives focus back to it.
  const showModal = (key: Modal) => setModal(key)

  const navigate = (id: string) => {
    if (modal) {
      pendingNavigation.current = id
      setModal(null)
    } else goTo(id)
  }

  const scene = (index: number) => {
    const trigger = horizontal.current
    if (trigger) {
      glideTo(trigger.start + ((trigger.end - trigger.start) * index) / 4)
      return
    }
    const target = root.current?.querySelector<HTMLElement>(`[data-scene="${index}"]`)
    if (target) glideTo(pageTop(target))
  }

  const enquire = () => showModal('enquire')

  /** "Back to reception": the way back is the arch — the page glides through it. */
  const restart = () => navigate('finale-end')

  // A panel holds the page still (through the one shared lock, so the arch
  // and the explorer can never be scrolled underneath it).
  useEffect(() => {
    if (!modal) return
    document.body.classList.add('rp-modal-open')
    lockScroll()
    return () => {
      document.body.classList.remove('rp-modal-open')
      unlockScroll()
      const id = pendingNavigation.current
      if (id) {
        pendingNavigation.current = null
        goTo(id)
      }
    }
  }, [modal, goTo])

  /**
   * True while the arrival holds the screen.
   *
   * The chapter's own furniture — the header, the progress meter, the chapter
   * index — belongs to the journey, not to its ending, and the arrival is
   * inside this chapter so that scrolling back from it retraces the amenities.
   * Watched rather than latched, so coming back up brings the interface with
   * it.
   */
  const [arrived, setArrived] = useState(false)
  useEffect(() => {
    if (!amenities) return
    const element = document.querySelector('[data-arrival-root]')
    if (!element || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => setArrived(entries.some((entry) => entry.isIntersecting)),
      { threshold: 0.12 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [amenities])

  const detail = modal === 'pool' || modal === 'wellness' ? amenityDetails[modal] : null

  return (
    <div
      className="repose-experience"
      ref={root}
      data-phase={phase}
      data-arrived={arrived || undefined}
      data-repose-root
    >
      <header className="rp-ui rp-header" aria-label="Experience navigation">
        <button className="rp-brand" onClick={() => navigate('life')} aria-label="Reposé, back to life chapter">
          <span>Reposé</span>
          <small>RESIDENCE</small>
        </button>
        <div className="rp-header-right">
          <button className="rp-menu-button" onClick={() => showModal('menu')} aria-label="Open chapters">
            <span>THE CHAPTERS</span>
            <span className="rp-menu-lines">
              <i />
              <i />
            </span>
          </button>
          <button className="rp-header-enquire" onClick={enquire}>
            ENQUIRE <span aria-hidden="true">↗</span>
          </button>
        </div>
      </header>
      <aside className="rp-ui rp-progress" aria-label="Journey progress">
        <span data-progress-count>00</span>
        <div className="rp-progress-track">
          <i data-progress-line />
        </div>
        <span className="rp-scroll-word">SCROLL</span>
        <span aria-hidden="true">↓</span>
      </aside>
      <div className="rp-ui rp-chapter-index">
        <span data-chapter-count>01</span>
        <i />
        {CHAPTER_COUNT}
      </div>

      {/* The residence chapter — reached from the reception by scrolling on,
          and the only thing in the document until its tail hands over. */}
      <ResidenceChapter />

      {/* The approved amenities journey. It is not in the document at all
          until the handover, so nothing in it is measured, decoded or
          triggered while the visitor is still in the residence. */}
      {amenities && (
      <div className="rp-main" ref={main}>
        <AmenitiesIndex assetBase={ASSET_BASE} onDiscover={() => navigate('rhythm')} />
        <HorizontalAmenities assetBase={ASSET_BASE} onScene={scene} onDetail={showModal} />
        <WaterExperience assetBase={ASSET_BASE} onDetail={showModal} />
        <TerraceExperience assetBase={ASSET_BASE} />
        <FamilyExperience />
        <InteriorExperience assetBase={ASSET_BASE} />
        <ConvenienceExperience assetBase={ASSET_BASE} />
        <ConnectednessExperience assetBase={ASSET_BASE} />
        {/* 09 — between "Your world. Within reach." and the final chapter. */}
        <AmenitiesMap />
        <FinalRepose
          assetBase={ASSET_BASE}
          onEnquire={enquire}
          onRestart={restart}
          portal={
            <ArchPortal
              active={exploring}
              host={root}
              towerSrc={TOWER_SRC}
              sources={portalSources}
              triggerRef={portal}
              onComplete={() => returnRef.current()}
            />
          }
        />
        {/*
          Slack after the arch, and nothing else.

          The arch is pinned for `innerHeight * distance` and its pin spacer
          used to end on the document's LAST PIXEL, so reaching the progress
          that hands the page back to the building meant landing exactly on
          that pixel — which a smoothed scroll settling asymptotically does not
          reliably do. The journey's only way back was a rounding error away
          from never firing.

          This is scroll room past the end of the pin, in the finale's own
          ground, so the arch completes with margin. It is never seen: the
          hand-back happens as the pin ends, which is before this scrolls up.
        */}
        <div className="rp-after" aria-hidden="true" />

        {/* The last chapter, and the end of the document. It used to be
            reached by jumping back UP to the opening's building, which is what
            made the journey a loop; it is placed here instead, so the page only
            travels forward and scrolling back retraces the way it came. */}
        <Arrival />
      </div>
      )}

      <Dialog
        open={modal !== null}
        onOpenChange={(open) => {
          if (!open) setModal(null)
        }}
      >
        <DialogContent
          data-repose-modal
          className={`rp-dialog ${modal === 'menu' ? 'rp-dialog-menu' : ''}`}
          showCloseButton={false}
        >
          <DialogClose className="rp-dialog-close" aria-label="Close panel">
            CLOSE <span aria-hidden="true">×</span>
          </DialogClose>
          {modal === 'menu' ? (
            <>
              <DialogTitle className="rp-dialog-title">The chapters.</DialogTitle>
              <DialogDescription className="rp-dialog-description">A different rhythm at Reposé Residence.</DialogDescription>
              <nav aria-label="Chapters">
                {chapters.map((chapter) => (
                  <button key={chapter.id} onClick={() => navigate(chapter.id)}>
                    <span>{chapter.number}</span>
                    <span>{chapter.name}</span>
                    <span aria-hidden="true">↗</span>
                  </button>
                ))}
              </nav>
              <span className="rp-dialog-foot">REPOSÉ RESIDENCE · AL FURJAN, DUBAI</span>
            </>
          ) : modal === 'enquire' ? (
            <>
              <span className="rp-micro">YOUR NEXT CHAPTER</span>
              <DialogTitle className="rp-dialog-title">
                Let’s talk
                <br />
                <em>about Reposé.</em>
              </DialogTitle>
              <DialogDescription className="rp-dialog-description">
                Contact SAION Properties to learn more about Reposé Residence.
              </DialogDescription>
              <div className="rp-contact-links">
                <a href={`mailto:${project.email}`}>
                  <small>EMAIL</small>
                  {project.email}
                  <span>↗</span>
                </a>
                <a href={project.phoneHref}>
                  <small>CALL</small>
                  {project.phone}
                  <span>↗</span>
                </a>
              </div>
              <span className="rp-dialog-foot">SAION PROPERTIES · AL FURJAN, DUBAI</span>
            </>
          ) : detail ? (
            <>
              <span className="rp-micro">{detail.label}</span>
              <DialogTitle className="rp-dialog-title">{detail.title}</DialogTitle>
              <Photo
                name={detail.image}
                assetBase={ASSET_BASE}
                alt={modal === 'pool' ? 'The Reposé swimming pool' : 'The Reposé yoga studio'}
                sizes="550px"
                eager
              />
              <DialogDescription className="rp-dialog-description">{detail.description}</DialogDescription>
              <span className="rp-dialog-foot">REPOSÉ RESIDENCE · THE AMENITY COLLECTION</span>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
