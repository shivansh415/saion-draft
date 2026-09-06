import { OPENING_COPY } from '../../data/opening'

/**
 * The opening title card.
 *
 * Composition is editorial rather than centred: the wordmark is anchored to the
 * left third so the Dubai skyline keeps the open right-hand side of the frame.
 * Each line sits inside its own overflow mask so it can be revealed upward.
 */
export function OpeningCopy() {
  return (
    <div className="op-hero" data-opening-hero>
      <div className="op-hero__inner">
        <h1 className="op-title">
          {OPENING_COPY.titleLines.map((line) => (
            <span className="op-line" key={line}>
              <span className="op-line__inner" data-opening-line>
                {line}
              </span>
            </span>
          ))}
        </h1>

        <div className="op-rule" data-opening-rule />

        <p className="op-tagline" data-opening-tagline>
          {OPENING_COPY.tagline}
        </p>
      </div>

      <div className="op-brand" data-opening-brand>
        <span className="op-brand__label">{OPENING_COPY.developerLabel}</span>
        <img
          className="op-brand__mark"
          src={OPENING_COPY.logoSrc}
          alt={OPENING_COPY.logoAlt}
          width={442}
          height={234}
          decoding="async"
        />
      </div>
    </div>
  )
}
