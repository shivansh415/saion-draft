import { FINAL_COPY } from '../../data/opening'

/**
 * The closing title, introduced only once the facade has completed.
 *
 * It sits to the left of the frame, over open sky, so the finished tower — which
 * stands dead centre in the supplied render — is never covered. The supporting
 * line is deliberately quiet: the building remains the subject.
 */
export function FinalReveal() {
  return (
    <div className="op-final" data-opening-final aria-hidden="false">
      <div className="op-final__inner">
        <h2 className="op-final__title">
          {FINAL_COPY.titleLines.map((line) => (
            <span className="op-line" key={line}>
              <span className="op-line__inner">{line}</span>
            </span>
          ))}
        </h2>

        <div className="op-rule op-rule--final" />

        <p className="op-final__meta">
          <span className="op-final__project">{FINAL_COPY.project}</span>
          <span className="op-final__location">{FINAL_COPY.location}</span>
        </p>
      </div>
    </div>
  )
}
