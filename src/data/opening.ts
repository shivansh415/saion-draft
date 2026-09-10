/**
 * Reposé Residence — Chapter 01: "The Approach"
 *
 * Every timing, path and piece of copy for the opening chapter lives here so the
 * pacing can be tuned without touching the renderer, the loader or the layout.
 *
 * The two supplied cinematic sequences are modelled as ONE flat frame list.
 * Nothing downstream knows there were ever two source clips.
 */

/* ------------------------------------------------------------------ *
 * Source frames
 * ------------------------------------------------------------------ */

export interface SequenceSource {
  /** Folder name under /assets/opening/ */
  readonly id: string
  /** Number of frames in the sequence. */
  readonly count: number
}

export const SEQUENCES: readonly SequenceSource[] = [
  { id: 'sequence-01', count: 200 }, // clouds → Dubai → Al Furjan
  { id: 'sequence-02', count: 240 }, // Al Furjan → construction → completed tower (24 fps × 10 s, every frame)
]

/** Intrinsic size of the optimised WebP frames. */
export const FRAME_WIDTH = 1600
export const FRAME_HEIGHT = 900

function frameUrl(sequence: string, frame: number): string {
  return `/assets/opening/${sequence}/webp/frame-${String(frame).padStart(4, '0')}.webp`
}

/** Flat, ordered list of every frame across both sequences. */
export const FRAME_SOURCES: readonly string[] = SEQUENCES.flatMap((sequence) =>
  Array.from({ length: sequence.count }, (_, i) => frameUrl(sequence.id, i + 1)),
)

export const FRAME_COUNT = FRAME_SOURCES.length
export const LAST_FRAME = FRAME_COUNT - 1

/** Flat index of the first frame of sequence 02. */
const SEQ_02_START = SEQUENCES[0].count

/* ------------------------------------------------------------------ *
 * Scroll timeline
 *
 * All beats below are fractions of the FILM TRACK (0 → 1); the hand-off that
 * follows the film is expressed past 1 so the film never has to move.
 * ------------------------------------------------------------------ */

/**
 * Scroll distance the film occupies: the original 720vh track less the 100vh
 * sticky viewport. Every fraction below is a fraction of THIS distance, so the
 * film's pacing in absolute pixels is untouched by anything appended after it.
 */
export const FILM_TRACK_VH = 620

/**
 * Extra scroll appended after the film for the hand-off into the floor
 * explorer: the closing title retires, the explorer settles over the held
 * final frame, and only then does the level selector take input.
 */
export const HANDOFF_TRACK_VH = 200

/**
 * The building's own stretch. Nothing changes across it: the completed tower
 * is on screen and the floor explorer has the frame, hovering levels, opening
 * plans, offering its cues. It exists so that reaching the explorer is not
 * immediately followed by the reception assembling itself — the visitor gets
 * a comfortable run of scroll in which the building is simply THERE.
 *
 * 260vh, not the 130 it was first written at. 130 is about 1.4 screens, and a
 * smoothed scroll carries enough momentum that a single flick crosses it: in
 * a real run, aiming to stop at y=8800 landed at 9502 — past the band
 * entirely, with the walk into the reception already under way and the
 * explorer already stood down. A window the visitor has to CATCH is not an
 * interactive floor explorer. At ~2.7 screens the building is somewhere they
 * can come to rest, hover a level and open a plan.
 */
export const EXPLORER_HOLD_VH = 260

/**
 * The walk into the reception, as scroll.
 *
 * The approved reception timeline is unchanged — same beats, same durations,
 * same choreography. What changed is what drives it: it used to be played on
 * a clock by a click, which made the building a dead end for anyone who just
 * kept scrolling. It is now scrubbed across this band, so the walk in runs
 * forward as the visitor descends and runs backward if they scroll up.
 *
 * 260vh reads at roughly the same pace as the 2.8s walk did at an unhurried
 * scroll speed, and — unlike a clock — it cannot outrun the visitor.
 */
export const RECEPTION_TRACK_VH = 260

/** Height of the whole scroll track. The visual viewport stays sticky inside it. */
export const CHAPTER_HEIGHT_VH =
  100 + FILM_TRACK_VH + HANDOFF_TRACK_VH + EXPLORER_HOLD_VH + RECEPTION_TRACK_VH

/**
 * Length of the chapter in "film units" (1 = the film track). The scrubbed
 * timeline is this long, so the film beats keep their positions and everything
 * appended after the film simply sits past 1.
 *
 * This is why the film's pacing is untouched by any of the bands above: every
 * beat in this file is a fraction of the FILM track, never of the chapter.
 */
export const CHAPTER_UNITS =
  (FILM_TRACK_VH + HANDOFF_TRACK_VH + EXPLORER_HOLD_VH + RECEPTION_TRACK_VH) / FILM_TRACK_VH

const afterFilm = (vh: number) => 1 + vh / FILM_TRACK_VH

/**
 * Hand-off beats, in film units, measured from the end of the film track.
 * The final frame holds throughout; only what sits over it changes.
 */
export const HANDOFF = {
  /** The closing title lifts away. */
  copyOutStart: afterFilm(50),
  copyOutEnd: afterFilm(105),
  /** The explorer — building still, copy, level list — settles in. */
  explorerInStart: afterFilm(85),
  explorerInEnd: afterFilm(165),
  /**
   * From here the selector takes hover, tap and keyboard. A little before the
   * last of the type has settled, so a scroll that comes to rest just short
   * of the end of the track still lands on a working selector.
   */
  activeAt: afterFilm(150),
} as const

/* ------------------------------------------------------------------ *
 * The reception band, and the two marks either side of it
 * ------------------------------------------------------------------ */

/**
 * Where the walk into the reception runs, in film units. `ReceptionExperience`
 * maps the chapter's scroll progress through this band onto its own timeline's
 * progress; outside it the reception is at rest (before) or fully arrived
 * (after).
 */
export const RECEPTION_BAND = {
  start: afterFilm(HANDOFF_TRACK_VH + EXPLORER_HOLD_VH),
  end: afterFilm(HANDOFF_TRACK_VH + EXPLORER_HOLD_VH + RECEPTION_TRACK_VH),
} as const

export const RECEPTION_SPAN = RECEPTION_BAND.end - RECEPTION_BAND.start

/**
 * Where the lifestyle chapter is put into the document.
 *
 * Comfortably before the reception band, so by the time the visitor scrolls
 * out of this chapter the next one is already below them and the scroll simply
 * continues into it. It is appended BELOW the current position, so the
 * document grows downward and nothing moves under the visitor.
 */
export const LIFESTYLE_MOUNT_AT = afterFilm(HANDOFF_TRACK_VH + 30)

/**
 * Where the arch at the end of the lifestyle chapter puts the page back.
 *
 * Just after the explorer takes input and well before `LIFESTYLE_MOUNT_AT`, so
 * the return lands on the settled building with the mount threshold above the
 * visitor again — scrolling down re-arms it exactly as it did the first time.
 */
export const ARCH_RETURN_AT = afterFilm(160)

/** A film-unit position as a fraction of the chapter's scroll track. */
export const unitFraction = (unit: number): number => unit / CHAPTER_UNITS

/**
 * The film's final frame as a still, for the explorer to hold and annotate.
 * Same framing as the last frame of sequence 02 (it is that frame, at the
 * source's full 1920×1080 rather than the 1600×900 the film streams, written
 * by `scripts/extract-sequence.py` alongside the frames), so the hand-off
 * from canvas to still is invisible.
 */
export const FINAL_FRAME_STILL = {
  src: '/assets/opening/building/final-frame.webp',
  width: 1920,
  height: 1080,
} as const

/** Flat index of the last frame of sequence 01 and the first of sequence 02. */
const SEQ_01_LAST = SEQ_02_START - 1 // 199
const SEQ_02_FIRST = SEQ_02_START //    200

/**
 * The chapter break — where sequence 01 hands over to sequence 02.
 *
 * The two supplied clips end and begin on the same subject, the Al Furjan
 * villa ring, but not from the same camera: the altitude, the heading and the
 * horizon all differ, and the ring itself changes size by roughly a sixth
 * across the cut. No dissolve hides that. Cross-fading two aerials this far
 * apart reads as a double exposure; cutting reads as two different videos
 * spliced together.
 *
 * So the mismatch is not hidden — it is used. The film arrives at the end of
 * the approach, holds, and darkens into a title card; the picture is exchanged
 * while the frame is at its darkest; and the card lifts to reveal the site,
 * ready to be built. The break belongs to the story rather than to the edit,
 * which is the one reading under which a change of camera is not a mistake.
 *
 * `start` is where sequence 01 has reached its final frame and stops advancing;
 * `end` is where sequence 02 begins to advance. The band between them is
 * 0.104 film units — 64.5vh of scroll, which on a 900px viewport is 580px, or
 * roughly 0.8s at a brisk 700px/s and 1.2s at an unhurried 480px/s.
 *
 * The cost is paid by the two clips, not by the page: the chapter is exactly
 * as long as it was, sequence 01 now scrubs at 1.27vh per frame instead of
 * 1.34, and sequence 02 at 1.00 instead of 1.14. Nothing else moves.
 */
export const CHAPTER_BREAK = {
  start: 0.408,
  end: 0.512,
} as const

export const CHAPTER_BREAK_SPAN = CHAPTER_BREAK.end - CHAPTER_BREAK.start

/** A beat inside the break, in film units. `t` runs 0 → 1 across the band. */
export const breakAt = (t: number): number => CHAPTER_BREAK.start + CHAPTER_BREAK_SPAN * t

/** A duration inside the break, in film units. */
export const breakSpan = (from: number, to: number): number => (to - from) * CHAPTER_BREAK_SPAN

/**
 * Where inside the break the picture is exchanged, as fractions of the band.
 *
 * Both ends sit inside the window where the veil is at full strength, so the
 * exchange happens with 4% of the frame showing. The two frames differ by a
 * mean of 55/255 levels; at 4% that residual is 2.2 levels, under a 6px blur,
 * spread continuously over ~11vh of scroll. There is no step for the eye to
 * catch — which is the whole point of doing it here rather than in the open.
 */
const SWAP_FROM = 0.44
const SWAP_TO = 0.62

/** Progress at which the film reaches its final frame and simply holds. */
const FILM_END = 0.9

/* Overlay beats -------------------------------------------------------- */

/** The opening title holds, then lifts away as the descent begins. */
export const HERO_EXIT_START = 0.02
export const HERO_EXIT_END = 0.105

/** The scroll cue retires almost immediately. */
export const HINT_EXIT_END = 0.028

/* ------------------------------------------------------------------ *
 * Progress → frame resolution
 * ------------------------------------------------------------------ */

export interface FrameState {
  /** Primary frame index. */
  readonly a: number
  /** Secondary frame index, drawn over `a` at `mix` opacity. */
  readonly b: number
  /** 0 = show `a` only, 1 = show `b` only. */
  readonly mix: number
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Smoothstep. Flat at both ends so the exchange begins and ends without an edge. */
const smooth = (t: number) => t * t * (3 - 2 * t)

/**
 * Maps film progress (in film units — see `CHAPTER_UNITS`) onto the flat
 * frame list. Anything past 1 is the hand-off and simply holds the last frame.
 *
 *   0.000 → 0.408   sequence 01   clouds → Dubai → Al Furjan
 *   0.408 → 0.454   hold on the final approach frame, the frame darkens
 *   0.454 → 0.472   the picture is exchanged, under the title card
 *   0.472 → 0.512   hold on the first construction frame, the card lifts
 *   0.512 → 0.900   sequence 02   construction → completed Reposé
 *   0.900 → 1.000   hold on the finished tower
 *
 * The two holds are deliberate: the camera stops, so the transition is read as
 * a chapter ending rather than a camera stumbling between two clips. Nothing
 * about it is idle — the veil, the type, the sweep and a slow push on the
 * canvas all run through it, scrubbed from the same timeline (see
 * `OpeningExperience`), so the scroll never feels like it has stalled.
 */
export function resolveFrame(progress: number): FrameState {
  const p = clamp01(progress)

  if (p <= CHAPTER_BREAK.start) {
    const index = lerp(0, SEQ_01_LAST, p / CHAPTER_BREAK.start)
    return { a: index, b: index, mix: 0 }
  }

  if (p < CHAPTER_BREAK.end) {
    const t = (p - CHAPTER_BREAK.start) / CHAPTER_BREAK_SPAN

    if (t <= SWAP_FROM) return { a: SEQ_01_LAST, b: SEQ_01_LAST, mix: 0 }
    if (t >= SWAP_TO) return { a: SEQ_02_FIRST, b: SEQ_02_FIRST, mix: 0 }

    return {
      a: SEQ_01_LAST,
      b: SEQ_02_FIRST,
      mix: smooth((t - SWAP_FROM) / (SWAP_TO - SWAP_FROM)),
    }
  }

  if (p >= FILM_END) {
    return { a: LAST_FRAME, b: LAST_FRAME, mix: 0 }
  }

  const t = (p - CHAPTER_BREAK.end) / (FILM_END - CHAPTER_BREAK.end)
  const index = lerp(SEQ_02_FIRST, LAST_FRAME, t)
  return { a: index, b: index, mix: 0 }
}

/* ------------------------------------------------------------------ *
 * Loader tuning
 * ------------------------------------------------------------------ */

/** Frames fetched before the chapter is considered ready to travel through. */
export const PRIME_COUNT = 24

/* ------------------------------------------------------------------ *
 * The gate — what the preloader holds the frame for
 *
 * The rule is that the opening is never revealed until enough of the film
 * is genuinely in hand to be scrolled through smoothly, and that nothing
 * beyond the opening's own first seconds is ever waited for.
 * ------------------------------------------------------------------ */

/**
 * What the preloader holds the frame for.
 *
 * Not a prefix of the film, and not all of it: enough of the LATTICE that
 * `useImageSequence` fetches on (a dense head, then every 8th frame, then
 * every 4th, then every 2nd, then the rest) to cover the whole film at one
 * frame in four.
 *
 * This is the number that made the difference, and it is a coverage figure
 * rather than a count. It used to be 32 — a dense prefix — which meant that
 * when the loader left, the film was perfect for one second and a frozen hole
 * after it. Measured at 25 Mbps, the old ordering left the longest run of
 * missing frames at 211; the lattice, with the same bytes in hand at the same
 * moment, leaves it at 3. `getNearest` covers a gap of three without anyone
 * being able to tell; it can do nothing at all about a gap of two hundred.
 *
 * The head is `PRIME_COUNT` frames in order, because the opening seconds are
 * watched closely and at a slow scroll and must be every frame. The coarsest
 * pass then lays one frame in eight across the rest, which is what this
 * figure counts.
 *
 * One in eight rather than one in four, and the reason is `NEAREST_RADIUS`.
 * A stride-8 lattice leaves a longest run of seven missing frames; the radius
 * is fourteen, so every one of those gaps is already covered by a frame within
 * a few hundredths of a second of motion — the same measurement that justified
 * the lattice in the first place recorded a longest gap of 7 on a slow line
 * and nothing visibly held. Waiting for the stride-4 pass on top of it doubles
 * the bytes the visitor waits through to buy coverage that `getNearest` was
 * already providing. Measured on the production build at 40ms RTT, that pass
 * was costing 1.4s of loader on a fast line and 2.6s on a slow one, for a film
 * that scrubbed the same either way. The stride-4, stride-2 and stride-1
 * passes still run — they now refine the film behind the reveal instead of in
 * front of it.
 *
 * Encoding cannot help make this cheaper, and it was measured rather than
 * assumed: these frames re-encode LARGER as WebP at every quality tried, and
 * AVIF at a quality worth shipping is 113% of their current size. They came
 * off a video and are already at the floor of intra-frame coding. The only
 * real compression left is inter-frame — a video — which is a different
 * renderer and a different set of risks.
 */
export const CRITICAL_FRAMES = PRIME_COUNT + Math.round((FRAME_COUNT - PRIME_COUNT) / 8)

/**
 * The shortest the preloader is on screen. Long enough for its own line
 * work to draw and settle, so a warm cache reads as a considered opening
 * rather than a flash of something.
 */
export const LOADER_MIN_MS = 1700

/**
 * The buffering budget: the longest the loader will hold out for the film.
 *
 * With the gate above set to the whole film, this is the number that actually
 * decides what the visitor experiences, so it is a trade made on purpose.
 * Measured at 40ms RTT: a 100 Mbps line has the entire film inside this and
 * the loader leaves early; 25 Mbps buffers a little under half of it; 8 Mbps
 * gets ~65 frames, still twice what the old gate ever waited for. Past this
 * the chapter is revealed with whatever arrived — never with nothing, since
 * the first frame and the fonts are still required — and the queue keeps
 * reaching forward of the playhead from a far deeper start than before.
 *
 * Four and a half seconds, not the fifteen it takes to guarantee the whole
 * film on an average line. A loader is a held breath, and fifteen seconds of
 * one is a worse first impression than an occasional held frame late in a hard
 * scrub.
 *
 * It was six. The ceiling only ever binds on a slow line, and on a slow line
 * it was landing at the same moment the gate did — the visitor waited the full
 * six seconds AND got no more film for it. Measured at 8 Mbps / 40ms RTT,
 * cutting it to 4.5s costs about fifteen frames of coverage and leaves the
 * longest run of missing frames still inside `NEAREST_RADIUS`, which is the
 * only thing that decides whether a scrub holds. The seconds are the visitor's;
 * the frames keep arriving either way.
 */
export const LOADER_MAX_MS = 4500

/** Longest the fonts are waited on before the reveal goes ahead without them. */
export const FONT_WAIT_MS = 4000

/**
 * Parallel image requests, multiplexed by HTTP/2 over one connection.
 *
 * Twelve rather than eight. Fetching four hundred small files is latency-bound
 * long before it is bandwidth-bound — each frame costs a round trip whatever
 * its size — and the number in flight is the multiplier on that. Eight was
 * chosen when only 32 frames were ever waited on; now that the loader holds
 * for most of the film, the depth of the queue is the loader's duration.
 */
export const MAX_CONCURRENT_LOADS = 12

/** How far either side of the requested frame to accept a stand-in. */
export const NEAREST_RADIUS = 14

/** How far ahead of the playhead to pre-decode. */
export const WARM_AHEAD = 24

/** Frames pre-decoded per animation frame. 6 catches up faster after a fast scrub while
 *  staying within a single 16ms rAF budget on integrated GPUs. */
export const WARM_BUDGET = 6

/* ------------------------------------------------------------------ *
 * Renderer tuning
 * ------------------------------------------------------------------ */

/**
 * Upper bound on the canvas backing store.
 *
 * Trimmed from (2, 3840) — a full-quality 4K@2x surface is the single most
 * expensive thing this renderer does every frame (two cover-fit draws,
 * high-quality resampled, of up to ~4000×2250px each), and it is the first
 * thing to cause visible stutter on integrated/fanless GPUs. The frames are
 * pre-compressed WebP to begin with, so the ceiling below is well past the
 * point of a visible sharpness difference.
 */
export const MAX_DPR = 1.6
export const MAX_BACKING_WIDTH = 3200

/**
 * Cover-crop focal point.
 *
 * Horizontally centred: the aerials are centre-weighted and the tower stands
 * dead centre of the frame.
 *
 * Vertically biased a little above centre. On viewports wider than the source
 * 16:9 the crop takes height off both edges, and the top of that crop holds the
 * tower's crown while the bottom holds foreground roadway — so the roadway is
 * the half to give up. The bias is kept small so the aerials, which have no
 * such asymmetry, are effectively unaffected.
 */
export const FOCAL_X = 0.5
export const FOCAL_Y = 0.44

/* ------------------------------------------------------------------ *
 * Copy
 * ------------------------------------------------------------------ */

export const OPENING_COPY = {
  titleLines: ['Reposé', 'Residence'],
  tagline: 'A luxurious lifestyle awaits you',
  developerLabel: 'Developed by',
  logoSrc: '/assets/opening/branding/saion-logo.png',
  logoAlt: 'SAION Properties',
  hint: 'Scroll',
} as const

/** The chapter card between the approach and the construction. */
export const CHAPTER_COPY = {
  titleLines: ['Ready', 'to Rise.'],
  project: 'Reposé Residence',
  location: 'Al Furjan · Dubai',
} as const

/**
 * The closing title card's copy.
 *
 * The card itself was removed: the film now completes on the building and
 * hands straight over to the explorer. This and `components/opening/FinalReveal`
 * are no longer rendered anywhere and can both be deleted; they are kept only
 * so the orphaned component still type-checks until it is.
 */
export const FINAL_COPY = {
  titleLines: ['Stately', 'Serenity'],
  project: 'Reposé Residence',
  location: 'Al Furjan · Dubai',
} as const

/** The cue on the completed building that leads to the amenities. */
export const AMENITIES_COPY = {
  label: 'Explore amenities',
} as const

/** The preloader that holds the frame until the film is ready to travel. */
export const LOADER_COPY = {
  developer: 'SAION Properties',
  project: 'Reposé Residence',
  location: 'Al Furjan · Dubai',
  /** Announced to assistive technology while the frame is held. */
  status: 'Loading Reposé Residence',
} as const
