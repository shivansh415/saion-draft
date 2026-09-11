/**
 * Chapter 04, split off the critical path.
 *
 * Nothing in the lifestyle chapter — its sections, its own loader, the arch
 * portal, the dialog, its stylesheet or its imagery — is needed to open the
 * site, and until the building is complete none of it can be reached. So it is
 * a separate bundle: the opening ships and parses without it, and the chapter
 * is fetched while the visitor is standing in front of the finished tower,
 * long before either cue can be pressed (`prefetchLifestyle` is called from
 * the opening the moment the explorer goes live).
 *
 * Deliberately NOT `React.lazy` + `Suspense`. A lazy component's promise is
 * only created when React first renders it, so however early the chunk was
 * prefetched, the first render still suspends — and React throttles the
 * fallback-to-content commit to avoid flicker. Measured, that put ~300ms of
 * motionless building between the press and the chapter, against 77ms for the
 * static import it replaced. Holding the module here instead means a press
 * after a completed prefetch mounts synchronously, with the whole saving and
 * none of the latency.
 */
type Chapter = (typeof import('./ReposeLifestyle'))['ReposeLifestyle']

let loaded: Chapter | null = null
let inflight: Promise<Chapter> | null = null

/** The chapter, if it is already in hand. Null means it must be waited for. */
export function getLifestyle(): Chapter | null {
  return loaded
}

/**
 * Fetches the chunk once and remembers it. Safe to call repeatedly.
 *
 * A FAILED fetch is deliberately not remembered. The promise used to be cached
 * whatever happened to it, so one 404 — routine on a tab left open across a
 * deploy — was permanent: every later call handed back the same rejected
 * promise, the chapter could never arrive, and the two cues that lead to it
 * did nothing for the rest of the session. Forgetting a failure lets the next
 * press try again.
 */
export function loadLifestyle(): Promise<Chapter> {
  if (!inflight) {
    inflight = import('./ReposeLifestyle')
      .then((module) => {
        loaded = module.ReposeLifestyle
        return loaded
      })
      .catch((error) => {
        inflight = null
        throw error
      })
  }
  return inflight
}

/** Warms the chunk ahead of the press. */
export function prefetchLifestyle(): void {
  void loadLifestyle()
}
