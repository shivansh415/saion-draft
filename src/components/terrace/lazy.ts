/**
 * Chapter 05 — the terrace, split off the critical path.
 *
 * Three.js, the scene, its stylesheet and the 1.9MB model are none of them
 * needed to open the site, and until the building is complete and the visitor
 * has travelled above Level 15 none of it can be reached. So it is a separate
 * bundle, warmed on intent: hovering the crown, focusing the terrace row in
 * the rail, or a first tap on touch all call `prefetchTerrace`, which fetches
 * the chunk AND puts the model in the HTTP cache — so the loader that runs a
 * moment later reads it off disk rather than the network.
 *
 * Same shape, and for the same measured reason, as `repose/lazy`: the module
 * is held here rather than behind `React.lazy`, so a press after a completed
 * prefetch mounts synchronously instead of suspending.
 */
type Chapter = (typeof import('./TerraceExperience'))['TerraceExperience']

/** Where the supplied GLB is served from. One statement, used by both. */
export const TERRACE_MODEL_URL = '/models/repose-terrace.glb'

let loaded: Chapter | null = null
let inflight: Promise<Chapter> | null = null
let modelWarmed = false

/** The chapter, if it is already in hand. Null means it must be waited for. */
export function getTerrace(): Chapter | null {
  return loaded
}

/** Fetches the chunk once and remembers it. Safe to call repeatedly. */
export function loadTerrace(): Promise<Chapter> {
  if (!inflight) {
    inflight = import('./TerraceExperience').then((module) => {
      loaded = module.TerraceExperience
      return loaded
    })
  }
  return inflight
}

/**
 * Warms both halves ahead of the press — and the model at low priority, so it
 * never competes with anything the visitor is currently looking at. A failure
 * here is not an error: the loader will simply fetch it for real.
 */
export function prefetchTerrace(): void {
  void loadTerrace()
  if (modelWarmed) return
  modelWarmed = true
  const warm = () => {
    fetch(TERRACE_MODEL_URL, { priority: 'low' } as RequestInit).catch(() => {
      modelWarmed = false
    })
  }
  const idle = window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 200))
  idle(warm)
}
