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

/**
 * True when the visitor's connection has asked us not to spend it.
 *
 * Speculative warming is a courtesy to a fast line and a tax on a slow one:
 * the eight relit floorplates are 8.73 MB together, which is seventy seconds
 * at 1 Mbps of files the visitor may never open. Data Saver, and anything the
 * browser calls 2g or slow-2g, mean fetch only what is asked for.
 *
 * `navigator.connection` is not in every engine and is not in the DOM lib's
 * `Navigator`, so it is read defensively; absent, we assume a normal line and
 * warm as before.
 */
export function prefersLightLoad(): boolean {
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string }
    }
  ).connection
  if (!connection) return false
  if (connection.saveData === true) return true
  return connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g'
}

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
