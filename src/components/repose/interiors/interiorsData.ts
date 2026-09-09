/**
 * Reposé Residence — the residence chapter's four interiors.
 *
 * Presentation copy only. Nothing here is a project claim: the titles and the
 * single lines under them are editorial, supplied at the final review, and the
 * films and posters are the client's own of these rooms.
 *
 * FOUR rooms, each its own card and its own film. Living and bedroom are not
 * combined: the client asked for them separated, and both films were supplied.
 * The line that once covered the pair ("Spaces made to live in. Rooms made to
 * return to.") splits across the two, one sentence each.
 */

export interface Interior {
  /** Stable id — the anchor, the card's key and the film's own element. */
  readonly id: 'kitchen' | 'living-room' | 'bedroom' | 'bathroom'
  /** The editorial numeral on the card. */
  readonly index: string
  /** On the card. */
  readonly name: string
  /** The card's own invitation. */
  readonly cue: string
  /** Over the film. */
  readonly title: string
  /** The one line under it. */
  readonly line: string
  /** Small metadata over the film, bottom left. */
  readonly meta: string
  readonly video: string
  /** The card's poster — 1000w, the size a card is actually painted at. */
  readonly card: string
  /** The film's own poster — 1600w, painted before the first video frame. */
  readonly still: string
  readonly alt: string
}

const BASE = '/assets/interiors'

export const INTERIORS: readonly Interior[] = [
  {
    id: 'kitchen',
    index: '01',
    name: 'The Kitchen',
    cue: 'Explore the kitchen',
    title: 'The Kitchen',
    line: 'Designed around the rhythm of everyday living.',
    meta: 'Italian modular kitchen · German appliances',
    video: `${BASE}/kitchen.mp4`,
    card: `${BASE}/kitchen-card.webp`,
    still: `${BASE}/kitchen-still.webp`,
    alt: 'The Reposé kitchen — stone island, integrated appliances and warm timber',
  },
  {
    id: 'living-room',
    index: '02',
    name: 'The Living Room',
    cue: 'Step inside',
    title: 'The Living Room',
    line: 'Spaces made to live in.',
    meta: '3.65 m floor-to-ceiling · Spacious balconies',
    video: `${BASE}/living-room.mp4`,
    card: `${BASE}/living-room-card.webp`,
    still: `${BASE}/living-room-still.webp`,
    alt: 'The Reposé living room, opening onto the balcony',
  },
  {
    id: 'bedroom',
    index: '03',
    name: 'The Bedroom',
    cue: 'Step inside',
    title: 'The Bedroom',
    line: 'Rooms made to return to.',
    meta: 'Full-height glazing · Natural light',
    video: `${BASE}/bedroom.mp4`,
    card: `${BASE}/bedroom-card.webp`,
    still: `${BASE}/bedroom-still.webp`,
    alt: 'A Reposé bedroom with soft furnishings and full-height glazing',
  },
  {
    id: 'bathroom',
    index: '04',
    name: 'The Bathroom',
    cue: 'Discover the details',
    title: 'The Bathroom',
    line: 'A private ritual, refined.',
    meta: 'Crafted stone · Considered fittings',
    video: `${BASE}/bathroom.mp4`,
    card: `${BASE}/bathroom-card.webp`,
    still: `${BASE}/bathroom-still.webp`,
    alt: 'The Reposé bathroom — stone surfaces and recessed lighting',
  },
]

export const INTERIOR_BY_ID = new Map(INTERIORS.map((room) => [room.id, room]))
export type InteriorId = Interior['id']

/** The chapter's own words, in one place. */
export const RESIDENCE_COPY = {
  eyebrow: 'The residence',
  title: ['Step inside', 'the everyday.'],
  lead: 'Four rooms, and the life they are drawn around.',
  place: 'Reposé Residence · Al Furjan, Dubai',
  select: 'Select a room',
  /** On the tail, where the chapter hands over to the amenities. */
  onward: 'Continue',
  next: 'The amenities',
  /** The film's one control. */
  back: 'Interiors',
} as const
