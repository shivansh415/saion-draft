import { useCallback, useEffect, useState } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { OpeningExperience } from './components/opening/OpeningExperience'
import { getLifestyle, loadLifestyle, prefetchLifestyle } from './components/repose/lazy'
import { getTerrace, loadTerrace } from './components/terrace/lazy'
import { ARCH_RETURN_AT, unitFraction } from './data/opening'
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
  /**
   * True once the arch has handed the frame back to the building.
   *
   * The closing marks — the residence's name and the developer's logo —
   * belong to the end of the journey, and the end of the journey is the
   * building, not the last screen of the amenities. This is what tells the
   * opening chapter it has been returned to, so it can bring them up once
   * the exchange has settled. It is never unset: having arrived at the end
   * once, the visitor has arrived.
   */
  const [returned, setReturned] = useState(false)

  // Both chapters already mark their own root for the stylesheet and for the
  // scroll machinery; they are found by those marks rather than by threading
  // refs through two component signatures.
  const opening = () => document.querySelector<HTMLElement>('[data-opening-root]')
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
   * visitor by the time either can be pressed; if the press somehow beats the
   * mount, it is put in the document first and travelled to on the next frame,
   * once the layout knows where it is.
   */
  const explore = useCallback(() => {
    const travel = () => {
      const element = residence()
      if (!element) return
      getSmoothScroll()?.resize()
      ScrollTrigger.refresh()
      glideTo(pageTop(element), 1.4)
    }
    if (residence()) {
      travel()
      return
    }
    putChapterInDocument()
    requestAnimationFrame(() => requestAnimationFrame(travel))
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
  const returnToBuilding = useCallback(() => {
    const section = opening()
    setMounted(false)

    // Release the arch's hold BEFORE moving the page, not after.
    //
    // The arch locks the page as it hands over, so the frame is held still
    // through the exchange. That lock remembers the position it was taken at
    // and puts the page back there on the very next scroll event (see
    // `lib/scrollLock`) — so a jump performed underneath it is undone
    // immediately, and the chapter is left hidden at the bottom of a document
    // it has already handed back. Unlock, then travel.
    unlockScroll()
    if (section) {
      jumpTo(pageTop(section) + section.offsetHeight * unitFraction(ARCH_RETURN_AT))
    }
    requestAnimationFrame(() => {
      getSmoothScroll()?.resize()
      ScrollTrigger.refresh()
      // After the page has been put back and re-measured, not before: the
      // marks fade up on a settled building rather than during the exchange.
      setReturned(true)
    })
  }, [])

  return (
    <main>
      <OpeningExperience
        returned={returned}
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
