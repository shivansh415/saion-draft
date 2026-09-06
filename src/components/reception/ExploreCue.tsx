import { RECEPTION_COPY } from './receptionCopy'

interface Props {
  onExplore: () => void
}

/**
 * The way on from the clean building, straight into the lifestyle chapter:
 * the same small tracked capitals as the entrance cue, in the open ground of
 * the frame away from the door — low on the street at the left, or in the
 * sky's corner on a phone (see the stylesheet) — where it obstructs neither
 * the tower's hover nor the level rail. It rides the same states as the
 * entrance cue: present with the clean building, dimmed while the explorer
 * has the frame, gone once a plan is open or the journey has begun.
 *
 * Its press is the one `EXPLORE REPOSÉ` inside the lobby makes — the same
 * `onExplore`, so the chapter opens through its own loader whichever door
 * the visitor takes.
 */
export function ExploreCue({ onExplore }: Props) {
  return (
    <button
      type="button"
      className="rc-explore-cue"
      data-rc-explore-cue
      onClick={onExplore}
      aria-label={`${RECEPTION_COPY.explore} — the lifestyle`}
    >
      <span className="rc-cue__label">{RECEPTION_COPY.explore}</span>
      <span className="rc-cue__arrow" aria-hidden="true">
        →
      </span>
    </button>
  )
}
