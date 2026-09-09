/**
 * Reposé Residence — the terrace's interactive zones.
 *
 * Each entry names a LOGICAL AMENITY NODE of the supplied GLB (see
 * `repose-terrace/model/manifest.json` → `zones[].amenityId`); the scene
 * resolves a raycast hit to one of these through the package's own
 * `findAmenity`, so nothing here has to know about primitive child names.
 *
 * The vocabulary is deliberately narrow. A zone appears here only where the
 * brochure or the supplied model names it — the pool, the courts, the play
 * and exercise zones, the walking track and the planted garden are all in one
 * or both. Nothing is asserted about the terrace that neither source says.
 *
 * `video` is the slot the finished amenity films drop into. Until one is
 * supplied the detail plays its `poster`, which is either the brochure's own
 * photograph of that amenity or a crop of the supplied terrace plan at the
 * zone's own source bounds (`scripts/terrace-plates.py`). Adding a film is
 * one line — `video: '/assets/terrace/video/pool.mp4'` — and nothing else in
 * the chapter changes.
 */

export interface TerraceAmenity {
  /** Stable id for this hotspot, used by the UI and the portal. */
  readonly id: string
  /** The logical amenity node in the GLB. */
  readonly meshName: string
  /** The editorial numeral, in reading order around the terrace. */
  readonly index: string
  readonly label: string
  /** One line under the label in the detail. Brochure- or model-supported. */
  readonly note: string
  /** Shown until a film is supplied, and as the film's own poster after that. */
  readonly poster: string
  /** The finished amenity film, when there is one. */
  readonly video?: string
}

export const TERRACE_AMENITIES: readonly TerraceAmenity[] = [
  {
    id: 'pool',
    meshName: 'Main_Pool',
    index: '01',
    label: 'Swimming pool',
    note: 'An all-weather swimming pool, a kids’ splash zone and a jacuzzi.',
    poster: '/assets/repose-experience/pool-01.webp',
  },
  {
    id: 'sports-court',
    meshName: 'Sports_Court',
    index: '02',
    label: 'Sports court',
    note: 'The marked court on the terrace, north of the core.',
    poster: '/assets/terrace/plate-sports-court.webp',
  },
  {
    id: 'garden',
    meshName: 'Landscape_07',
    index: '03',
    label: 'Garden',
    note: 'The planted garden at the heart of the terrace.',
    poster: '/assets/terrace/plate-garden.webp',
  },
  {
    id: 'play-area',
    meshName: 'Play_Area',
    index: '04',
    label: 'Play area',
    note: 'The children’s play and climbing zone.',
    poster: '/assets/repose-experience/kids-play-01.webp',
  },
  {
    id: 'fitness',
    meshName: 'Fitness_Area',
    index: '05',
    label: 'Fitness area',
    note: 'Open-air exercise, beside the play zone.',
    poster: '/assets/terrace/plate-fitness.webp',
  },
  {
    id: 'walking-track',
    meshName: 'Walking_Track',
    index: '06',
    label: 'Walking track',
    note: 'The track along the terrace’s southern edge.',
    poster: '/assets/repose-experience/walking-track-01.webp',
  },
]

/** By hotspot id. */
export const AMENITY_BY_ID = new Map(TERRACE_AMENITIES.map((amenity) => [amenity.id, amenity]))

/** By the GLB's own amenity node name — how a raycast hit is named. */
export const AMENITY_BY_MESH = new Map(TERRACE_AMENITIES.map((amenity) => [amenity.meshName, amenity]))
