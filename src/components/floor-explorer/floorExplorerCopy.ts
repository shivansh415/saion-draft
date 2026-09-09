/**
 * Every word the floor explorer shows, in one place.
 */

export const EXPLORER_COPY = {
  title: ['Explore', 'Residences'],
  lead: 'Select a level to discover the residences.',
  open: 'View floorplate',
  /** The touch invitation over the tower. A pointer gets the hover instead. */
  invite: 'Explore residences',
} as const

export const PLATE_COPY = {
  back: 'Back to building',
  shared: 'Floorplate shared with',
  /** Under the level, while the plan is open. */
  lead: 'Select a residence.',
  openUnit: 'View residence',
  /** For residences whose unit plan the package has not verified. */
  pending: 'Detailed plan to follow',
} as const

/** The drawing viewer's one control, shared by the floorplate and the residence plan. */
export const VIEWER_COPY = {
  reset: 'Reset view',
  /** Read to assistive technology on the viewport. */
  hint: 'Scroll or pinch to zoom, drag to pan, double-click to step in and out',
} as const

export const RESIDENCE_COPY = {
  back: 'Back to floor',
  view3d: 'View in 3D',
  /** The same control, once the plan is standing up. */
  view2d: 'View in 2D',
  /** For residences no render is supplied for — the control is a placeholder there. */
  view3dNote: 'Coming soon',
  floorplate: 'Floorplate',
  position: 'Position',
} as const

/**
 * The terrace — the destination above Level 15. Not a level, so it has its
 * own words rather than borrowing the rail's.
 */
export const TERRACE_COPY = {
  /** How it reads in the level rail, above 15. */
  rail: 'TR',
  label: 'Open terrace',
  /** The readout under the copy, where a level's residence types would be. */
  types: 'Podium amenity level',
  open: 'View terrace',
} as const
