import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { lockScroll, unlockScroll } from '../../lib/scrollLock'
import { ArchPortal } from './ArchPortal'
import { ReposeLoader } from './ReposeLoader'
import { ASSET_BASE, DEFERRED_PHOTOS, amenityDetails, chapters, project } from './data/experience'
import type { DetailKey } from './data/experience'
import { warmPhotos } from './data/warmPhotos'
import { ScrollTrigger } from './motion/gsap'
import { glideTo, jumpTo, pageTop } from './motion/hostScroll'
import { useStoryMotion } from './motion/useStoryMotion'
import {
  ConnectednessExperience,
  ConvenienceExperience,
  FamilyExperience,
  FinalRepose,
  HorizontalAmenities,
  InteriorExperience,
  LifestyleIntro,
  Photo,
  TerraceExperience,
  WaterExperience,
} from './sections/Story'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from './ui/dialog'
import './styles/experience.css'

/** How the chapter gives the page back. */
export type ReturnReason =
  /** The arch has expanded to the building; the page already rests at the opening's end, held still. */
  | 'arch'
  /** The visitor scrolled back up out of the chapter into the building. */
  | 'scrollback'

interface Props {
  /** The chapter is finished with: take it down. */
  onReturn: (reason: ReturnReason) => void
}

type Phase = 'loading' | 'exploring'
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
 * Chapter 04 — "The art of living": the approved lifestyle journey, mounted
 * in the document after the opening chapter and entered from the reception.
 *
 * What is the approved experience's own is left alone — sections, styles,
 * motion, pacing, panels. What was standalone is not here: no reception of
 * its own (the application's reception is the reception), no Lenis of its
 * own (the application's one instance drives everything, through
 * `motion/hostScroll`), no page shell.
 *
 * On mount the loader is already covering the frame, so the page is put at
 * the chapter's top underneath it and held there until the loader has gone.
 * The chapter ends in `ArchPortal`: the arch becomes the building, the page
 * is placed at the opening's end, and `onReturn` hands the frame back.
 */
export function ReposeLifestyle({ onReturn }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const horizontal = useRef<ScrollTrigger | null>(null)
  const portal = useRef<ScrollTrigger | null>(null)
  const pendingNavigation = useRef<string | null>(null)
  const heldRef = useRef(false)

  const [phase, setPhase] = useState<Phase>('loading')
  /**
   * The loader element outlives the phase change by the length of its own last
   * fade: the chapter goes live underneath it, so the cost of building the
   * chapter's motion is paid while the frame is still covered.
   */
  const [loaderUp, setLoaderUp] = useState(true)
  /** True once the chapter's own imagery is in and the arch's may follow. */
  const [portalSources, setPortalSources] = useState(false)
  const [modal, setModal] = useState<Modal | null>(null)

  const returnRef = useRef(onReturn)
  useEffect(() => {
    returnRef.current = onReturn
  }, [onReturn])

  /* --------------------------------------------------------------- *
   * Arrival — under the loader
   * --------------------------------------------------------------- */
  useLayoutEffect(() => {
    const element = root.current
    if (!element) return

    // The chapter opens at its own beginning — the hero — every time. This is
    // the only scroll this component performs, and it is not a shortcut past
    // anything: the chapter is appended to a document that is already scrolled
    // to the end of the opening, so without it the visitor would arrive
    // mid-chapter. It runs under the loader, before it lifts.
    jumpTo(pageTop(element))
    lockScroll()
    heldRef.current = true
    // Belt and braces: the same jump once the frame has settled, still under cover.
    const frame = requestAnimationFrame(() => {
      const el = root.current
      if (el && heldRef.current) {
        unlockScroll()
        jumpTo(pageTop(el))
        lockScroll()
      }
    })
    return () => {
      cancelAnimationFrame(frame)
      if (heldRef.current) {
        heldRef.current = false
        unlockScroll()
      }
    }
  }, [])

  const complete = useCallback(() => {
    if (heldRef.current) {
      heldRef.current = false
      unlockScroll()
    }
    setPhase('exploring')
  }, [])

  const dismissLoader = useCallback(() => setLoaderUp(false), [])

  const exploring = phase === 'exploring'
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

  /* --------------------------------------------------------------- *
   * Leaving upward — back into the building the ordinary way
   * --------------------------------------------------------------- */
  useEffect(() => {
    if (!exploring || !root.current) return
    const trigger = ScrollTrigger.create({
      trigger: root.current,
      start: 'top bottom',
      onLeaveBack: () => returnRef.current('scrollback'),
    })
    return () => trigger.kill()
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
      if (end !== undefined) glideTo(end)
      else returnRef.current('scrollback')
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

  const detail = modal === 'pool' || modal === 'wellness' ? amenityDetails[modal] : null

  return (
    <div className="repose-experience" ref={root} data-phase={phase} data-repose-root>
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
        09
      </div>

      <div className="rp-main">
        <LifestyleIntro assetBase={ASSET_BASE} onDiscover={() => navigate('rhythm')} />
        <HorizontalAmenities assetBase={ASSET_BASE} onScene={scene} onDetail={showModal} />
        <WaterExperience assetBase={ASSET_BASE} onDetail={showModal} />
        <TerraceExperience assetBase={ASSET_BASE} />
        <FamilyExperience assetBase={ASSET_BASE} />
        <InteriorExperience assetBase={ASSET_BASE} />
        <ConvenienceExperience assetBase={ASSET_BASE} />
        <ConnectednessExperience assetBase={ASSET_BASE} />
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
              onComplete={() => returnRef.current('arch')}
            />
          }
        />
      </div>

      {loaderUp && <ReposeLoader assetBase={ASSET_BASE} onReveal={complete} onComplete={dismissLoader} />}

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
