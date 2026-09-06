import { useCallback, useEffect, useRef, useState } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { OpeningExperience } from './components/opening/OpeningExperience'
import { getLifestyle, loadLifestyle } from './components/repose/lazy'
import type { ReturnReason } from './components/repose/ReposeLifestyle'
import { useSmoothScroll } from './hooks/useSmoothScroll'
import { getSmoothScroll, unlockScroll } from './lib/scrollLock'

/**
 * Which chapter holds the page.
 *
 *   building   the opening — the approach, the completed building, the floor
 *              explorer and the reception all live in its one sticky frame
 *   lifestyle  the lifestyle chapter, mounted after the opening and entered
 *              from the reception; at its end the arch becomes the building
 *              and the page is handed back here
 */
type Stage = 'building' | 'lifestyle'

/**
 * Reposé Residence — SAION Properties.
 *
 * The experience is assembled chapter by chapter, in one document, on one
 * smooth-scroll instance. The opening carries the approach, the building,
 * the floor explorer and the reception in a single sticky frame; the
 * lifestyle chapter follows it in the flow and returns to it, so the whole
 * reads as one continuous loop.
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

  const [stage, setStage] = useState<Stage>('building')
  /** True when the chapter has left the page held still for the hand-back. */
  const heldRef = useRef(false)

  /**
   * The chapter's own bundle, once it has arrived. It is prefetched the moment
   * the building completes — long before either cue can be pressed — so in
   * practice this is already filled in and the press mounts at once.
   */
  const [Chapter, setChapter] = useState(getLifestyle)

  // Both cues on the building open the chapter the same way: at its beginning.
  const explore = useCallback(() => {
    const ready = getLifestyle()
    if (ready) {
      setChapter(() => ready)
      setStage('lifestyle')
      return
    }
    // Only reachable if the press beats the prefetch. The building simply
    // stays as it is until the chunk lands — which is what was on screen a
    // moment before, so nothing flashes.
    void loadLifestyle().then((chapter) => {
      setChapter(() => chapter)
      setStage('lifestyle')
    })
  }, [])

  const returnToBuilding = useCallback((reason: ReturnReason) => {
    heldRef.current = reason === 'arch'
    setStage('building')
  }, [])

  // The chapter has just been taken down: release the page where the chapter
  // left it (the opening's end — the same building, now the explorer's) and
  // let the scroll machinery re-measure the shorter document.
  useEffect(() => {
    if (stage !== 'building') return
    if (heldRef.current) {
      heldRef.current = false
      unlockScroll()
    }
    getSmoothScroll()?.resize()
    ScrollTrigger.refresh()
  }, [stage])

  return (
    <main>
      <OpeningExperience lifestyleActive={stage === 'lifestyle'} onExplore={explore} />
      {/* The chapter is its own bundle (see components/repose/lazy). */}
      {stage === 'lifestyle' && Chapter && <Chapter onReturn={returnToBuilding} />}
    </main>
  )
}

export default App
