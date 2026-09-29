import '../styles/attention.css'

interface Props {
  /**
   * Whether the mark is asking for attention. Every caller turns it off the
   * moment the thing it points at has been used — a cue that goes on pulsing
   * after it has been answered stops being a cue and becomes a tic.
   */
  shown: boolean
  /**
   * `pill` hugs a rounded control; `frame` traces a rectangular one (a plan, a
   * card); `dot` is a ring with no element to hug, for a bare line of type.
   */
  shape?: 'pill' | 'frame' | 'dot'
}

/**
 * A slow ring, breathing outward from whatever it is placed in.
 *
 * The client's note on the whole site was that it is not obvious enough what
 * can be pressed, and this is the one answer given in six places: the level
 * selector, the drawing that turns into a render, the way back out of it, the
 * films in the residence, the walkthrough. Rather than six bespoke effects it
 * is one mark with three shapes, so they read as the same language.
 *
 * It is a SIBLING inside the control, not a pseudo-element on it. Several of
 * these controls already use `::before` and `::after` for their own halo,
 * arrow or underline, and quietly stealing one of those is how a shared
 * utility breaks a design it was meant to help. The host only has to be
 * positioned; everything else is here.
 *
 * Never takes a pointer event, and is hidden from assistive technology: it
 * says nothing a screen reader cannot already get from the control it sits in.
 */
export function Attention({ shown, shape = 'pill' }: Props) {
  if (!shown) return null
  return (
    <>
      <span className="attn" data-shape={shape} aria-hidden="true" />
      <span className="attn attn--late" data-shape={shape} aria-hidden="true" />
    </>
  )
}
