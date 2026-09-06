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
  view3dNote: 'Coming soon',
  floorplate: 'Floorplate',
  position: 'Position',
} as const
