import { useEffect, useRef, useState } from 'react'

import '../styles/cursor-label.css'

/**
 * The pointer, told what the thing under it will do.
 *
 * Mounted once, at App level, and driven by one listener on the document: any
 * element that carries `data-cursor="…"` hides the system cursor over itself
 * and shows that word travelling with the pointer instead. So a floor on the
 * building reads SELECT, a residence on a floorplate reads OPEN, a room's
 * film reads PLAY — the interface answers before it is pressed, which is the
 * whole complaint this is here to fix.
 *
 * Wired by a data attribute rather than by props on purpose. The targets are
 * in four different chapters, two of them inside SVG (where React events on
 * hundreds of polygons would be a real cost), and the alternative is threading
 * a callback through every one of them.
 *
 * Pointer devices only. A finger has no hover to read a label with, and
 * `(hover: hover) and (pointer: fine)` is the honest test for that — a touch
 * screen would otherwise flash the label at the moment of the tap and hide the
 * cursor on the hybrid laptops that report both.
 */
export function CursorLabel() {
  const [label, setLabel] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement | null>(null)
  /** Written straight to the element, never through state: this runs per pointermove. */
  const at = useRef({ x: 0, y: 0 })
  const raf = useRef(0)

  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const paint = () => {
      raf.current = 0
      const element = ref.current
      if (element) element.style.transform = `translate3d(${at.current.x}px, ${at.current.y}px, 0)`
    }

    const onMove = (event: PointerEvent) => {
      at.current = { x: event.clientX, y: event.clientY }
      if (!raf.current) raf.current = requestAnimationFrame(paint)

      const target = event.target instanceof Element ? event.target : null
      // `closest` walks up from the deepest hit element, so a label may be put
      // on a wrapper and every polygon inside it inherits it.
      const owner = target?.closest<HTMLElement>('[data-cursor]') ?? null
      const next = owner?.dataset.cursor?.trim() || null
      setLabel((current) => (current === next ? current : next))
    }

    // The pointer leaving the window is not a hover, and neither is the moment
    // a press carries the visitor to another view: the label must not be left
    // stranded on screen either way.
    const clear = () => setLabel(null)

    // `mouseleave` on `document` is not reliable — it does not bubble and
    // browsers disagree about whether it fires at all for the window's edge.
    // `pointerout` with no `relatedTarget` is the event that actually means
    // "the pointer has left the document", and without it the label could be
    // left stranded in a corner of the screen after the pointer had gone.
    const onOut = (event: PointerEvent) => {
      if (!event.relatedTarget) clear()
    }

    document.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerdown', clear, { passive: true })
    document.addEventListener('pointerout', onOut, { passive: true })
    window.addEventListener('blur', clear)

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerdown', clear)
      document.removeEventListener('pointerout', onOut)
      window.removeEventListener('blur', clear)
    }
  }, [])

  return (
    <div className="cursor-label" data-shown={label ? '' : undefined} ref={ref} aria-hidden="true">
      <span className="cursor-label__text">{label}</span>
    </div>
  )
}
