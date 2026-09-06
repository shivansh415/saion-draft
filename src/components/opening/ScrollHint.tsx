import { OPENING_COPY } from '../../data/opening'

/**
 * A single hairline and one word; it retires as soon as the descent begins.
 *
 * The outer element belongs to the scroll-scrubbed timeline and the inner one
 * to the entrance timeline, so the two never write to the same properties.
 */
export function ScrollHint() {
  return (
    <div className="op-hint" data-opening-hint>
      <div className="op-hint__inner" data-opening-hint-inner>
        <span className="op-hint__label">{OPENING_COPY.hint}</span>
        <span className="op-hint__track">
          <span className="op-hint__beam" />
        </span>
      </div>
    </div>
  )
}
