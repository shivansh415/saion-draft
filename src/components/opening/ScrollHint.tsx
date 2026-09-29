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
        {/* A chevron under the line. The word and the beam were both white on
            a frame that opens on sunlit cloud, and neither was being read; a
            downward arrow is the one mark that says "this way" without
            needing to be read at all. */}
        <span className="op-hint__chevron" aria-hidden="true">
          <svg viewBox="0 0 24 14" focusable="false">
            <path d="M2 2 L12 11 L22 2" />
          </svg>
        </span>
      </div>
    </div>
  )
}
