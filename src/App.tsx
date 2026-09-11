import { useCallback, useEffect, useState } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { OpeningExperience } from './components/opening/OpeningExperience'
import { getLifestyle, loadLifestyle, prefetchLifestyle } from './components/repose/lazy'
import { getTerrace, loadTerrace } from './components/terrace/lazy'
import { useSmoothScroll } from './hooks/useSmoothScroll'
import { glideTo, jumpTo, pageTop } from './lib/pageScroll'
import { getSmoothScroll, unlockScroll } from './lib/scrollLock'

/**
 * Reposé Residence — SAION Properties.
 *
 * ONE document, ONE scroll, in this order and with nothing to press between
 * any two of them:
 *
 *   approach film → construction → completed building / floor explorer
 *   → reception → the residence and its four interiors
 *   → the amenities loader → the amenity collection → the arch, and back
 *
 * The opening section carries the film, the explorer and the reception in a
 * single sticky viewport; the lifestyle bundle carries everything after them.
 * The two are simply one after the other in the document, so the journey is
 * travelled by scrolling and by nothing else.
 *
 * What the controls do here is TRAVEL that document — "Enter inside",
 * "Explore Reposé", the amenities cue on the podium all glide the page to a
 * position. None of them switches to a state the scroll does not know about,
 * which is what used to make the building a dead end.
 */
function App() {
  // A reload part-way down should not drop the visitor into the middle of the
  // film with an empty canvas.
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    window.scrollTo(0, 0)
  }, [])

  useSmoothScroll()

  /**
   * The lifestyle chapter's own bundle, once it is in the document.
   *
   * It is put there by scroll position (`OpeningExperience` →
   * `onNearLifestyle`), well before the visitor arrives, and BELOW them — so
   * the document grows downward and the scroll simply continues into it.
   */
  const [Chapter, setChapter] = useState(getLifestyle)
  const [mounted, setMounted] = useState(false)
  /** True while the terrace covers the page (off in production — see terraceZone). */
  const [Terrace, setTerrace] = useState(getTerrace)
  const [terraceUp, setTerraceUp] = useState(false)

  // Both chapters already mark their own root for the stylesheet and for the
  // scroll machinery; they are found by those marks rather than by threading
  // refs through two component signatures.
  const residence = () => document.querySelector<HTMLElement>('[data-repose-root]')

  const putChapterInDocument = useCallback(() => {
    setMounted(true)
    const ready = getLifestyle()
    if (ready) {
      setChapter(() => ready)
      return
    }
    // Only reachable if the visitor outran the prefetch that started when the
    // building completed. Nothing is waiting on it: the opening is still on
    // screen and the chapter lands below them when it arrives.
    void loadLifestyle().then((chapter) => setChapter(() => chapter))
  }, [])

  useEffect(() => {
    prefetchLifestyle()
  }, [])

  /**
   * Both cues on the building, and "Explore Reposé" inside the lobby: travel
   * to the beginning of the residence chapter.
   *
   * A glide, never a jump. The chapter is almost always already below the
   * visitor by the time either can be pressed.
   *
   * If the press beats it, waiting two frames is not enough and never was:
   * putting the chapter in the document only STARTS a dynamic import, and two
   * frames later the element is still not there — `travel` found nothing,
   * returned silently, and the cue did nothing at all with no way to tell.
   * The travel now waits for the chunk itself and then for the frame that
   * paints it, and gives up quietly only if the chunk cannot be had.
   */
  const explore = useCallback(() => {
    const travel = () => {
      const element = residence()
      if (!element) return false
      getSmoothScroll()?.resize()
      ScrollTrigger.refresh()
      glideTo(pageTop(element), 1.4)
      return true
    }
    if (travel()) return

    putChapterInDocument()
    void loadLifestyle()
      .then(
        () =>
          new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
          }),
      )
      .then(() => {
        travel()
      })
      .catch(() => {
        /* the chunk could not be fetched; `loadLifestyle` has forgotten it, so
           a second press will try again */
      })
  }, [putChapterInDocument])

  const openTerrace = useCallback(() => {
    const ready = getTerrace()
    if (ready) {
      setTerrace(() => ready)
      setTerraceUp(true)
      return
    }
    void loadTerrace().then((chapter) => {
      setTerrace(() => chapter)
      setTerraceUp(true)
    })
  }, [])

  const returnFromTerrace = useCallback(() => setTerraceUp(false), [])

  /**
   * The arch at the end of the chapter has become the building.
   *
   * This is the one place the page is moved without being seen to move, and
   * it is legitimate: the arch is filling the frame at this instant, so the
   * exchange happens behind it. The chapter comes out of the document, the
   * page is placed back on the settled building, and the mount threshold is
   * above the visitor again — scrolling down re-arms the whole journey exactly
   * as it ran the first time.
   */
  /**
   * The arch has finished. Travel to the arrival — the last chapter.
   *
   * It used to jump UP, to the building inside the opening chapter, because
   * that was the only building in the document. That is what made the journey
   * a loop: the visitor was put back above the reception and the amenities, so
   * carrying on from the end walked the whole thing again, and scrolling back
   * from the end went into the construction film rather than back the way they
   * had come.
   *
   * The arrival is now its own chapter, in the document AFTER the amenities,
   * and it opens on the same held still the arch ends on — so the exchange is
   * the same pixel-exact one it always was, and the page only ever moves
   * forward. Everything above stays where it is and in the order it was read,
   * which is what makes scrolling back up retrace the journey instead of
   * restarting it.
   */
  const returnToBuilding = useCallback(() => {
    // Release the arch's hold before moving the page, not after: the lock puts
    // the page back where it was taken on the next scroll event, so a move made
    // underneath it is undone immediately.
    // Release the hold, then move, in the same tick — nothing about the
    // document changes across this hand-over, so there is nothing to wait a
    // frame for, and waiting one put the move outside the hold the arch takes
    // to keep the frame still through it.
    unlockScroll()
    const arrival = document.querySelector<HTMLElement>('[data-arrival-root]')
    if (arrival) jumpTo(pageTop(arrival))
    requestAnimationFrame(() => {
      getSmoothScroll()?.resize()
      ScrollTrigger.refresh()
    })
  }, [])

  return (
    <main>
      <OpeningExperience
        terraceActive={terraceUp}
        onExplore={explore}
        onTerrace={openTerrace}
        onNearLifestyle={putChapterInDocument}
      />
      {/* The next chapter, in the document below the opening rather than over
          it. See components/repose/lazy for why it is not React.lazy. */}
      {mounted && Chapter && <Chapter onReturn={returnToBuilding} />}
      {/* The terrace is a fixed layer over everything, and is off in
          production (floor-explorer/terraceZone → TERRACE_ENABLED). */}
      {terraceUp && Terrace && <Terrace onReturn={returnFromTerrace} />}
    </main>
  )
}

export default App
