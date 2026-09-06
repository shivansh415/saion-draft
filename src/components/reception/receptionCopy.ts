/**
 * Every word the reception entry shows.
 */

export const RECEPTION_COPY = {
  /** The wayfinding cue at the entrance. Rendered in tracked capitals. */
  enter: 'Enter inside',
  /** From the lobby, back to the street. */
  back: 'Back outside',
  /** Offered once the lobby has settled. Kept to a line. */
  welcome: 'Welcome to Reposé',
  /** From the lobby, on into the lifestyle chapter. Rendered in tracked capitals. */
  explore: 'Explore Reposé',
  receptionAlt: 'Reposé Residence reception — SAION Properties',
  buildingAlt: 'Reposé Residence, the entrance',
} as const

export const RECEPTION_ASSETS = {
  building: '/assets/reception-entry/building-final.webp',
  reception: '/assets/reception-entry/reception-final.webp',
} as const
