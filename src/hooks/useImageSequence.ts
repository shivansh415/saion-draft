import { useEffect, useRef, useState } from 'react'

import {
  MAX_CONCURRENT_LOADS,
  NEAREST_RADIUS,
  PRIME_COUNT,
  WARM_AHEAD,
  WARM_BUDGET,
} from '../data/opening'

/**
 * Progressive loader for a scroll-driven image sequence.
 *
 * Design notes
 * ------------
 * - Nothing here touches React state per frame. The controller lives in a ref
 *   and is read from a requestAnimationFrame loop; only two lifecycle booleans
 *   ever re-render (`firstFrameReady`, `primed`).
 * - Frames are fetched by a concurrency-limited queue that always reaches
 *   *forward* from the playhead first, then backfills behind it, so the frames
 *   a visitor is about to need are already in flight.
 * - HTMLImageElement is used rather than createImageBitmap on purpose: 440
 *   decoded 1600×900 bitmaps would pin well over a gigabyte of memory, whereas
 *   the browser's own image cache evicts decoded surfaces under pressure. To
 *   keep drawImage off the decode path we explicitly `decode()` a rolling
 *   window ahead of the playhead instead.
 * - Requests are never duplicated, and a frame that fails to load is marked so
 *   the queue moves on rather than retrying forever.
 */

const IDLE = 0
const LOADING = 1
const LOADED = 2
const FAILED = 3

export interface SequenceController {
  /** Exact frame, or null when it has not arrived yet. */
  get(index: number): HTMLImageElement | null
  /**
   * Best available frame near `index`. During very fast scrubbing this returns
   * the closest loaded neighbour so the canvas degrades to a slightly stale
   * frame rather than flashing empty.
   */
  getNearest(index: number): HTMLImageElement | null
  /** Tells the queue where the playhead is, so it fetches ahead of it. */
  setPriority(index: number): void
  /** Pre-decodes a small window ahead of the playhead. */
  warm(index: number): void
  /**
   * Whether the film is still the only thing the page wants. True while the
   * preloader is up — nothing else is on screen to compete — and false from
   * the reveal, when the reception's stills and the lifestyle bundle start
   * wanting the same pipe.
   */
  setEager(eager: boolean): void
  readonly loadedCount: number
  readonly total: number
}

interface Options {
  /**
   * How many frames must have settled before the chapter is fit to be shown.
   * The preloader holds the frame until then, so the film has a real buffer in
   * hand before anyone can scroll into it.
   *
   * How many, not which: the queue's lattice order (see `nextIndex`) is what
   * decides that they are spread evenly across the film rather than piled at
   * its head, which is the whole reason a partial buffer is watchable.
   *
   * "Settled" rather than "loaded" on purpose: a frame that 404s or fails must
   * still count, or one missing file would hold the loader up for ever.
   */
  criticalCount?: number
  onFirstFrame?: () => void
  onPrimed?: () => void
  /** Called with 0 → 1 as frames arrive. Not React state — write to the DOM. */
  onProgress?: (fraction: number) => void
  /** Called with 0 → 1 across the critical prefix. Also not React state. */
  onCriticalProgress?: (fraction: number) => void
}

export function useImageSequence(sources: readonly string[], options: Options = {}) {
  const controllerRef = useRef<SequenceController | null>(null)
  const [firstFrameReady, setFirstFrameReady] = useState(false)
  const [primed, setPrimed] = useState(false)

  const criticalCount = Math.min(options.criticalCount ?? 0, sources.length)
  const [criticalReady, setCriticalReady] = useState(criticalCount === 0)

  // Keep callbacks current without re-running the loader effect.
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })

  useEffect(() => {
    const total = sources.length
    const images: (HTMLImageElement | null)[] = new Array(total).fill(null)
    const status = new Uint8Array(total)
    const decoded = new Uint8Array(total)

    let inflight = 0
    let loadedCount = 0
    let criticalSettled = 0
    let priority = 0
    let eager = true
    let disposed = false
    const pending = new Set<HTMLImageElement>()

    const settle = (index: number, image: HTMLImageElement, ok: boolean) => {
      if (disposed) return
      inflight--
      pending.delete(image)

      if (ok) {
        images[index] = image
        status[index] = LOADED
        loadedCount++

        if (index === 0) setFirstFrameReady(true)
        if (loadedCount === PRIME_COUNT || loadedCount === total) setPrimed(true)
        optionsRef.current.onProgress?.(loadedCount / total)
      } else {
        status[index] = FAILED
      }

      // The gate the preloader waits on: HOW MANY frames are in hand, not
      // which. It used to test `index < criticalCount`, which was right when
      // the queue fetched 0,1,2,3… and the gate meant "the first N". The queue
      // now fetches on a lattice, so a low index is no longer an early fetch —
      // and counting by index made the loader wait for the stride-1 pass to
      // sweep the head of the film, which is most of the way through the whole
      // download. Counting arrivals is what the gate always meant; the lattice
      // is what guarantees they are spread across the film rather than piled
      // at the front.
      //
      // Counted whether the frame arrived or failed: the visitor must never be
      // held behind a file that is not coming.
      if (criticalCount > 0) {
        criticalSettled++
        optionsRef.current.onCriticalProgress?.(Math.min(1, criticalSettled / criticalCount))
        if (criticalSettled >= criticalCount) setCriticalReady(true)
      }

      pump()
    }

    const load = (index: number) => {
      status[index] = LOADING
      inflight++

      const image = new Image()
      image.decoding = 'async'
      // Priority by PHASE, not by index.
      //
      // It used to be 'high' for the waited-on prefix and 'low' for everything
      // after, so that four hundred frames could not queue ahead of the
      // lifestyle bundle and the reception's stills. But the gate now asks for
      // the whole film, so an index test would mark all four hundred urgent
      // for ever — and 'low', at the other extreme, parks requests behind
      // everything, which is what left the tail of the film arriving late.
      //
      // While the loader is up the film IS the page and nothing competes with
      // it. From the reveal, 'auto' lets the browser weigh the rest of the
      // film against whatever else is now in flight, rather than always
      // winning or always losing.
      image.fetchPriority = eager ? 'high' : 'auto'
      pending.add(image)
      image.onload = () => settle(index, image, true)
      image.onerror = () => settle(index, image, false)
      image.src = sources[index]
    }

    /**
     * What to fetch next.
     *
     * NOT simply "the next one along". Fetching 0,1,2,3… in order means that
     * at any moment before the film is complete, the buffer is a dense prefix
     * followed by a hole — and a visitor who reaches the hole sees the film
     * stop dead on a held frame, because `getNearest` has nothing ahead to
     * offer. That is the "stuck frame" this ordering exists to remove.
     *
     * So: a dense head first, then the whole film on a coarsening lattice.
     *
     *   1. frames 0…PRIME_COUNT in order — the opening seconds are watched
     *      closely and at a slow scroll, and they must be every frame;
     *   2. then every 8th frame, then every 4th, then every 2nd, then the
     *      rest — each pass sweeping forward from the playhead and then
     *      backfilling behind it, exactly as before.
     *
     * The difference this makes is not subtle. Half a film loaded in order is
     * a perfect first half and a frozen second one. Half a film loaded like
     * this is the WHOLE film at half its frame rate, refining as it goes —
     * which reads as a slightly softer motion for a moment, and never as a
     * stall. `getNearest`'s radius covers the gaps the lattice leaves, so
     * every frame the playhead lands on has something honest to draw.
     */
    const STRIDES = [8, 4, 2, 1]

    const nextIndex = (): number => {
      // The dense head, always first.
      const head = Math.min(PRIME_COUNT, total)
      for (let i = 0; i < head; i++) {
        if (status[i] === IDLE) return i
      }

      // Then the lattice, coarsest first. A pass skips what earlier passes
      // already took, so `stride` here is simply how far apart the candidates
      // of this pass are, not a claim about what is still missing.
      for (const stride of STRIDES) {
        const from = Math.ceil(priority / stride) * stride
        for (let i = from; i < total; i += stride) {
          if (status[i] === IDLE) return i
        }
        for (let i = from - stride; i >= 0; i -= stride) {
          if (status[i] === IDLE) return i
        }
      }
      return -1
    }

    const pump = () => {
      if (disposed) return
      while (inflight < MAX_CONCURRENT_LOADS) {
        const index = nextIndex()
        if (index < 0) return
        load(index)
      }
    }

    controllerRef.current = {
      get: (index) => {
        const i = Math.round(index)
        return i >= 0 && i < total && status[i] === LOADED ? images[i] : null
      },

      getNearest: (index) => {
        const i = Math.min(total - 1, Math.max(0, Math.round(index)))
        if (status[i] === LOADED) return images[i]
        for (let r = 1; r <= NEAREST_RADIUS; r++) {
          const back = i - r
          if (back >= 0 && status[back] === LOADED) return images[back]
          const forward = i + r
          if (forward < total && status[forward] === LOADED) return images[forward]
        }
        return null
      },

      setEager: (next) => {
        eager = next
      },

      setPriority: (index) => {
        const i = Math.min(total - 1, Math.max(0, Math.round(index)))
        if (i !== priority) {
          priority = i
          pump()
        }
      },

      warm: (index) => {
        const start = Math.max(0, Math.round(index))
        let budget = WARM_BUDGET
        for (let offset = 0; offset < WARM_AHEAD && budget > 0; offset++) {
          const i = start + offset
          if (i >= total) break
          if (status[i] === LOADED && !decoded[i]) {
            decoded[i] = 1
            budget--
            images[i]?.decode?.().catch(() => {})
          }
        }
      },

      get loadedCount() {
        return loadedCount
      },
      get total() {
        return total
      },
    }

    // Frame one is the first impression: fetch it on its own, ahead of the pack.
    load(0)
    pump()

    return () => {
      disposed = true
      controllerRef.current = null
      pending.forEach((image) => {
        image.onload = null
        image.onerror = null
      })
      pending.clear()
    }
  }, [sources, criticalCount])

  return { controllerRef, firstFrameReady, primed, criticalReady }
}
