/**
 * The walkthrough — the films shown after the closing call.
 *
 * Everything the stage needs to know about a film is here: the stage shows a
 * placeholder for any film whose `src` is still null and switches to the real
 * player the moment one is given.
 *
 * All three films are now in. They are the supplied unit walkthroughs — the
 * one-bedroom, two-bedroom and three-bedroom layouts, each opening on the
 * floorplate and moving through the finished rooms, with the narration and
 * the burnt-in captions the client delivered.
 *
 * `src` is a path under `public/`, so the films are served from the same
 * origin as the site and nothing depends on a third party staying up. The
 * masters the client supplied run to 173MB–275MB and, in the case of the two
 * 4K HEVC ones, play in almost no browser; they are kept out of the
 * deployment in `media-src/` (gitignored, beside the interiors and amenity
 * masters) and what ships here is the 1080p H.264 encode of each — `-crf 25
 * -preset slow`, `+faststart` so playback can begin on the first range
 * request rather than after the whole file.
 *
 * `poster` is a still from the film itself, so the frame is composed before a
 * byte of video is asked for: the stage's player is `preload="metadata"`, so
 * the poster is all that loads until the visitor presses play.
 */

export interface WalkthroughFilm {
  readonly id: string
  /** The number on the stage: "01", "02", "03". */
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
    id: 'one-bedroom',
    index: '01',
    title: 'The One-Bedroom',
    subtitle: 'The plan, the living and dining, the terrace',
    duration: '0:59',
    src: '/assets/walkthrough/one-bedroom-walkthrough.mp4',
    poster: '/assets/walkthrough/one-bedroom-walkthrough-poster.webp',
  },
  {
    id: 'two-bedroom',
    index: '02',
    title: 'The Two-Bedroom',
    subtitle: 'The plan, both bedrooms, the maid’s room',
    duration: '1:24',
    src: '/assets/walkthrough/two-bedroom-walkthrough.mp4',
    poster: '/assets/walkthrough/two-bedroom-walkthrough-poster.webp',
  },
  {
    id: 'three-bedroom',
    index: '03',
    title: 'The Three-Bedroom',
    subtitle: 'The plan, the living and dining, the dressing room',
    duration: '1:20',
    src: '/assets/walkthrough/three-bedroom-walkthrough.mp4',
    poster: '/assets/walkthrough/three-bedroom-walkthrough-poster.webp',
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
