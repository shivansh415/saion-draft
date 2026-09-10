/**
 * Reposé Residence — the official amenity list.
 *
 * The twelve names are the client's own, in the order they were supplied,
 * and they are not paraphrased: `name` is transcribed exactly. `note` is
 * editorial presentation, and `group` is a reading structure for the index —
 * neither asserts anything the brochure or the supplied list does not.
 *
 * `image` is what the index shows beside a row. Where the project has a
 * photograph of that amenity it is used; where it does not — the padel court
 * and the cricket simulator — the row shows the podium plan, which is the
 * client's own drawing of the level they sit on, rather than an unrelated
 * stock-looking substitute. It is the same drawing the map chapter presents.
 */

export interface Amenity {
  readonly id: string
  /** Exactly as supplied. */
  readonly name: string
  readonly group: string
  /** One presentation line, shown while the row is being read. */
  readonly note: string
  /**
   * The plate beside the row, one of two ways.
   *
   * `photo` names a picture in the chapter's own folder, which ships avif /
   * webp / jpg at two widths — so it goes through `<Photo>` and resolves to
   * the same candidate the loader warmed. `src` is a single file elsewhere on
   * the site (the terrace plates, the map, and `walking-track-01`, which ships
   * webp only), rendered as a plain `<img>`. Exactly one is set.
   */
  readonly photo?: string
  readonly src?: string
  readonly alt: string
}

/** What the index paints its plate at — stated once, because `sizes` is half
 *  of what decides which candidate the browser fetches, and the warm list in
 *  `experience.ts` has to agree with it. */
export const PLATE_SIZES = '42vw'

const REPOSE = '/assets/repose-experience'
const TERRACE = '/assets/terrace'
/**
 * The amenity photographs supplied at the final review — the client's own
 * pictures of the jacuzzi, the outdoor gym, the play area and the cricket
 * simulator, which until now were standing on the podium drawing or on a
 * neighbouring amenity's photograph.
 *
 * `web/` holds what the site loads: the same pictures re-encoded at 1100w,
 * because the supplied files are 1122 × 1402 at ~2.5 MB each and a 42vw plate
 * can use a tenth of that. They are in a subfolder rather than beside the
 * originals deliberately — a lower-case derivative sitting next to a
 * capitalised original ("jacuzzi.webp" beside "Jacuzzi.webp") is the same file
 * on a Mac and two different files on the Linux box that serves the site, so
 * it works locally and 404s in production. The subfolder makes that
 * impossible; `tools/check-assets.mjs` now matches case exactly as well.
 */
const AMENITY_PLATES = '/assets/amenities/web'
/** The supplied top-down amenities map, and the fallback for the two courts. */
export const AMENITIES_MAP = '/assets/amenities/map.webp'

export const AMENITIES: readonly Amenity[] = [
  { id: 'zen-garden', name: 'Zen Garden', group: 'Stillness', note: 'Stone paths and planting, away from everything.', photo: 'zen-garden-01', alt: 'The Reposé zen garden' },
  { id: 'yoga-studio', name: 'Yoga Studio', group: 'Stillness', note: 'A room for breath and balance.', photo: 'yoga-01', alt: 'The Reposé yoga studio' },
  { id: 'gym', name: 'Modern Well Equipped Gym', group: 'Movement', note: 'Strength and functional training, indoors.', photo: 'gym-01', alt: 'The equipped gym at Reposé' },
  { id: 'walking-track', name: 'Walking Track', group: 'Movement', note: 'A loop for the beginning or the end of a day.', src: `${REPOSE}/walking-track-01.webp`, alt: 'The walking track on the podium level' },
  { id: 'adults-pool', name: 'Adults Swimming Pool', group: 'Water', note: 'An all-weather pool on the podium level.', photo: 'pool-01', alt: 'The all-weather swimming pool' },
  { id: 'steam-room', name: 'Steam Room With Personal Lockers', group: 'Stillness', note: 'Warmth, quiet, and somewhere to leave the day.', photo: 'steam-room-01', alt: 'The steam room and personal lockers' },
  { id: 'open-terrace', name: 'Open Terrace for Socials', group: 'Together', note: 'A table for friends, and an afternoon that lingers.', photo: 'open-terrace-01', alt: 'The open terrace, set for company' },
  { id: 'jacuzzi', name: 'Jacuzzi', group: 'Water', note: 'A warm corner of the podium.', src: `${AMENITY_PLATES}/jacuzzi.webp`, alt: 'The jacuzzi on the podium level' },
  { id: 'adults-outdoor-gym', name: 'Adults Outdoor Gym', group: 'Movement', note: 'Open-air exercise, in the shade of the planting.', src: `${AMENITY_PLATES}/adults-outdoor-gym.webp`, alt: 'The outdoor gym at Reposé' },
  { id: 'kids-play', name: 'Kids Play Area', group: 'Together', note: 'Room for their adventures.', src: `${AMENITY_PLATES}/kids-play-area.webp`, alt: 'The children’s play area' },
  { id: 'padel-court', name: 'Padel Court', group: 'Movement', note: 'The marked court on the podium.', src: `${TERRACE}/plate-sports-court.webp`, alt: 'The marked court on the project drawing' },
  { id: 'cricket-simulator', name: 'Cricket Simulator', group: 'Movement', note: 'A net and a game, without leaving home.', src: `${AMENITY_PLATES}/cricket-simulator.webp`, alt: 'The cricket simulator' },
]

/** The plates the index shows first, and so the ones the loader waits on. */
export const INDEX_CRITICAL = ['zen-garden-01', 'yoga-01'] as const
/** The rest, in the order the index reaches them. */
export const INDEX_DEFERRED = ['gym-01', 'pool-01', 'steam-room-01', 'open-terrace-01'] as const

/** The index's own words. */
export const INDEX_COPY = {
  number: '01',
  eyebrow: 'The amenity collection',
  title: ['Twelve ways', 'to spend a day.'],
  lead: 'Everything at Reposé sits on one level, a lift ride from your door.',
  count: 'Twelve amenities · Podium level',
} as const

/** The map chapter's own words. */
export const MAP_COPY = {
  number: '09',
  eyebrow: 'Amenities map',
  title: ['Everything', 'within reach.'],
  lead: 'The podium level, drawn as it is built.',
  note: 'Indicative layout, from the supplied project drawing.',
} as const

/**
 * The few marks placed on the map.
 *
 * Only where the drawing is unambiguous — the pool and the jacuzzi beside it,
 * the marked court, the play zone and the track along the southern edge. The
 * remaining amenities are on this level too and are deliberately NOT guessed
 * at: a label in the wrong place on the client's own drawing is worse than no
 * label. Positions are per cent of the image, so they hold at every crop.
 */
export const MAP_MARKS: readonly { id: string; label: string; x: number; y: number }[] = [
  { id: 'adults-pool', label: 'Adults Swimming Pool', x: 22, y: 42 },
  // Corrected at the client's review. The water beside the adults' pool was
  // labelled Jacuzzi; it is the KIDS' SWIMMING POOL. The mark keeps its dot
  // exactly where it was — only the name changed, and `x` moves with it
  // because a mark is centred on the whole dot-and-label row, so a longer
  // label would otherwise drag the dot off the water.
  { id: 'kids-pool', label: 'Kids Swimming Pool', x: 40.4, y: 16 },
  { id: 'padel-court', label: 'Padel Court', x: 54, y: 13 },
  { id: 'kids-play', label: 'Kids Play Area', x: 86, y: 62 },
  { id: 'walking-track', label: 'Walking Track', x: 60, y: 84 },
  // The actual jacuzzi: the round tub on the deck at the south-west corner,
  // which the client marked. Its dot sits at 20% / 88% of the drawing; `x`
  // carries the same row-centring allowance as the marks above.
  { id: 'jacuzzi', label: 'Jacuzzi', x: 23.6, y: 88 },
]
