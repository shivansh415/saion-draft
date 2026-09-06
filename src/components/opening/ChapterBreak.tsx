import { CHAPTER_COPY } from '../../data/opening'

/**
 * The chapter card that carries the film from the approach into the build.
 *
 * Every layer here rests at zero — invisible, untransformed, painting nothing —
 * and is driven entirely by the scrubbed timeline in `OpeningExperience`
 * (see the `CHAPTER_BREAK` beats). Scroll forward and it assembles; scroll back
 * and it disassembles, because there is no state, only position.
 *
 * The layers, back to front:
 *
 *   veil    the darkness the picture is exchanged behind. It stops at 96%
 *           rather than pure black: a frame that goes fully black reads as a
 *           dropout, whereas a trace of the site underneath reads as depth.
 *   field   the drafting language — a subtle grid and five thin vertical
 *           lines, the flattest possible nod to a section drawing. It is a
 *           texture, not a diagram, and it is gone before the build begins.
 *   type    the card itself, centred. The two title moments either side of it
 *           are anchored left; centring this one is what marks it as an
 *           interstitial rather than a third title.
 *   sweep   one pass of light across the frame. One, because a second would
 *           make it an effect.
 */

/** Where the vertical lines stand, as % of the frame. Uneven on purpose. */
const RULES = [11, 27, 50, 73, 89]

export function ChapterBreak() {
  return (
    <div className="cb">
      <div className="cb__veil" data-cb-veil aria-hidden="true" />

      <div className="cb__field" data-cb-field aria-hidden="true">
        <div className="cb__grid" />
        {RULES.map((left) => (
          <span className="cb__rule" data-cb-rule key={left} style={{ left: `${left}%` }} />
        ))}
      </div>

      <div className="cb__type" data-cb-type>
        <h2 className="cb__title">
          {CHAPTER_COPY.titleLines.map((line) => (
            <span className="op-line" key={line}>
              <span className="op-line__inner" data-cb-line>
                {line}
              </span>
            </span>
          ))}
        </h2>

        <div className="cb__hrule" data-cb-hrule />

        <p className="cb__meta" data-cb-meta>
          <span className="cb__project">{CHAPTER_COPY.project}</span>
          <span className="cb__location">{CHAPTER_COPY.location}</span>
        </p>
      </div>

      <div className="cb__sweep" data-cb-sweep aria-hidden="true" />
    </div>
  )
}
