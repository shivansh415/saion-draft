/**
 * The chapter's botanical corners.
 *
 * Drawn rather than photographed. The supplied ERA reference puts a
 * photographic bougainvillea spray in two opposite corners of an ivory page;
 * borrowed as COMPOSITION only — corner mass, deep negative space, small
 * tracked capitals in the margins — because Reposé is not that project and a
 * magenta bougainvillea is not its palette. What sits in the corners here is
 * a slender olive spray in the chapter's own olive, drawn at a weight that
 * reads as an engraving rather than an illustration.
 *
 * Every leaf sits ON its stem, at that stem's own tangent: the branches are
 * real cubic Béziers and the leaves are sampled off them below, rather than
 * placed by hand and nearly right. Deterministic — no randomness at render,
 * so the two corners are stable across re-renders and screenshots.
 */

type Point = readonly [number, number]

/** A point on a cubic Bézier. */
function at(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
  ]
}

/** That curve's heading at t, in degrees — the angle a leaf grows from. */
function heading(p0: Point, p1: Point, p2: Point, p3: Point, t: number): number {
  const u = 1 - t
  const x = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0])
  const y = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1])
  return (Math.atan2(y, x) * 180) / Math.PI
}

interface Branch {
  readonly curve: readonly [Point, Point, Point, Point]
  /** How many leaf pairs to hang along it. */
  readonly leaves: number
  /** Where along the branch the leaves begin. */
  readonly from: number
  /** Leaf length at the base; they taper toward the tip. */
  readonly scale: number
  readonly width: number
}

/**
 * A fan, not a vine.
 *
 * Every branch leaves the SAME point just outside the corner and opens at its
 * own angle, so the drawing reads as one plant massed in the corner rather
 * than a single stem crossing the page. The first pass did the latter — one
 * long diagonal — and it cut straight through the title.
 *
 * The longest branch stops around two thirds of the viewBox for the same
 * reason: the corner is where the weight belongs, and the deep negative space
 * in the middle of the page is the composition.
 *
 * The shared origin sits well OUTSIDE the viewBox and each branch starts its
 * leaves a quarter of the way along. Both are for the same reason: with the
 * origin on canvas every stem visibly met at one dot and the drawing read as a
 * firework. What is in frame is the open half of the spray.
 */
const ORIGIN: Point = [-96, -92]

const BRANCHES: readonly Branch[] = [
  // Shallow, along the top edge.
  { curve: [ORIGIN, [92, 6], [196, 26], [306, 40]], leaves: 11, from: 0.24, scale: 40, width: 1.45 },
  // The two that carry the mass, into the body of the corner.
  { curve: [ORIGIN, [78, 44], [168, 96], [258, 146]], leaves: 11, from: 0.23, scale: 44, width: 1.5 },
  { curve: [ORIGIN, [52, 66], [116, 142], [176, 232]], leaves: 10, from: 0.24, scale: 41, width: 1.4 },
  // Steep, down the left edge.
  { curve: [ORIGIN, [26, 78], [44, 162], [58, 262]], leaves: 10, from: 0.26, scale: 36, width: 1.2 },
  { curve: [ORIGIN, [2, 84], [-8, 176], [-16, 274]], leaves: 8, from: 0.3, scale: 31, width: 1.05 },
  // Two shorter fillers, offset from the origin, that close the gaps between
  // the long branches and give the cluster its density.
  { curve: [[8, -16], [82, 28], [150, 64], [222, 88]], leaves: 8, from: 0.22, scale: 30, width: 1 },
  { curve: [[-10, 6], [44, 62], [82, 122], [112, 190]], leaves: 7, from: 0.24, scale: 27, width: 0.95 },
]

/** A single leaf, pointed at both ends, drawn along +x from the origin. */
const LEAF = 'M0 0C6.6-7.4 18.4-9.6 26-8.2 21.4-2.2 10.6 2.6 0 0Z'

function Spray() {
  const leaves: React.ReactElement[] = []
  const buds: React.ReactElement[] = []

  BRANCHES.forEach((branch, b) => {
    const [p0, p1, p2, p3] = branch.curve
    for (let i = 0; i < branch.leaves; i++) {
      const t = branch.from + ((1 - branch.from) * i) / branch.leaves
      const [x, y] = at(p0, p1, p2, p3, t)
      const angle = heading(p0, p1, p2, p3, t)
      // Fullest near the corner and tapering toward the tip — which is what
      // puts the visual weight where the composition wants it.
      const size = (branch.scale * (1 - 0.42 * t)) / 26
      const lead = i % 2 === 0 ? 1 : -1
      for (const side of [-1, 1]) {
        leaves.push(
          <use
            key={`${b}-${i}-${side}`}
            href="#ri-leaf"
            transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(
              angle +
              side * (44 + lead * side * 11)
            ).toFixed(1)}) scale(${(size * (side === lead ? 1 : 0.82)).toFixed(3)})`}
          />,
        )
      }
      // A bud at every third node, not only at the tips: it is the small
      // irregularity that stops a drawn plant looking generated.
      if (i > 0 && i % 3 === 0) {
        buds.push(
          <circle key={`bud-${b}-${i}`} cx={x.toFixed(1)} cy={y.toFixed(1)} r={(2.6 * (1 - 0.4 * t)).toFixed(2)} />,
        )
      }
    }
    const [tx, ty] = at(p0, p1, p2, p3, 1)
    buds.push(<circle key={`tip-${b}`} cx={tx.toFixed(1)} cy={ty.toFixed(1)} r={b < 3 ? 4 : 3} />)
  })

  return (
    <>
      <g className="ri-botanical__stems">
        {BRANCHES.map((branch, i) => {
          const [p0, p1, p2, p3] = branch.curve
          return (
            <path
              key={i}
              d={`M${p0[0]} ${p0[1]}C${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]} ${p3[0]} ${p3[1]}`}
              strokeWidth={branch.width}
            />
          )
        })}
      </g>
      <g className="ri-botanical__leaves">{leaves}</g>
      <g className="ri-botanical__buds">{buds}</g>
    </>
  )
}

/**
 * `corner` places the spray. The drawing is authored once for the top-left and
 * turned 180° for the bottom-right, so the two corners are the same branch
 * seen from opposite ends of the page — which is what makes them read as a
 * pair rather than as two decorations.
 */
export function BotanicalCorner({ corner }: { corner: 'top-left' | 'bottom-right' }) {
  return (
    <svg
      className={`ri-botanical ri-botanical--${corner}`}
      viewBox="-40 -40 400 340"
      fill="none"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMinYMin meet"
    >
      <defs>
        <path id="ri-leaf" d={LEAF} />
      </defs>
      <Spray />
    </svg>
  )
}
