/**
 * The walkthrough — the films shown after the closing call.
 *
 * Everything the stage needs to know about a film is here, so adding the real
 * footage is a matter of filling in `src` (and, ideally, `poster`): the stage
 * shows a placeholder for any film whose `src` is still null and switches to
 * the real player the moment one is given.
 *
 * `src` should be the delivery URL — Cloudinary with `f_auto:video,q_auto`
 * (and an `sp_auto` streaming profile for anything over ~20 s). `poster` is a
 * frame from the same film (`so_0,f_auto` on Cloudinary) so nothing is fetched
 * until the visitor asks for the film itself.
 */

export interface WalkthroughFilm {
  readonly id: string
  /** The number on the stage: "01", "02". */
  readonly index: string
  /** Display serif, one short line. */
  readonly title: string
  /** Sans, under the title. */
  readonly subtitle: string
  /** Shown beside the index, e.g. "2:40". Null until the real film is in. */
  readonly duration: string | null
  /** The film itself. Null = placeholder. */
  readonly src: string | null
  /** A still from the film, shown before it plays. */
  readonly poster: string | null
}

export const WALKTHROUGH_FILMS: readonly WalkthroughFilm[] = [
  {
    id: 'exterior',
    index: '01',
    title: 'The Approach',
    subtitle: 'Al Furjan, the street, the arrival',
    duration: null,
    src: null,
    poster: null,
  },
  {
    id: 'interior',
    index: '02',
    title: 'Inside Reposé',
    subtitle: 'The lobby, the residence, the terrace',
    duration: null,
    src: null,
    poster: null,
  },
]

export const WALKTHROUGH_COPY = {
  /** The button on the closing call. */
  cue: 'Watch the walkthrough',
  /** Eyebrow over the stage. The project is dropped on a narrow screen. */
  eyebrowProject: 'Reposé Residence · ',
  eyebrow: 'The Walkthrough',
  close: 'Close',
  skip: 'Skip',
  previous: 'Previous film',
  next: 'Next film',
  /** On a placeholder frame. */
  placeholder: 'Film arriving soon',
  /** The strapline under the mark in the ident — from the supplied logo. */
  strap: 'Engineered · Excellence',
  properties: 'Properties',
} as const
