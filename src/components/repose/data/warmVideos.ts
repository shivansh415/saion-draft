/**
 * The amenity films, warmed while the loader is up.
 *
 * Deliberately resolves on METADATA rather than on a full download. What the
 * panels need in order not to show a blank frame is the poster (already an
 * image the chapter warms) and a decoder that has seen the file's header; the
 * remaining megabytes arrive behind the visitor while they read the index. So
 * this puts every film in flight early and answers quickly — it can hold the
 * chapter for at most `CAP_MS`, and a film that will not load cannot hold it
 * at all.
 *
 * The elements are detached and thrown away. Their purpose is the HTTP cache:
 * the `<video>` the panel eventually mounts asks for the same URL and is
 * served from it.
 */

const CAP_MS = 3500

export function warmVideos(urls: readonly string[]): { promise: Promise<void>; cancel: () => void } {
  const elements: HTMLVideoElement[] = []
  let done = false

  const promise = new Promise<void>((resolve) => {
    const settle = () => {
      if (done) return
      done = true
      resolve()
    }
    const cap = setTimeout(settle, CAP_MS)

    void Promise.all(
      urls.map(
        (url) =>
          new Promise<void>((ready) => {
            const video = document.createElement('video')
            elements.push(video)
            video.preload = 'auto'
            video.muted = true
            video.playsInline = true
            // Never resolved twice, and never left hanging: a film that 404s
            // or is blocked settles on `error` exactly as one that loads does.
            const finish = () => {
              video.removeEventListener('loadedmetadata', finish)
              video.removeEventListener('error', finish)
              ready()
            }
            video.addEventListener('loadedmetadata', finish, { once: true })
            video.addEventListener('error', finish, { once: true })
            video.src = url
          }),
      ),
    ).then(() => {
      clearTimeout(cap)
      settle()
    })
  })

  return {
    promise,
    cancel: () => {
      done = true
      for (const video of elements) {
        video.removeAttribute('src')
        video.load()
      }
      elements.length = 0
    },
  }
}
