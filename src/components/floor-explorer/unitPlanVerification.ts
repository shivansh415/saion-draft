/**
 * Reposé Residence — floor explorer: residence → unit-plan links confirmed
 * from the artwork itself, over and above what `residences-map.json` marks
 * VERIFIED.
 *
 * The package leaves every Level 12–14 residence and two Level 15 residences
 * unlinked (`unitPlan: null`, NEEDS MANUAL VERIFICATION) because the A/B
 * badges printed on the detailed unit pages disagree with the A/B labels
 * printed on the complete floorplates. That is a LABEL conflict. The question
 * that matters for opening a drawing is a different one — does this detailed
 * plan depict this residence? — and for the links below it can be settled
 * from the supplied material alone, on three independent grounds:
 *
 *   1. Orientation labels. Every plate prints COMMUNITY GREEN VIEW on its
 *      left edge and STREET VIEW on its right. The `-b` detail plans print
 *      COMMUNITY GREEN VIEW; the `-b-prime` plans print STREET VIEW; the `-a`
 *      plans print neither (they are the centre residence, which touches
 *      neither side).
 *   2. Locator thumbnails. Each detail plan carries a key plan with its own
 *      residence in blue: centre for the `-a` plans (blue centred at 50% of
 *      the thumbnail on L12, L13, L14 and the L15 2-bed), the far left for
 *      `-b` and the L15 4-bed, the far right for `-b-prime` and the L15 3-bed.
 *   3. Geometry. The `-a` plans are the wide centre residence (3.9k px wide
 *      with the balcony spanning the full width, walk-in closet, three
 *      bedrooms in a row); the `-b`/`-b-prime` plans are the narrower L-shaped
 *      wing residences, mirror images of one another. Printed room sizes
 *      agree with the plate zone they are matched to (e.g. L12 centre:
 *      LIVING + DINING 5.7×6.5 m, W.I.C. 3.0×1.8 m on both).
 *
 * So each link below pairs a residence with the ONE supplied plan that draws
 * it. What is NOT resolved is which letter it should be called: the plate
 * says A / A′ / B (and C on Level 15), the sheet says B / B′ / A (and B).
 * The explorer therefore opens the drawing but does not assert a type letter
 * for these residences (see `variantIsInDispute`); it names the position
 * instead, which both sources agree on.
 *
 * l13-3bed-a-prime (Level 13, right wing) used to sit here as the one
 * residence deliberately NOT linked: page 46's right-hand plan was captioned
 * Level 14 and was the same drawing as Level 14 B′ on page 48, so wiring it
 * would have published one floor's apartment as another's. The 2026 brochure
 * revision settles that caption — page 46 now prints BOTH its plans as Level
 * 13, and supplies the mirrored right wing as B′ — so the link below follows
 * the brochure like every other.
 *
 * The one residual tension there has since been settled. That drawing's areas
 * used to equal Level 14 B′ exactly (1691.33 / 660.58 / 2351.91 sq ft), which
 * left open whether the floors genuinely share a right wing or the revision had
 * merely re-captioned Level 14's sheet. The 2026-09 revision re-prints page 46
 * right with a balcony and total of its own — 670.91 / 2362.24 sq ft — while
 * page 48 still prints 660.58 / 2351.91. The two floors' right wings are now
 * stated as different apartments, and the link below rests on the figures as
 * well as the caption.
 *
 * `residences-map.json` is left exactly as delivered; this file is the
 * audit trail for the promotions and is easy to revoke line by line.
 */

export interface ConfirmedLink {
  /** `unitPlans` id in residences-map.json. */
  readonly unitPlanId: string
  /** What settled it. */
  readonly evidence: string
  /**
   * The residence's type letter, where the brochure has since settled it.
   *
   * Present only when the two sources no longer contradict each other. While
   * it is absent the link still opens the drawing, but the explorer names the
   * residence by its position rather than asserting a letter neither source
   * agrees on — see `variantIsInDispute`.
   */
  readonly variant?: string
}

export const confirmedUnitPlans: Readonly<Record<string, ConfirmedLink>> = {
  // Level 12
  'l12-3bed-a': {
    unitPlanId: 'up-l12-3bhk-maidroom-b',
    evidence: 'Left wing: sheet prints COMMUNITY GREEN VIEW; locator blue at far left; L-shaped wing geometry; rooms match the plate zone.',
  },
  'l12-3bed-b': {
    unitPlanId: 'up-l12-3bhk-maidroom-a',
    evidence: 'Centre: locator blue centred; wide centre geometry with full-width balcony and W.I.C.; LIVING + DINING 5.7×6.5 m on both.',
  },
  'l12-3bed-a-prime': {
    unitPlanId: 'up-l12-3bhk-maidroom-b-prime',
    evidence: 'Right wing: sheet prints STREET VIEW; locator blue at far right; mirror of the left-wing plan.',
  },
  // Level 13
  'l13-3bed-a': {
    unitPlanId: 'up-l13-3bhk-maidroom-b',
    evidence: 'Left wing: sheet prints COMMUNITY GREEN VIEW; locator blue at far left; wing geometry matches the plate zone.',
  },
  'l13-3bed-b': {
    unitPlanId: 'up-l13-3bhk-maidroom-a',
    evidence: 'Centre: locator blue centred; wide centre geometry with full-width balcony and W.I.C.',
  },
  'l13-3bed-a-prime': {
    unitPlanId: 'up-l13-3bhk-maidroom-b-prime',
    evidence:
      'Right wing: sheet prints STREET VIEW; locator blue at far right; mirror of the left-wing plan. Captioned Level 13 by the 2026 brochure revision (page 46 right), which supersedes the earlier Level 14 caption.',
  },
  // Level 14
  'l14-3bed-a': {
    unitPlanId: 'up-l14-3bhk-maidroom-b',
    evidence: 'Left wing: sheet prints COMMUNITY GREEN VIEW; locator blue at far left; wing geometry matches the plate zone.',
  },
  'l14-3bed-b': {
    unitPlanId: 'up-l14-3bhk-maidroom-a',
    evidence: 'Centre: locator blue centred; wide centre geometry with full-width balcony and W.I.C.',
  },
  'l14-3bed-a-prime': {
    unitPlanId: 'up-l14-3bhk-maidroom-b-prime',
    evidence: 'Right wing: sheet prints STREET VIEW; locator blue at far right; mirror of the left-wing plan.',
  },
  // Level 15
  'l15-2bed-c': {
    unitPlanId: 'up-l15-2bhk-maidroom-b',
    evidence: 'Centre: locator blue centred; wide centre geometry; LIVING + DINING 5.7×6.5 m and W.I.C. 3.0×1.8 m on both. Plate calls it C, sheet B.',
  },
  'l15-3bed-variant-unstated': {
    unitPlanId: 'up-l15-3bhk-penthouse-jacuzzi-a',
    evidence:
      'Right wing: sheet prints STREET VIEW; locator blue at far right; the package itself records the locator as verifying this residence. The plate prints no type letter.',
    // The sheet badged this A until the 2026-09 revision, which collided with
    // the 4-bedroom penthouse A on the same floor; it now badges it C, and the
    // floor's three sheets read A / B / C from left to right. The plate prints
    // nothing here, so there is no second source to disagree.
    variant: 'C',
  },
}

/**
 * True when the two brochure sources disagree about the residence's letter
 * (or the plate prints none), so no "Type X" should be asserted for it.
 *
 * A link that carries its own `variant` is the exception: the brochure has
 * settled that residence's letter since, and it is stated like any other.
 */
export const variantIsInDispute = (residenceId: string, notes: string, variant: string | null): boolean => {
  const settled = confirmedUnitPlans[residenceId]?.variant
  if (settled) return false
  return residenceId in confirmedUnitPlans || variant === null || /floorplate says/i.test(notes)
}
