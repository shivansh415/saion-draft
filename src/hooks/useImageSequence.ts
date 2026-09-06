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
  readonly loadedCount: number
  readonly total: number
}

interface Options {
  /**
   * How many frames from the head of the list must have settled before the
   * chapter is fit to be shown. The preloader holds the frame until then, so
   * the film has a real buffer in hand before anyone can scroll into it.
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

      // The gate the preloader waits on. Counted whether the frame arrived or
      // failed: the visitor must never be held behind a file that is not
      // coming.
      if (criticalCount > 0 && index < criticalCount) {
        criticalSettled++
        optionsRef.current.onCriticalProgress?.(criticalSettled / criticalCount)
        if (criticalSettled >= criticalCount) setCriticalReady(true)
      }

      pump()
    }

    const load = (index: number) => {
      status[index] = LOADING
      inflight++

      const image = new Image()
      image.decoding = 'async'
      // The prefix the preloader is waiting on is the most urgent thing the
      // page will ever fetch; everything after it is a background stream the
      // visitor is scrolling towards, and saying so lets the browser give way
      // to what is actually needed sooner — the lifestyle bundle, the
      // reception's stills — instead of queueing them behind four hundred
      // frames. The queue's own six-at-a-time limit means 'low' cannot starve
      // it either way.
      image.fetchPriority = index < criticalCount ? 'high' : 'low'
      pending.add(image)
      image.onload = () => settle(index, image, true)
      image.onerror = () => settle(index, image, false)
      image.src = sources[index]
    }

    /** Nearest idle frame: ahead of the playhead first, then behind it. */
    const nextIndex = (): number => {
      for (let i = priority; i < total; i++) {
        if (status[i] === IDLE) return i
      }
      for (let i = priority - 1; i >= 0; i--) {
        if (status[i] === IDLE) return i
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
