import { photoSources } from './photoSources'
import type { PhotoSpec } from './photoSources'

/**
 * Fetch-and-decode for the chapter's photographs.
 *
 * The problem this solves is picking the *right file*. Every photo is a
 * `<picture>` offering AVIF, then WebP, then JPEG, each with a 720w and a
 * native candidate — so which URL the browser asks for depends on its format
 * support, the viewport, the device pixel ratio and the element's `sizes`.
 * Warming a guessed URL is worse than not warming at all: it spends the
 * bandwidth and the page still cold-fetches the file it actually wanted.
 *
 * So nothing is guessed. A real `<picture>` is built, with the same sources
 * and the same `sizes` the component renders, and put in the document where
 * the browser resolves it by its own rules. Whatever it chooses is by
 * definition the URL the page will choose, and `decode()` then makes sure the
 * bitmap is ready and not merely the bytes — a decoded image paints on the
 * frame it is asked for, which is the difference between a photo appearing
 * and a photo popping in.
 *
 * The elements live in a fixed, 1px, invisible holder outside the React tree,
 * so they can neither shift the layout nor be seen. `sizes` is expressed in
 * viewport units throughout, so it resolves identically there.
 */

let holder: HTMLElement | null = null

function stage(): HTMLElement {
  if (holder?.isConnected) return holder
  holder = document.createElement('div')
  holder.setAttribute('aria-hidden', 'true')
  holder.dataset.rpWarm = ''
  holder.style.cssText =
    'position:fixed;top:0;left:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;z-index:-1;contain:strict'
  document.body.appendChild(holder)
  return holder
}

/** Specs already warmed, so a second pass over them costs nothing. */
const done = new Set<string>()
const key = (spec: PhotoSpec) => `${spec.name}|${spec.sizes}|${spec.responsive === false ? 'n' : 'y'}`

/**
 * Warms one photo. Resolves when the browser has the picture decoded — or
 * when it has decided it cannot have it, which resolves just the same: a
 * missing file must never hold the chapter shut.
 */
export function warmPhoto(spec: PhotoSpec, assetBase: string, priority: 'high' | 'low' = 'high'): Promise<void> {
  const id = key(spec)
  if (done.has(id)) return Promise.resolve()

  return new Promise<void>((resolve) => {
    const { avifSet, webpSet, jpgSrc } = photoSources(spec.name, assetBase, spec.responsive !== false)
    const picture = document.createElement('picture')

    const source = (type: string, srcset: string) => {
      const element = document.createElement('source')
      element.type = type
      element.srcset = srcset
      element.sizes = spec.sizes
      picture.appendChild(element)
    }
    source('image/avif', avifSet)
    source('image/webp', webpSet)

    const image = document.createElement('img')
    image.decoding = 'async'
    image.loading = 'eager'
    image.fetchPriority = priority
    image.alt = ''
    // `sizes` before `src`: the candidate is chosen when the source is set,
    // and choosing it against a missing `sizes` would pick the wrong one.
    image.sizes = spec.sizes
    picture.appendChild(image)
    stage().appendChild(picture)

    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      done.add(id)
      picture.remove()
      resolve()
    }

    image.onload = () => {
      // Bytes are not enough — decode, so the first paint of the real element
      // is a copy rather than a decode.
      image.decode().then(finish, finish)
    }
    image.onerror = () => {
      // Resolving rather than rejecting is deliberate — a file that is not
      // coming must never hold the chapter shut. But it must not pass in
      // silence either: this is precisely what a whole folder missing from a
      // deployment looks like from in here, and without a word in the console
      // it is indistinguishable from a completed load. Say so, by name.
      console.error(
        `[Reposé] image failed to load: ${image.currentSrc || jpgSrc}\n` +
          '  The chapter will open without it. If this is a deployment, check that ' +
          'public/assets/repose-experience/ is actually in the build — `npm run check:assets`.',
      )
      finish()
    }
    image.src = jpgSrc
  })
}

export interface WarmHandle {
  readonly promise: Promise<void>
  cancel(): void
}

/**
 * Warms a list in order, a few at a time.
 *
 * In order matters: the list is written in the order the visitor meets the
 * photographs, so the queue is always working on what is nearest ahead of
 * them rather than on whatever happens to answer first.
 */
export function warmPhotos(
  specs: readonly PhotoSpec[],
  assetBase: string,
  options: { concurrency?: number; priority?: 'high' | 'low'; onProgress?: (fraction: number) => void } = {},
): WarmHandle {
  const { concurrency = 4, priority = 'high', onProgress } = options
  let cancelled = false
  let settled = 0
  let next = 0

  const total = specs.length
  const step = () => {
    settled++
    onProgress?.(total === 0 ? 1 : settled / total)
  }

  const worker = async (): Promise<void> => {
    while (!cancelled) {
      const index = next++
      if (index >= total) return
      await warmPhoto(specs[index], assetBase, priority)
      if (cancelled) return
      step()
    }
  }

  const promise = Promise.all(
    Array.from({ length: Math.min(concurrency, Math.max(total, 1)) }, worker),
  ).then(() => undefined)

  return {
    promise,
    cancel() {
      cancelled = true
    },
  }
}

/** Drops the holder. Only for teardown; warming is otherwise process-wide. */
export function clearWarmStage(): void {
  holder?.remove()
  holder = null
}
