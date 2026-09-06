import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import gsap from 'gsap'

import { FINAL_FRAME_STILL, FOCAL_X, FOCAL_Y } from '../../data/opening'
import { lockScroll, unlockScroll } from '../../lib/scrollLock'
import { BuildingLevelSelector } from './BuildingLevelSelector'
import { FloorplateView } from './FloorplateView'
import { ResidencePlanView } from './ResidencePlanView'
import { EXPLORER_COPY } from './floorExplorerCopy'
import { floorplateImage, logUnverifiedResidences, unitPlanImage, useFloorExplorerData } from './floorExplorerData'
import type { Level, UnitHotspot } from './floorExplorerData'
import type { LevelId } from './levelCalibration'
import { bandPx } from './levelGeometry'
import { GROUND_Y, INVITE_X, INVITE_Y, TOWER_CLIP_PATH } from './towerZone'
import { useCoverRect } from './useCoverRect'
import { resetPlanViewer } from './usePlanViewer'
import '../../styles/floor-explorer.css'

/**
 * How long the explorer waits, once the pointer has left its region, before
 * returning to the clean building. Long enough that crossing a gap or clipping
 * a corner never flickers it; short enough that leaving reads as deliberate.
 */
const HIDE_DELAY = 400

/**
 * building  → selector
 * floorplate → opening · floorplate · closing
 * residence  → openingResidence · residence · closingResidence
 */
type Mode = 'selector' | 'opening' | 'floorplate' | 'closing' | 'openingResidence' | 'residence' | 'closingResidence'

const RESIDENCE_MODES: readonly Mode[] = ['openingResidence', 'residence', 'closingResidence']

interface Props {
  /** True once the scroll hand-off has completed and the selector may take input. */
  active: boolean
  /**
   * True while another chapter has the frame (the walk into the reception).
   * The explorer stands down entirely — no pointer, no keyboard, no reveal —
   * and is put back to the clean building, so that when the frame is handed
   * back the visitor meets the building, not a selector they never asked for.
   */
  suspended?: boolean
}

const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const list = window.matchMedia(query)
    const update = () => setMatches(list.matches)
    update()
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [query])
  return matches
}

/** Drawings fetched and decoded ahead of need, keyed by URL. */
const warmed = new Map<string, Promise<void>>()
function warmImage(src: string): Promise<void> {
  let promise = warmed.get(src)
  if (!promise) {
    promise = new Promise<void>((resolve) => {
      const image = new Image()
      image.decoding = 'async'
      image.onload = () => image.decode().then(resolve, () => resolve())
      image.onerror = () => resolve()
      image.src = src
    })
    warmed.set(src, promise)
  }
  return promise
}

const settle = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

/**
 * Chapter 02 — "Explore Residences".
 *
 * Lives inside the opening chapter's sticky viewport, over the film's held
 * final frame. The opening scrubs this layer in (see `HANDOFF` in
 * `data/opening.ts`) and flips `active` once it has settled; from then on the
 * explorer owns its own state:
 *
 *   selector          the calibrated level lines and list (Phase 1)
 *   opening           the line extends, the building recedes, the plate emerges (Phase 2)
 *   floorplate        the exact supplied floorplate with its residences (Phase 3)
 *   openingResidence  the plate zooms into the chosen residence; its plan arrives
 *   residence         the exact supplied unit plan, held
 *   closingResidence  back to the floor
 *   closing           back to the building
 *
 * While a floorplate or a residence is open the page scroll is locked, so a
 * wheel over a plan never rewinds the film underneath it.
 */
export function FloorExplorer({ active, suspended = false }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const backRef = useRef<HTMLButtonElement | null>(null)
  const lastTriggerRef = useRef<HTMLElement | null>(null)

  const data = useFloorExplorerData()
  const rect = useCoverRect(rootRef, FINAL_FRAME_STILL.width, FINAL_FRAME_STILL.height, FOCAL_X, FOCAL_Y)
  const coarse = useMediaQuery('(hover: none), (pointer: coarse)')
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  const [hovered, setHovered] = useState<LevelId | null>(null)
  const [selected, setSelected] = useState<LevelId | null>(null)
  const [mode, setMode] = useState<Mode>('selector')
  const [openLevel, setOpenLevel] = useState<Level | null>(null)

  /** Residence indicated on the plate (hovered or focused), by id. */
  const [unitHovered, setUnitHovered] = useState<string | null>(null)
  /** Residence the visitor committed to (a tap on touch, or the one open), by id. */
  const [unitSelected, setUnitSelected] = useState<string | null>(null)
  const [openResidence, setOpenResidence] = useState<UnitHotspot | null>(null)
  const unitBackRef = useRef<HTMLButtonElement | null>(null)

  // Handlers guard on the mode synchronously, ahead of React's commit.
  const modeRef = useRef<Mode>('selector')
  const changeMode = useCallback((next: Mode) => {
    modeRef.current = next
    setMode(next)
  }, [])

  /* --------------------------------------------------------------- *
   * Reveal
   *
   * The film ends on the completed building and leaves it alone: no copy, no
   * level rail, no lines, nothing selected. The explorer is offered rather
   * than imposed — a pointer over the tower asks for it, a tap on the
   * invitation asks for it on touch, and a Tab into the level rail asks for
   * it from the keyboard.
   *
   * Revealing is instant; hiding is not. Once the explorer is up, the whole
   * frame above the podium keeps it up — building, copy, level rail and the
   * space between them are one region, so travelling from the tower to the
   * rail on the far right never dismisses what the visitor is travelling to.
   * Only dropping to the ground plane, or leaving the window, starts the
   * clock, and even then it is `HIDE_DELAY` before anything moves.
   * --------------------------------------------------------------- */
  const [revealed, setRevealed] = useState(false)
  const revealedRef = useRef(false)
  const hideTimer = useRef<number | null>(null)

  useEffect(() => {
    revealedRef.current = revealed
  }, [revealed])

  const cancelHide = useCallback(() => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
  }, [])

  const reveal = useCallback(() => {
    cancelHide()
    setRevealed(true)
  }, [cancelHide])

  const scheduleHide = useCallback(() => {
    // A touch pointer has no "away": it stops existing the moment the finger
    // lifts, which would otherwise retire the explorer the instant it was
    // asked for. On touch the explorer stays until a plan opens or the
    // visitor scrolls back into the film.
    if (coarse || !revealedRef.current || modeRef.current !== 'selector') return
    cancelHide()
    hideTimer.current = window.setTimeout(() => {
      hideTimer.current = null
      // A plan opened while the clock was running: the explorer is in use.
      if (modeRef.current !== 'selector') return
      setRevealed(false)
      setHovered(null)
      // Back to clean means clean: no line, and no level still marked.
      setSelected(null)
    }, HIDE_DELAY)
  }, [coarse, cancelHide])

  useEffect(() => cancelHide, [cancelHide])

  // Leaving the explorer (scrolling back into the film) drops any hover so a
  // stale line never greets the visitor on return, and puts the building back
  // to clean so the next arrival is the same as the first.
  const [wasActive, setWasActive] = useState(active)
  if (wasActive !== active) {
    setWasActive(active)
    if (!active) {
      setHovered(null)
      setRevealed(false)
    }
  }

  // Standing down for another chapter is the same: back to clean, at once.
  const [wasSuspended, setWasSuspended] = useState(suspended)
  if (wasSuspended !== suspended) {
    setWasSuspended(suspended)
    if (suspended) {
      setHovered(null)
      setSelected(null)
      setRevealed(false)
    }
  }

  const frozen = mode !== 'selector'
  const shown: LevelId | null =
    !active ? null : frozen ? (openLevel?.id ?? null) : revealed ? (hovered ?? selected) : null

  /**
   * The ground plane in viewport pixels — below the tower's base, and never
   * higher than the bottom fifth of the screen, so a tall crop can't push it
   * up into the level rail.
   */
  const groundTop = Math.max(rect.y + (rect.height * GROUND_Y) / 100, rect.containerHeight * 0.8)

  const onRootPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (coarse || !revealedRef.current || modeRef.current !== 'selector') return
      if (event.clientY >= groundTop) scheduleHide()
      else cancelHide()
    },
    [coarse, groundTop, scheduleHide, cancelHide],
  )

  const inResidence = RESIDENCE_MODES.includes(mode)
  const shownUnit: string | null = inResidence
    ? (openResidence?.residence.id ?? null)
    : mode === 'floorplate'
      ? (unitHovered ?? unitSelected)
      : null

  /* --------------------------------------------------------------- *
   * Readiness
   * --------------------------------------------------------------- */

  // Once the explorer is live, quietly fetch every unique floorplate so a
  // click never waits on the network. Eight files; they share a cache with
  // the <img> that eventually shows them.
  useEffect(() => {
    if (!active || data.status !== 'ready') return
    const plates = data.model.floorplates.map(floorplateImage)
    let cancelled = false
    const run = async () => {
      for (const src of plates) {
        if (cancelled) return
        await warmImage(src)
      }
    }
    const idle = window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 400))
    const handle = idle(() => void run())
    return () => {
      cancelled = true
      if (window.cancelIdleCallback) window.cancelIdleCallback(handle as number)
      else window.clearTimeout(handle as number)
    }
  }, [active, data])

  useEffect(() => {
    if (data.status === 'error') console.error('Floor explorer: package data failed to load', data.error)
    if (data.status === 'ready') logUnverifiedResidences(data.model)
  }, [data])

  /* --------------------------------------------------------------- *
   * Phase 2 — open
   * --------------------------------------------------------------- */
  const open = useCallback(
    (level: Level) => {
      const root = rootRef.current
      if (!root || modeRef.current !== 'selector' || rect.width === 0) return

      lastTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      changeMode('opening')
      setOpenLevel(level)
      setSelected(level.id)
      setHovered(null)
      setUnitHovered(null)
      setUnitSelected(null)
      lockScroll()

      const band = bandPx(level.id, rect)
      const q = (selector: string) => root.querySelector<HTMLElement>(selector)
      const line = q('[data-fx-line]')
      const tag = q('[data-fx-tag]')
      const dim = q('[data-fx-dim]')
      const stage = q('[data-fx-stage]')
      const copy = q('[data-fx-copy]')
      const list = q('[data-fx-list]')
      const hits = q('[data-fx-hits]')
      const area = q('[data-fx-plate-area]')
      const figure = q('[data-fx-plate-figure]')
      const head = q('[data-fx-plate-head]')
      if (!line || !tag || !dim || !stage || !copy || !list || !hits || !area || !figure || !head) return

      // The hover tweens on these must not finish underneath the transition.
      gsap.killTweensOf([line, tag, dim])

      const timeline = gsap.timeline({
        defaults: { ease: 'power3.inOut' },
        onComplete: () => {
          changeMode('floorplate')
          backRef.current?.focus({ preventScroll: true })
        },
      })
      // Phones get the same choreography, a touch brisker.
      timeline.timeScale(coarse ? 1.3 : 1)

      if (reducedMotion) {
        timeline
          .to([copy, list, hits, dim, tag, line], { opacity: 0, duration: 0.3 }, 0)
          .to(stage, { opacity: 0.16, duration: 0.4 }, 0)
          .fromTo(figure, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.2)
          .fromTo(head, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.3)
        return
      }

      // 1. The chosen line reaches across the whole frame. Its y is restated so
      //    a line still gliding from a previous hover settles on this level.
      timeline
        .to(line, { x: 0, y: band.lineY, scaleX: 1, opacity: 1, duration: 0.95 }, 0)
        .to(tag, { opacity: 0, duration: 0.3, ease: 'power2.out' }, 0)
        .to(copy, { opacity: 0, y: -10, duration: 0.55, ease: 'power2.in' }, 0.05)
        .to(list, { opacity: 0, x: 10, duration: 0.55, ease: 'power2.in' }, 0.05)
        .to(hits, { opacity: 0, duration: 0.3 }, 0)
        .to(dim, { opacity: 0, duration: 0.6, ease: 'power2.out' }, 0.15)

      // 2. The building steps back.
      timeline.to(stage, { scale: 1.045, opacity: 0.16, duration: 1.5, ease: 'power2.inOut' }, 0.35)

      // 3. The floorplate emerges from the line and grows into the frame.
      // The plate is centred in its area, so the area's centre is its centre
      // whatever size the plate settles at once its image has loaded.
      const areaBox = area.getBoundingClientRect()
      const rootBox = root.getBoundingClientRect()
      const figureCentre = areaBox.top - rootBox.top + areaBox.height / 2
      const fromLine = band.lineY - figureCentre

      const reveal = () => {
        const at = Math.max(0.55, timeline.time())
        timeline
          .fromTo(
            figure,
            { clipPath: 'inset(50% 0% 50% 0%)', y: fromLine, scale: 0.94, opacity: 1 },
            // The clip is lifted once it has opened: the drawing may then be
            // zoomed past the figure's box, clipped by the area instead.
            { clipPath: 'inset(0% 0% 0% 0%)', y: 0, scale: 1, duration: 1.3, ease: 'expo.out', clearProps: 'clipPath' },
            at,
          )
          .to(line, { opacity: 0, duration: 0.5, ease: 'power2.out' }, at + 0.25)
          .fromTo(head, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.85, ease: 'power3.out' }, at + 0.45)
      }

      // The plate must be decoded before it can emerge cleanly; it usually is.
      const ready = Promise.race([warmImage(floorplateImage(level.floorplate)), settle(900)])
      timeline.addPause(0.55)
      void ready.then(() => {
        reveal()
        timeline.removePause(0.55)
        if (timeline.paused()) timeline.play()
      })
    },
    [rect, reducedMotion, coarse, changeMode],
  )

  /* --------------------------------------------------------------- *
   * Phase 2, reversed — back to the building
   * --------------------------------------------------------------- */
  const close = useCallback(() => {
    const root = rootRef.current
    const level = openLevel
    if (!root || !level || modeRef.current !== 'floorplate') return
    changeMode('closing')

    const band = bandPx(level.id, rect)
    const q = (selector: string) => root.querySelector<HTMLElement>(selector)
    const line = q('[data-fx-line]')
    const tag = q('[data-fx-tag]')
    const dim = q('[data-fx-dim]')
    const stage = q('[data-fx-stage]')
    const copy = q('[data-fx-copy]')
    const list = q('[data-fx-list]')
    const hits = q('[data-fx-hits]')
    const area = q('[data-fx-plate-area]')
    const figure = q('[data-fx-plate-figure]')
    const head = q('[data-fx-plate-head]')
    if (!line || !tag || !dim || !stage || !copy || !list || !hits || !area || !figure || !head) return

    gsap.killTweensOf([line, tag, dim, head, figure])

    const finish = () => {
      changeMode('selector')
      setOpenLevel(null)
      unlockScroll()
      const trigger = lastTriggerRef.current
      if (trigger && root.contains(trigger)) trigger.focus({ preventScroll: true })
    }

    const timeline = gsap.timeline({ defaults: { ease: 'power3.inOut' }, onComplete: finish })
    timeline.timeScale(coarse ? 1.3 : 1)

    if (reducedMotion) {
      resetPlanViewer(area)
      timeline
        .to([head, figure], { opacity: 0, duration: 0.3 }, 0)
        .to(stage, { opacity: 1, duration: 0.4 }, 0.1)
        .to([copy, list, hits, dim, tag, line], { opacity: 1, duration: 0.3, clearProps: 'x,y' }, 0.2)
      return
    }

    const areaBox = area.getBoundingClientRect()
    const rootBox = root.getBoundingClientRect()
    const figureCentre = areaBox.top - rootBox.top + areaBox.height / 2
    const toLine = band.lineY - figureCentre

    // Whatever the visitor zoomed into settles back to the fit as the plan
    // folds; the clip it folds under starts from the open state it was left in.
    resetPlanViewer(area, true)
    gsap.set(figure, { clipPath: 'inset(0% 0% 0% 0%)' })

    timeline
      // The plan folds back into the line it came from.
      .to(head, { opacity: 0, y: 8, duration: 0.35, ease: 'power2.in' }, 0)
      .to(figure, { clipPath: 'inset(50% 0% 50% 0%)', y: toLine, scale: 0.94, duration: 0.85, ease: 'expo.in' }, 0.05)
      .to(line, { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0.6)
      // The building comes forward again.
      .to(stage, { scale: 1, opacity: 1, duration: 1.15, ease: 'power2.inOut' }, 0.55)
      // The line retracts to its floor.
      .to(line, { x: band.x0, y: band.lineY, scaleX: (band.x1 - band.x0) / rect.containerWidth, duration: 0.9 }, 0.85)
      .to(dim, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 1.2)
      .to(copy, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 1.3)
      .to(list, { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out' }, 1.3)
      .to(hits, { opacity: 1, duration: 0.3 }, 1.3)
      .to(tag, { opacity: 1, duration: 0.4, ease: 'power2.out' }, 1.5)
  }, [openLevel, rect, reducedMotion, coarse, changeMode])

  /* --------------------------------------------------------------- *
   * Residence — open
   * --------------------------------------------------------------- */
  const openUnit = useCallback(
    (hotspot: UnitHotspot) => {
      const root = rootRef.current
      const plan = unitPlanImage(hotspot)
      if (!root || modeRef.current !== 'floorplate' || !plan) return

      lastTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      changeMode('openingResidence')
      setOpenResidence(hotspot)
      setUnitSelected(hotspot.residence.id)
      setUnitHovered(null)

      const q = (selector: string) => root.querySelector<HTMLElement>(selector)
      const plateArea = q('[data-fx-plate-area]')
      const plateFigure = q('[data-fx-plate-figure]')
      const plateHead = q('[data-fx-plate-head]')
      const resFigure = q('[data-fx-res-figure]')
      const resHead = q('[data-fx-res-head]')
      if (!plateArea || !plateFigure || !plateHead || !resFigure || !resHead) return

      gsap.killTweensOf([plateFigure, plateHead, resFigure, resHead])

      const timeline = gsap.timeline({
        defaults: { ease: 'power3.inOut' },
        onComplete: () => {
          changeMode('residence')
          unitBackRef.current?.focus({ preventScroll: true })
        },
      })
      timeline.timeScale(coarse ? 1.3 : 1)

      if (reducedMotion) {
        timeline
          .to(plateHead, { opacity: 0, duration: 0.3 }, 0)
          .to(plateFigure, { opacity: 0, duration: 0.4 }, 0)
          .fromTo(resFigure, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.25)
          .fromTo(resHead, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.35)
        return
      }

      // The plate closes in on the chosen residence: everything else has
      // already rested (the layer's focus state), the outline holds, and the
      // drawing grows around the residence's own centre until the unit plan
      // takes over. The residence's centre is a point of the drawing, which
      // the viewer may have zoomed and panned inside the figure — so it is
      // read back through the drawing's wrapper into the figure's own box.
      const [cx, cy] = hotspot.labelAt
      const drawing = plateFigure.querySelector<HTMLElement>('[data-fx-zoom]')?.getBoundingClientRect()
      const figureBox = plateFigure.getBoundingClientRect()
      const zoom = drawing && figureBox.width ? drawing.width / figureBox.width : 1
      if (drawing && figureBox.width && figureBox.height) {
        const ox = ((drawing.left + (drawing.width * cx) / 100 - figureBox.left) / figureBox.width) * 100
        const oy = ((drawing.top + (drawing.height * cy) / 100 - figureBox.top) / figureBox.height) * 100
        plateFigure.style.transformOrigin = `${ox}% ${oy}%`
      } else {
        plateFigure.style.transformOrigin = `${cx}% ${cy}%`
      }
      // Already close in? Then a quieter lift.
      const grow = zoom > 1.6 ? 1.35 : 2.3

      timeline
        .to(plateHead, { opacity: 0, y: -8, duration: 0.4, ease: 'power2.in' }, 0)
        .to(plateFigure, { scale: grow, opacity: 0, duration: 1.05, ease: 'power2.inOut' }, 0.12)

      const reveal = () => {
        const at = Math.max(0.5, timeline.time())
        timeline
          .fromTo(
            resFigure,
            { opacity: 0, scale: 0.92, y: 22 },
            { opacity: 1, scale: 1, y: 0, duration: 1.1, ease: 'expo.out' },
            at,
          )
          .fromTo(resHead, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.85, ease: 'power3.out' }, at + 0.15)
      }

      const ready = Promise.race([warmImage(plan), settle(900)])
      timeline.addPause(0.5)
      void ready.then(() => {
        reveal()
        timeline.removePause(0.5)
        if (timeline.paused()) timeline.play()
      })
    },
    [reducedMotion, coarse, changeMode],
  )

  /* --------------------------------------------------------------- *
   * Residence — back to the floor
   * --------------------------------------------------------------- */
  const closeUnit = useCallback(() => {
    const root = rootRef.current
    if (!root || modeRef.current !== 'residence') return
    changeMode('closingResidence')

    const q = (selector: string) => root.querySelector<HTMLElement>(selector)
    const plateFigure = q('[data-fx-plate-figure]')
    const plateHead = q('[data-fx-plate-head]')
    const resFigure = q('[data-fx-res-figure]')
    const resHead = q('[data-fx-res-head]')
    if (!plateFigure || !plateHead || !resFigure || !resHead) return

    gsap.killTweensOf([plateFigure, plateHead, resFigure, resHead])

    const finish = () => {
      changeMode('floorplate')
      setOpenResidence(null)
      plateFigure.style.transformOrigin = ''
      // The next residence opens at its fit, not where this one was left.
      resetPlanViewer(resFigure)
      const trigger = lastTriggerRef.current
      if (trigger && root.contains(trigger)) trigger.focus({ preventScroll: true })
      else backRef.current?.focus({ preventScroll: true })
    }

    const timeline = gsap.timeline({ defaults: { ease: 'power3.inOut' }, onComplete: finish })
    timeline.timeScale(coarse ? 1.3 : 1)

    if (reducedMotion) {
      timeline
        .to([resHead, resFigure], { opacity: 0, duration: 0.3 }, 0)
        .to(plateFigure, { opacity: 1, scale: 1, duration: 0.4 }, 0.2)
        .to(plateHead, { opacity: 1, y: 0, duration: 0.3 }, 0.3)
      return
    }

    timeline
      .to(resHead, { opacity: 0, y: 8, duration: 0.35, ease: 'power2.in' }, 0)
      .to(resFigure, { opacity: 0, scale: 0.94, y: 12, duration: 0.6, ease: 'power2.in' }, 0.05)
      // The floor comes back out around the residence it went into.
      .to(plateFigure, { scale: 1, opacity: 1, duration: 1.0, ease: 'power2.inOut' }, 0.35)
      .to(plateHead, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 0.75)
  }, [reducedMotion, coarse, changeMode])

  // Escape steps back one level: residence → floor, floor → building.
  useEffect(() => {
    if (mode !== 'floorplate' && mode !== 'residence') return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (mode === 'residence') closeUnit()
      else close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, close, closeUnit])

  // Never leave the page locked if the chapter unmounts mid-view.
  useEffect(
    () => () => {
      if (modeRef.current !== 'selector') unlockScroll()
    },
    [],
  )

  /* --------------------------------------------------------------- *
   * Residence selection
   * --------------------------------------------------------------- */
  const chooseUnit = useCallback(
    (hotspot: UnitHotspot) => {
      if (modeRef.current !== 'floorplate') return
      const plan = unitPlanImage(hotspot)
      if (plan) void warmImage(plan)
      if (coarse && unitSelected !== hotspot.residence.id) {
        // First tap indicates; the readout offers the plan, a second tap opens it.
        setUnitSelected(hotspot.residence.id)
        return
      }
      if (!hotspot.plan) {
        // Unverified mapping: indicate and read out, never open.
        setUnitSelected(hotspot.residence.id)
        return
      }
      openUnit(hotspot)
    },
    [coarse, unitSelected, openUnit],
  )

  const hoverUnit = useCallback(
    (id: string | null) => {
      setUnitHovered(id)
      // Hover intent: have the plan decoded before it is asked for.
      const hotspot = id ? openLevel?.floorplate.hotspots.find((candidate) => candidate.residence.id === id) : null
      const plan = hotspot ? unitPlanImage(hotspot) : null
      if (plan) void warmImage(plan)
    },
    [openLevel],
  )

  /* --------------------------------------------------------------- *
   * Selection
   * --------------------------------------------------------------- */
  const choose = useCallback(
    (level: Level) => {
      if (!active) return
      if (coarse && selected !== level.id) {
        // First tap indicates; the readout offers the plan, a second tap opens it.
        setSelected(level.id)
        void warmImage(floorplateImage(level.floorplate))
        return
      }
      open(level)
    },
    [active, coarse, selected, open],
  )

  const prefetch = useCallback((level: Level) => void warmImage(floorplateImage(level.floorplate)), [])

  return (
    <div
      className="fx"
      ref={rootRef}
      data-fx-root
      data-active={active || undefined}
      data-mode={mode}
      data-revealed={revealed || undefined}
      data-suspended={suspended || undefined}
      inert={suspended || undefined}
      aria-hidden={!active || suspended}
      onPointerMove={onRootPointerMove}
      onPointerLeave={scheduleHide}
      onPointerEnter={cancelHide}
    >
      {/* The held final frame, painted exactly where the film painted it. */}
      <div
        className="fx__stage"
        data-fx-stage
        style={{ left: rect.x, top: rect.y, width: rect.width || '100%', height: rect.height || '100%' }}
      >
        <img
          className="fx__building"
          src={FINAL_FRAME_STILL.src}
          width={FINAL_FRAME_STILL.width}
          height={FINAL_FRAME_STILL.height}
          alt="Reposé Residence, completed"
          decoding="async"
          draggable={false}
        />
      </div>

      {/* The residential tower, and only it: the calibrated envelope clips the
          zone's hit-testing as well as its paint, so the sky, the podium, the
          entrance and the streetscape are all outside it. Armed only while
          the building is clean — once the explorer is up the level bands take
          over the same pixels. */}
      <div
        className="fx__tower"
        data-fx-tower
        aria-hidden="true"
        style={{
          left: rect.x,
          top: rect.y,
          width: rect.width || '100%',
          height: rect.height || '100%',
          clipPath: TOWER_CLIP_PATH,
        }}
        onPointerEnter={reveal}
        onClick={reveal}
      />

      {/* Touch has no hover to offer, so it is offered a control instead. */}
      {coarse && (
        <button
          type="button"
          className="fx__invite"
          data-fx-invite
          style={{
            left: rect.x + (rect.width * INVITE_X) / 100,
            top: rect.y + (rect.height * INVITE_Y) / 100,
          }}
          onClick={reveal}
        >
          <span className="fx__invite-label">{EXPLORER_COPY.invite}</span>
          <span className="fx__invite-arrow" aria-hidden="true">
            →
          </span>
        </button>
      )}

      <BuildingLevelSelector
        model={data.model}
        rect={rect}
        shown={shown}
        selected={selected}
        frozen={frozen || !active}
        revealed={revealed}
        coarse={coarse}
        reducedMotion={reducedMotion}
        onHover={setHovered}
        onChoose={choose}
        onPrefetch={prefetch}
        onReveal={reveal}
      />

      <FloorplateView
        level={openLevel}
        shownUnit={shownUnit}
        selectedUnit={unitSelected}
        residenceFocus={inResidence}
        interactive={mode === 'floorplate'}
        coarse={coarse}
        onUnitHover={hoverUnit}
        onUnitChoose={chooseUnit}
        onBack={close}
        ref={backRef}
      />

      <ResidencePlanView
        level={openLevel}
        hotspot={openResidence}
        interactive={mode === 'residence'}
        onBack={closeUnit}
        ref={unitBackRef}
      />
    </div>
  )
}
