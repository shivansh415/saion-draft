import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import gsap from 'gsap'

import type { CoverRect } from './useCoverRect'
import type { LevelId } from './levelCalibration'
import { bandPx } from './levelGeometry'
import { isTerrace, markerBandPx, terraceBandPx, TERRACE_ENABLED, TERRACE_ID } from './terraceZone'
import type { Marker } from './terraceZone'
import { EXPLORER_COPY as COPY, TERRACE_COPY } from './floorExplorerCopy'
import { formatResidenceTypes } from './floorExplorerData'
import type { FloorExplorerModel, Level } from './floorExplorerData'

interface Props {
  /** Null until the package JSON has loaded; the shell renders regardless so the hand-off can find it. */
  model: FloorExplorerModel | null
  rect: CoverRect
  /** What is currently indicated on the building — a level, or the terrace above them. */
  shown: Marker | null
  /** What the visitor has committed to (tap on touch, last opened on desktop). */
  selected: Marker | null
  /** True while a transition or the floorplate view owns the overlay. */
  frozen: boolean
  /** True once the visitor has asked for the explorer; false = clean building. */
  revealed: boolean
  /** Coarse pointer: no hover, a first tap selects, a second opens. */
  coarse: boolean
  reducedMotion: boolean
  onHover: (level: LevelId | null) => void
  onChoose: (level: Level) => void
  onPrefetch: (level: Level) => void
  /**
   * The terrace, above Level 15. It is indicated, warmed and opened the same
   * way a level is, so the rail and the building need no second vocabulary —
   * only these three, because it is not one of `model.levels`.
   */
  onTerraceHover: (hovered: boolean) => void
  onTerraceChoose: () => void
  onTerracePrefetch: () => void
  /** Reaching the rail by keyboard asks for the explorer too. */
  onReveal: () => void
}

/**
 * Phase 1 — the selector.
 *
 * Left: the chapter's copy and a live readout of the indicated level.
 * Centre: a calibrated hairline on the building's floor slab, a soft mask that
 * rests the rest of the tower, and invisible hit-zones one per level.
 * Right: the vertical level list.
 *
 * Positions come from `levelCalibration.ts` via `bandPx`; nothing here knows
 * where a floor is.
 */
export function BuildingLevelSelector({
  model,
  rect,
  shown,
  selected,
  frozen,
  revealed,
  coarse,
  reducedMotion,
  onHover,
  onChoose,
  onPrefetch,
  onTerraceHover,
  onTerraceChoose,
  onTerracePrefetch,
  onReveal,
}: Props) {
  const lineRef = useRef<HTMLDivElement | null>(null)
  const tagRef = useRef<HTMLDivElement | null>(null)
  const dimRef = useRef<HTMLDivElement | null>(null)
  const readoutRef = useRef<HTMLDivElement | null>(null)
  const uiRef = useRef<HTMLDivElement | null>(null)
  const scrimRef = useRef<HTMLDivElement | null>(null)

  /** Whether the line is currently on screen, so a first appearance fades in place. */
  const lineShownRef = useRef(false)
  const dimState = useRef({ top: 0, bottom: 0 })

  // The readout keeps the last level it showed while it fades, so it never
  // empties mid-animation.
  const [lastShown, setLastShown] = useState<Marker | null>(null)
  if (shown && shown !== lastShown) setLastShown(shown)
  const readoutId = shown ?? lastShown
  // The guard call is kept whole and separate from the flag: `isTerrace` is a
  // type predicate, and folding the flag into it turns the result into a plain
  // boolean, which stops `readoutId` narrowing to a LevelId on the next line.
  const readoutIsTerrace = isTerrace(readoutId)
  const terraceReadout = TERRACE_ENABLED && readoutIsTerrace
  const readoutLevel = readoutId && !readoutIsTerrace && model ? (model.byId.get(readoutId) ?? null) : null
  const levels = model?.levels ?? []
  const terraceSelected = TERRACE_ENABLED && isTerrace(selected)

  /* --------------------------------------------------------------- *
   * Reveal — the explorer arrives, or retires
   *
   * This owns the GROUP (`[data-fx-ui]`) and the elements INSIDE the copy and
   * the rail; the opening's hand-off and the floorplate transitions own
   * `[data-fx-copy]` and `[data-fx-list]` themselves. Nothing is animated
   * from two places, so the group's opacity and the transition's opacity
   * simply multiply and neither has to know about the other.
   * --------------------------------------------------------------- */
  useEffect(() => {
    const ui = uiRef.current
    const scrim = scrimRef.current
    if (!ui || !scrim) return

    // The rail is empty until the package JSON lands, so both lists are read
    // fresh here and each tween is skipped while its list is.
    const lines = Array.from(ui.querySelectorAll<HTMLElement>('[data-fx-reveal]'))
    const rows = Array.from(ui.querySelectorAll<HTMLElement>('[data-fx-reveal-level]'))
    gsap.killTweensOf([ui, scrim, ...lines, ...rows])

    if (reducedMotion) {
      gsap.set([ui, scrim], { opacity: revealed ? 1 : 0 })
      if (lines.length + rows.length) {
        gsap.set([...lines, ...rows], { opacity: revealed ? 1 : 0, x: 0, y: 0 })
      }
      return
    }

    const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } })

    if (revealed) {
      // The grade settles first, then the type, then the rail counts itself in.
      timeline
        .to(scrim, { opacity: 1, duration: 0.75, ease: 'power2.out' }, 0)
        .to(ui, { opacity: 1, duration: 0.3 }, 0)
      if (lines.length) {
        timeline.fromTo(lines, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.85, stagger: 0.07 }, 0.06)
      }
      if (rows.length) {
        timeline.fromTo(rows, { opacity: 0, x: 16 }, { opacity: 1, x: 0, duration: 0.55, stagger: 0.026 }, 0.2)
      }
    } else {
      if (rows.length) {
        timeline.to(rows, { opacity: 0, x: 10, duration: 0.28, ease: 'power2.in', stagger: 0.012 }, 0)
      }
      if (lines.length) {
        timeline.to(lines, { opacity: 0, y: 12, duration: 0.32, ease: 'power2.in', stagger: 0.02 }, 0)
      }
      timeline.to(ui, { opacity: 0, duration: 0.3 }, 0.14).to(scrim, { opacity: 0, duration: 0.6, ease: 'power2.out' }, 0.06)
    }

    return () => {
      timeline.kill()
    }
  }, [revealed, reducedMotion, levels.length])

  /* --------------------------------------------------------------- *
   * Line, tag and mask follow the indicated level
   * --------------------------------------------------------------- */
  useEffect(() => {
    if (frozen || rect.width === 0) return
    const line = lineRef.current
    const tag = tagRef.current
    const dim = dimRef.current
    const readout = readoutRef.current
    if (!line || !tag || !dim || !readout) return

    const rootWidth = rect.containerWidth
    const fast = reducedMotion ? 0 : 0.55
    const ease = 'power3.out'

    if (!shown) {
      lineShownRef.current = false
      gsap.to([line, tag], { opacity: 0, duration: reducedMotion ? 0 : 0.35, ease: 'power2.out', overwrite: 'auto' })
      gsap.to(dim, { opacity: 0, duration: reducedMotion ? 0 : 0.45, ease: 'power2.out', overwrite: 'auto' })
      gsap.to(readout, { opacity: 0, y: 6, duration: reducedMotion ? 0 : 0.3, ease: 'power2.out', overwrite: 'auto' })
      return
    }

    const band = markerBandPx(shown, rect)
    const scaleX = (band.x1 - band.x0) / rootWidth
    const arriving = !lineShownRef.current
    lineShownRef.current = true

    // A line that was hidden appears in place; a visible one glides.
    const move = { x: band.x0, y: band.lineY, scaleX, duration: arriving ? 0 : fast, ease, overwrite: 'auto' as const }
    gsap.to(line, move)
    gsap.to(tag, { x: band.x0 - 14, y: band.lineY, xPercent: -100, yPercent: -50, duration: arriving ? 0 : fast, ease, overwrite: 'auto' })
    gsap.to([line, tag], { opacity: 1, duration: reducedMotion ? 0 : 0.5, ease: 'power2.out', delay: arriving ? 0.02 : 0 })

    const state = dimState.current
    if (arriving) {
      state.top = band.topY
      state.bottom = band.lineY
    }
    gsap.to(state, {
      top: band.topY,
      bottom: band.lineY,
      duration: arriving ? 0 : fast,
      ease,
      overwrite: 'auto',
      onUpdate: () => {
        dim.style.setProperty('--fx-band-top', `${state.top}px`)
        dim.style.setProperty('--fx-band-bottom', `${state.bottom}px`)
      },
    })
    dim.style.setProperty('--fx-band-top', `${state.top}px`)
    dim.style.setProperty('--fx-band-bottom', `${state.bottom}px`)
    gsap.to(dim, { opacity: 1, duration: reducedMotion ? 0 : 0.6, ease: 'power2.out', overwrite: 'auto' })

    gsap.fromTo(
      readout,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: reducedMotion ? 0 : 0.45, ease: 'power3.out', overwrite: 'auto' },
    )
  }, [shown, rect, frozen, reducedMotion])

  /* --------------------------------------------------------------- *
   * Pointer intent — a short grace period so moving between rows never
   * flickers the line off and on.
   * --------------------------------------------------------------- */
  const leaveTimer = useRef<number | null>(null)
  const enter = (level: Level) => {
    if (coarse) return
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current)
    leaveTimer.current = null
    onTerraceHover(false)
    onPrefetch(level)
    onHover(level.id)
  }
  const leave = () => {
    if (coarse) return
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current)
    leaveTimer.current = window.setTimeout(() => {
      onHover(null)
      onTerraceHover(false)
    }, 140)
  }

  // The terrace is indicated exactly as a level is — the same grace period,
  // the same warming on intent — but it is not one of `model.levels`, so it
  // travels its own three callbacks rather than a `Level`.
  const enterTerrace = () => {
    if (coarse) return
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current)
    leaveTimer.current = null
    onHover(null)
    onTerracePrefetch()
    onTerraceHover(true)
  }
  const chooseTerrace = () => {
    if (frozen) return
    onTerraceChoose()
  }
  useEffect(
    () => () => {
      if (leaveTimer.current) window.clearTimeout(leaveTimer.current)
    },
    [],
  )

  const choose = (level: Level) => {
    if (frozen) return
    onChoose(level)
  }

  const rootWidth = rect.containerWidth

  // Both anchors the cue can hang from — beside the crown on a wide frame,
  // above it on a narrow one — as custom properties, so the choice between
  // them is the stylesheet's. Kept on screen the way the amenities cue is:
  // a crop that takes the crown off the top must not take the way in with it.
  const crown = terraceBandPx(rect)
  const terraceCueStyle = {
    '--fx-terrace-x': `${crown.x1}px`,
    '--fx-terrace-cx': `${(crown.x0 + crown.x1) / 2}px`,
    // The crown can sit at the very top of a tall crop, or off it. Both
    // anchors are held far enough down for the cue to stay whole and in
    // reach — the same concession the amenities cue makes at the margins.
    '--fx-terrace-y': `${Math.max(crown.topY + (crown.lineY - crown.topY) / 2, 56)}px`,
    '--fx-terrace-top': `${Math.max(crown.topY, 72)}px`,
  } as CSSProperties

  return (
    <>
      {/* Rest for every level but the indicated one. */}
      <div className="fx__dim" ref={dimRef} data-fx-dim aria-hidden="true" />

      <div className="fx__scrim" ref={scrimRef} data-fx-scrim aria-hidden="true" />

      {/* Hit-zones: one per calibrated band, in the still's own pixels. */}
      <div className="fx__hits" data-fx-hits>
        {rect.width > 0 &&
          levels.map((level) => {
            const band = bandPx(level.id, rect)
            const pad = rect.width * 0.02
            return (
              <button
                key={level.id}
                type="button"
                className="fx-hit"
                tabIndex={-1}
                aria-hidden="true"
                data-level={level.id}
                style={{
                  top: band.topY,
                  height: band.lineY - band.topY,
                  left: band.x0 - pad,
                  width: band.x1 - band.x0 + pad * 2,
                }}
                onPointerEnter={() => enter(level)}
                onPointerLeave={leave}
                onClick={() => choose(level)}
              />
            )
          })}

        {/* Above Level 15: the crown on the roof slab — the terrace's mark on
            the building. Same hit-zone as a level band, at the band the
            terrace owns (see `terraceZone.ts`). */}
        {TERRACE_ENABLED &&
          rect.width > 0 &&
          (() => {
            const band = terraceBandPx(rect)
            const pad = rect.width * 0.02
            return (
              <button
                type="button"
                className="fx-hit"
                tabIndex={-1}
                aria-hidden="true"
                data-level={TERRACE_ID}
                style={{
                  top: band.topY,
                  height: Math.max(0, band.lineY - band.topY),
                  left: band.x0 - pad,
                  width: band.x1 - band.x0 + pad * 2,
                }}
                onPointerEnter={enterTerrace}
                onPointerLeave={leave}
                onClick={chooseTerrace}
              />
            )
          })()}
      </div>

      {/* The calibrated floor line and its level tag. */}
      <div className="fx__line" ref={lineRef} data-fx-line aria-hidden="true" style={{ width: rootWidth || '100%' }} />
      <div className="fx__tag" ref={tagRef} data-fx-tag aria-hidden="true">
        {terraceReadout ? TERRACE_COPY.rail : (readoutLevel?.id ?? '')}
      </div>

      {/* Everything the reveal brings with it, in one group. Tabbing into the
          rail from the keyboard asks for the explorer the way a pointer over
          the tower does. */}
      <div className="fx__ui" ref={uiRef} data-fx-ui onFocusCapture={onReveal}>
        {/* Left: chapter copy and the live readout. The outer element only
            positions; GSAP animates the inner one, so the two never contend. */}
        <div className="fx__copy">
          <div className="fx__copy-inner" data-fx-copy>
            <h2 className="fx__title">
              {COPY.title.map((line) => (
                <span className="fx__title-line" data-fx-reveal key={line}>
                  {line}
                </span>
              ))}
            </h2>
            <div className="fx__rule" data-fx-reveal />
            <p className="fx__lead" data-fx-reveal>
              {COPY.lead}
            </p>

            <div className="fx__readout" ref={readoutRef} aria-live="polite">
              {terraceReadout && (
                <>
                  <span className="fx__readout-level">{TERRACE_COPY.label}</span>
                  <span className="fx__readout-types">{TERRACE_COPY.types}</span>
                  {coarse && terraceSelected && (
                    <button type="button" className="fx__open" onClick={chooseTerrace}>
                      <span className="fx__open-rule" />
                      {TERRACE_COPY.open}
                    </button>
                  )}
                </>
              )}
              {readoutLevel && (
                <>
                  <span className="fx__readout-level">{readoutLevel.label}</span>
                  <span className="fx__readout-types">{formatResidenceTypes(readoutLevel.residenceTypes)}</span>
                  {coarse && selected === readoutLevel.id && (
                    <button type="button" className="fx__open" onClick={() => choose(readoutLevel)}>
                      <span className="fx__open-rule" />
                      {COPY.open}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: the level list. */}
        <nav className="fx__list" aria-label="Levels">
          <ol data-fx-list>
            {/* Above the last residential level, and marked as its own kind of
                destination rather than as a sixteenth floor. Off in production
                — see `terraceZone.TERRACE_ENABLED`. */}
            {TERRACE_ENABLED && (
            <li>
              <button
                type="button"
                className={`fx-level fx-level--terrace${terraceReadout && shown ? ' is-shown' : ''}${
                  terraceSelected ? ' is-selected' : ''
                }`}
                data-fx-reveal-level
                data-level={TERRACE_ID}
                aria-pressed={terraceSelected}
                aria-label={`${TERRACE_COPY.label} — ${TERRACE_COPY.types}`}
                onPointerEnter={enterTerrace}
                onPointerLeave={leave}
                onFocus={() => {
                  onHover(null)
                  onTerracePrefetch()
                  onTerraceHover(true)
                }}
                onBlur={() => onTerraceHover(false)}
                onClick={chooseTerrace}
              >
                <span className="fx-level__rule" />
                <span className="fx-level__number">{TERRACE_COPY.rail}</span>
              </button>
            </li>
            )}
            {levels.map((level) => {
              const isShown = shown === level.id
              const isSelected = selected === level.id
              return (
                <li key={level.id}>
                  <button
                    type="button"
                    className={`fx-level${isShown ? ' is-shown' : ''}${isSelected ? ' is-selected' : ''}`}
                    data-fx-reveal-level
                    data-level={level.id}
                    aria-pressed={isSelected}
                    aria-label={`${level.label} — ${formatResidenceTypes(level.residenceTypes)}`}
                    onPointerEnter={() => enter(level)}
                    onPointerLeave={leave}
                    onFocus={() => {
                      onPrefetch(level)
                      onHover(level.id)
                    }}
                    onBlur={() => onHover(null)}
                    onClick={() => choose(level)}
                  >
                    <span className="fx-level__rule" />
                    <span className="fx-level__number">{level.id}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>
      </div>

      {/* The terrace's own cue, on the crown it points at. It is the short
          trip from the highlighted destination to the way in: a level's
          readout lives in the left margin because a level opens a drawing,
          but the terrace opens a place, and it is marked where it is. */}
      {TERRACE_ENABLED && rect.width > 0 && (
        <div
          className="fx-terrace-cue"
          data-fx-terrace-cue
          data-shown={(terraceReadout && shown !== null) || undefined}
          style={terraceCueStyle}
          onPointerEnter={enterTerrace}
          onPointerLeave={leave}
        >
          <span className="fx-terrace-cue__rule" aria-hidden="true" />
          <span className="fx-terrace-cue__label">{TERRACE_COPY.label}</span>
          <button type="button" className="fx-terrace-cue__open" onClick={chooseTerrace} tabIndex={-1}>
            {TERRACE_COPY.open}
            <span className="fx-terrace-cue__arrow" aria-hidden="true">
              →
            </span>
          </button>
        </div>
      )}
    </>
  )
}
