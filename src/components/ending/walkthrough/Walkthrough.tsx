import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'

import { lockScroll, unlockScroll } from '../../../lib/scrollLock'
import { SaionIdent } from './SaionIdent'
import { WalkthroughStage } from './WalkthroughStage'
import './walkthrough.css'

/**
 * The walkthrough, from the press to the films.
 *
 *   mount → ident → stage → (close) → unmount
 *
 * Mounted by the closing call when its cue is pressed and unmounted when the
 * stage is closed, so every opening starts clean. Both layers are fixed and
 * portal to <body>; where the cue lives in the tree is bookkeeping rather
 * than layout.
 *
 * The page is held still for exactly as long as this is mounted — the same
 * counted lock the plans use — and released on unmount, which is BEFORE the
 * closing call gets focus back: the lock puts the page back where it was
 * taken on the next scroll event, so nothing may move it first.
 *
 * The stage is mounted at the same moment as the ident and sits underneath
 * it, dark, until the ident's exit tells it to come in. So the ident's veil
 * dissolves onto a stage that is already there, and the two moves read as
 * one.
 *
 * The ident plays in full the first time it is asked for in a session. After
 * that it opens on the burst — the arch has been seen, and a second sitting
 * through it would read as a delay rather than an event.
 */

type Phase = 'ident' | 'stage'

interface Props {
  /** The stage has faded out; take this out of the tree. */
  onClose: () => void
}

let playedInFull = false

export function Walkthrough({ onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('ident')
  /** True from the ident's exit — the stage may come in. */
  const [stageLive, setStageLive] = useState(false)
  const [brief] = useState(() => playedInFull)

  useEffect(() => {
    playedInFull = true
  }, [])

  // Held for exactly as long as something is over the page.
  useEffect(() => {
    lockScroll()
    return () => unlockScroll()
  }, [])

  const onIdentExit = useCallback(() => setStageLive(true), [])
  const onIdentDone = useCallback(() => setPhase('stage'), [])

  const closing = useRef(false)
  const close = useCallback(() => {
    if (closing.current) return
    closing.current = true
    const stage = document.querySelector<HTMLElement>('[data-ws-root]')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!stage || reduced) {
      onClose()
      return
    }
    gsap.to(stage, { opacity: 0, duration: 0.45, ease: 'power1.inOut', onComplete: onClose })
  }, [onClose])

  return createPortal(
    <>
      <WalkthroughStage live={stageLive} armed={phase === 'stage'} onClose={close} />
      {phase === 'ident' && <SaionIdent brief={brief} onExit={onIdentExit} onDone={onIdentDone} />}
    </>,
    document.body,
  )
}
