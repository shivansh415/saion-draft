/**
 * Drawings fetched and decoded ahead of need, keyed by URL.
 *
 * One cache for the chapter: a plan warmed when a residence is chosen is the
 * same warmed plan the residence's own views ask for, so nothing is fetched
 * or decoded twice, and a view that opens on a warmed file opens without a
 * frame of white.
 *
 * A failure resolves rather than rejects: warming is an optimisation, and a
 * caller that waited on it must never be left waiting because the network
 * was not there.
 */
const warmed = new Map<string, Promise<void>>()

export function warmImage(src: string): Promise<void> {
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
