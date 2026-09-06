/**
 * Reposé Residence — floor explorer: data.
 *
 * The supplied asset package under `public/floor-explorer/` is the single
 * source of truth. Nothing in the explorer hard-codes a level → floorplate
 * relationship: the selector is built from `floor-selector.json`, each level is
 * then resolved through `residences-map.json` (its floorplate registry entry,
 * floor group and residence set), and shared floorplates resolve to the same
 * asset rather than a copy.
 *
 * Both files are fetched from `public/` exactly as delivered — no build-time
 * copy that could drift from the package — and cached for the session.
 */

import { useEffect, useState } from 'react'

import type { LevelId } from './levelCalibration'
import { unitHotspots } from './unitHotspots'
import type { Point } from './unitHotspots'
import { confirmedUnitPlans, variantIsInDispute } from './unitPlanVerification'

/* ------------------------------------------------------------------ *
 * Package location
 * ------------------------------------------------------------------ */

export const FLOOR_EXPLORER_BASE = '/floor-explorer/repose-floor-explorer-assets/'

const SELECTOR_URL = `${FLOOR_EXPLORER_BASE}floor-selector.json`
const RESIDENCES_URL = `${FLOOR_EXPLORER_BASE}residences-map.json`

/** Resolves a package-relative file (as written in the JSON) to a URL. */
export const assetUrl = (relative: string): string => FLOOR_EXPLORER_BASE + relative

/**
 * Relit copies of the drawings for the dark ground — same file names, paper
 * keyed out, ink relit — produced by `scripts/relight-plans.py` from the
 * package files, which stay untouched. See that script for exactly what a
 * relit copy is and is not.
 */
export const RELIT_BASE = '/floor-explorer/relit/'
export const relitUrl = (relative: string): string =>
  RELIT_BASE + relative.replace(/^floorplates-web\//, 'floorplates/').replace(/^units-web\//, 'units/')

/* ------------------------------------------------------------------ *
 * Asset presentation
 * ------------------------------------------------------------------ */

/**
 * Every drawing exists in two copies, and this is the only place that knows
 * both: the exact supplied file on white paper (`original`, from
 * `floorplates-web/` and `units-web/`, never altered) and the relit copy
 * (`transparent`, paper keyed out, for the dark ground).
 */
export interface PlanImages {
  /** The exact supplied WebP — white background, untouched. */
  readonly original: string
  /** The relit copy over transparency. */
  readonly transparent: string
}

export type PlanPresentation = keyof PlanImages

/**
 * Which copy each kind of drawing is shown as. Floorplates float over the
 * scene, so they take the transparent copy; a residence's plan is read as a
 * sheet, so it is shown exactly as supplied, on its own white paper. Change
 * it here, nowhere else — no component names a copy directly.
 */
export const PLAN_PRESENTATION = {
  floorplate: 'transparent',
  unitPlan: 'original',
} as const satisfies Record<'floorplate' | 'unitPlan', PlanPresentation>

/** Both copies of one package file. */
export const planImages = (relative: string): PlanImages => ({
  original: assetUrl(relative),
  transparent: relitUrl(relative),
})

/** The copy a floorplate is shown as. */
export const floorplateImage = (plate: Floorplate): string => plate.images[PLAN_PRESENTATION.floorplate]

/** The copy a residence's plan is shown as, or null while the link is unverified. */
export const unitPlanImage = (hotspot: UnitHotspot): string | null =>
  hotspot.plan ? hotspot.plan[PLAN_PRESENTATION.unitPlan] : null

/**
 * What to show if the presented copy fails to load: the other copy, which
 * is always the supplied file or derived from it.
 */
export const planFallback = (images: PlanImages, presentation: PlanPresentation): string =>
  images[presentation === 'transparent' ? 'original' : 'transparent']

/* ------------------------------------------------------------------ *
 * Shapes of the supplied files (only what the explorer reads)
 * ------------------------------------------------------------------ */

export type MappingStatus = 'VERIFIED' | 'NEEDS MANUAL VERIFICATION'

interface SelectorFile {
  readonly levels: readonly {
    readonly level: string
    readonly label: string
    readonly floorplate: string
    readonly residences: readonly string[]
    readonly sharedWith: readonly string[]
    readonly sharesFloorplate: boolean
    readonly unitPlanMappingStatus: MappingStatus
  }[]
}

interface ResidencesFile {
  readonly unitPlans: Readonly<
    Record<
      string,
      {
        readonly id: string
        readonly file: string
        readonly masterFile: string
        readonly brochurePage: number
        readonly residenceType: string
        readonly brochureVariant: string | null
      }
    >
  >
  readonly floorplates: Readonly<
    Record<
      string,
      {
        readonly levels: readonly string[]
        readonly masterFile: string
        readonly webFile: string
        readonly brochurePage: number
      }
    >
  >
  readonly residenceSets: Readonly<Record<string, readonly ResidenceRecord[]>>
  readonly levels: readonly {
    readonly level: string
    readonly displayLabel: string
    readonly floorGroup: string
    readonly floorplateId: string
    readonly floorplate: string
    readonly sharedWith: readonly string[]
    readonly residenceSetId: string
    readonly residenceIds: readonly string[]
    readonly mappingStatus: MappingStatus
  }[]
}

/** One residence as it appears on a floorplate, exactly as the package states it. */
export interface ResidenceRecord {
  readonly id: string
  readonly name: string
  readonly bedrooms: string
  /** "A", "B′" … or null where the brochure prints no variant. */
  readonly variant: string | null
  readonly floorplatePosition: string
  readonly unitPlanId: string | null
  /** Package-relative unit plan, or null when the brochure mapping is uncertain. */
  readonly unitPlan: string | null
  readonly mappingStatus: MappingStatus
  readonly notes: string
  /** Offered only while the link is uncertain; never shown to a visitor. */
  readonly candidateUnitPlanId?: string
  readonly candidateUnitPlan?: string
}

/* ------------------------------------------------------------------ *
 * The model the explorer renders from
 * ------------------------------------------------------------------ */

/**
 * A residence's region on its floorplate — the polygon from `unitHotspots.ts`
 * joined to the residence record it names — plus whether it may open.
 *
 * `plan` is set when the package marks the link VERIFIED, or when
 * `unitPlanVerification.ts` confirms it from the artwork (orientation labels,
 * locator thumbnails and geometry — see that file). One residence remains
 * without a plan because none is supplied for it: Level 13's right wing.
 *
 * `typeLabel` is "Type A" only where the plate and the detail sheet agree on
 * the letter; where they disagree (Levels 12–15) it is null and the position
 * stands in, which both sources agree on.
 */
export interface UnitHotspot {
  readonly residence: ResidenceRecord
  readonly polygon: readonly Point[]
  /** Where the tag sits, % of the image. */
  readonly labelAt: Point
  /** Both copies of the exact supplied unit plan, or null while unverified. */
  readonly plan: PlanImages | null
  /** "Type A" / "Type B′", or null while the letter is in dispute. */
  readonly typeLabel: string | null
  /** "Left wing", "Centre", "Inner right" … from the package's own position. */
  readonly positionLabel: string
  /** Letter to tag the zone with: the plate's own, or nothing. */
  readonly tag: string | null
}

export interface Floorplate {
  readonly id: string
  /** Both copies of the plate's web drawing. */
  readonly images: PlanImages
  readonly masterSrc: string
  readonly brochurePage: number
  /** Every level that uses this plate. */
  readonly levels: readonly LevelId[]
  readonly hotspots: readonly UnitHotspot[]
}

export interface Level {
  readonly id: LevelId
  /** "LEVEL 07" */
  readonly label: string
  /** "Levels 01, 05, 07 and 11" — the brochure's own wording. */
  readonly floorGroup: string
  readonly floorplate: Floorplate
  /** Residence type names, in the package's order, de-duplicated. */
  readonly residenceTypes: readonly string[]
  /** Every residence on the plate, with its unit-plan verification state. */
  readonly residences: readonly ResidenceRecord[]
  readonly sharedWith: readonly LevelId[]
  readonly sharesFloorplate: boolean
  readonly unitPlanMappingStatus: MappingStatus
}

export interface FloorExplorerModel {
  /** Top of the building first: 15 → 01. */
  readonly levels: readonly Level[]
  readonly byId: ReadonlyMap<LevelId, Level>
  readonly floorplates: readonly Floorplate[]
}

/* ------------------------------------------------------------------ *
 * Loading
 * ------------------------------------------------------------------ */

const isLevelId = (value: string): value is LevelId => /^(0[1-9]|1[0-5])$/.test(value)

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'force-cache' })
  if (!response.ok) throw new Error(`Floor explorer: ${url} responded ${response.status}`)
  return (await response.json()) as T
}

/**
 * A residence's plan: the package's own VERIFIED link, else a link confirmed
 * from the artwork in `unitPlanVerification.ts` — which must name a plan the
 * package actually supplies, and (where the package offers a candidate) the
 * same one it offers. Anything else stays null.
 */
export function resolvePlan(residence: ResidenceRecord, unitPlans: ResidencesFile['unitPlans']): string | null {
  if (residence.mappingStatus === 'VERIFIED' && residence.unitPlan) return residence.unitPlan
  const confirmed = confirmedUnitPlans[residence.id]
  if (!confirmed) return null
  const plan = unitPlans[confirmed.unitPlanId]
  if (!plan) throw new Error(`Floor explorer: confirmed link for ${residence.id} names unknown plan ${confirmed.unitPlanId}`)
  const offered = residence.unitPlanId ?? residence.candidateUnitPlanId ?? null
  if (offered && offered !== confirmed.unitPlanId) {
    throw new Error(`Floor explorer: confirmed link for ${residence.id} (${confirmed.unitPlanId}) contradicts the package (${offered})`)
  }
  return plan.file
}

const POSITION_LABELS: Readonly<Record<string, string>> = {
  'outer-left': 'Left wing',
  'inner-left': 'Inner left',
  'centre-left': 'Centre left',
  centre: 'Centre',
  'centre-right': 'Centre right',
  'inner-right': 'Inner right',
  'outer-right': 'Right wing',
}

/** The package's `floorplatePosition`, in words a visitor reads. */
export const positionLabel = (position: string): string =>
  POSITION_LABELS[position] ?? position.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

/** Area-weighted centroid of a polygon, % of the image. */
function centroid(polygon: readonly Point[]): Point {
  let area = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < polygon.length; i++) {
    const [x0, y0] = polygon[i]
    const [x1, y1] = polygon[(i + 1) % polygon.length]
    const cross = x0 * y1 - x1 * y0
    area += cross
    cx += (x0 + x1) * cross
    cy += (y0 + y1) * cross
  }
  if (Math.abs(area) < 1e-6) {
    const n = polygon.length
    return [polygon.reduce((s, p) => s + p[0], 0) / n, polygon.reduce((s, p) => s + p[1], 0) / n]
  }
  return [cx / (3 * area), cy / (3 * area)]
}

function build(selector: SelectorFile, residences: ResidencesFile): FloorExplorerModel {
  const detailByLevel = new Map(residences.levels.map((entry) => [entry.level, entry]))

  // Which residence set each plate carries; every level sharing a plate shares its set.
  const setByPlate = new Map<string, readonly ResidenceRecord[]>()
  for (const entry of residences.levels) {
    if (!setByPlate.has(entry.floorplateId)) {
      setByPlate.set(entry.floorplateId, residences.residenceSets[entry.residenceSetId] ?? [])
    }
  }

  const plateById = new Map<string, Floorplate>()
  for (const [id, plate] of Object.entries(residences.floorplates)) {
    const set = setByPlate.get(id) ?? []
    const hotspots: UnitHotspot[] = []
    for (const config of unitHotspots[id] ?? []) {
      const residence = set.find((candidate) => candidate.id === config.residenceId)
      if (!residence) throw new Error(`Floor explorer: hotspot ${config.residenceId} is not on floorplate ${id}`)
      if (config.polygon.length < 3) throw new Error(`Floor explorer: hotspot ${config.residenceId} needs a polygon`)
      const disputed = variantIsInDispute(residence.id, residence.notes, residence.variant)
      const planFile = resolvePlan(residence, residences.unitPlans)
      hotspots.push({
        residence,
        polygon: config.polygon,
        labelAt: config.labelAt ?? centroid(config.polygon),
        plan: planFile ? planImages(planFile) : null,
        typeLabel: disputed ? null : residenceVariant(residence),
        positionLabel: positionLabel(residence.floorplatePosition),
        tag: residence.variant,
      })
    }
    plateById.set(id, {
      id,
      images: planImages(plate.webFile),
      masterSrc: assetUrl(plate.masterFile),
      brochurePage: plate.brochurePage,
      levels: plate.levels.filter(isLevelId),
      hotspots,
    })
  }

  const levels: Level[] = []
  for (const entry of selector.levels) {
    if (!isLevelId(entry.level)) continue
    const detail = detailByLevel.get(entry.level)
    if (!detail) throw new Error(`Floor explorer: level ${entry.level} missing from residences-map.json`)

    const floorplate = plateById.get(detail.floorplateId)
    if (!floorplate) throw new Error(`Floor explorer: floorplate ${detail.floorplateId} not registered`)
    if (assetUrl(entry.floorplate) !== floorplate.images.original) {
      throw new Error(`Floor explorer: level ${entry.level} points at two different floorplates`)
    }

    const set = residences.residenceSets[detail.residenceSetId] ?? []
    const wanted = new Set(detail.residenceIds)

    levels.push({
      id: entry.level,
      label: entry.label,
      floorGroup: detail.floorGroup,
      floorplate,
      residenceTypes: Array.from(new Set(entry.residences)),
      residences: set.filter((residence) => wanted.has(residence.id)),
      sharedWith: entry.sharedWith.filter(isLevelId),
      sharesFloorplate: entry.sharesFloorplate,
      unitPlanMappingStatus: entry.unitPlanMappingStatus,
    })
  }

  // Top of the building first, whatever order the file happens to use.
  levels.sort((a, b) => Number(b.id) - Number(a.id))

  return {
    levels,
    byId: new Map(levels.map((level) => [level.id, level])),
    floorplates: Array.from(plateById.values()),
  }
}

let pending: Promise<FloorExplorerModel> | null = null

/** Loads and assembles the model once per session. */
export function loadFloorExplorerData(): Promise<FloorExplorerModel> {
  if (!pending) {
    pending = Promise.all([fetchJson<SelectorFile>(SELECTOR_URL), fetchJson<ResidencesFile>(RESIDENCES_URL)])
      .then(([selector, residences]) => build(selector, residences))
      .catch((error: unknown) => {
        pending = null // allow a retry after a transient failure
        throw error
      })
  }
  return pending
}

export type FloorExplorerDataState =
  | { readonly status: 'loading'; readonly model: null }
  | { readonly status: 'ready'; readonly model: FloorExplorerModel }
  | { readonly status: 'error'; readonly model: null; readonly error: unknown }

export function useFloorExplorerData(): FloorExplorerDataState {
  const [state, setState] = useState<FloorExplorerDataState>({ status: 'loading', model: null })

  useEffect(() => {
    let cancelled = false
    loadFloorExplorerData().then(
      (model) => {
        if (!cancelled) setState({ status: 'ready', model })
      },
      (error: unknown) => {
        if (!cancelled) setState({ status: 'error', model: null, error })
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  return state
}

/* ------------------------------------------------------------------ *
 * Copy helpers
 * ------------------------------------------------------------------ */

/** "1 BHK · 1 BHK + Study · 2 BHK + Maid Room" */
export const formatResidenceTypes = (types: readonly string[]): string => types.join(' · ')

/** "Type A", "Type B′" — or null where the brochure prints no variant. */
export const residenceVariant = (residence: ResidenceRecord): string | null =>
  residence.variant ? `Type ${residence.variant}` : null

/**
 * Dev-only note listing every residence that highlights but does not open,
 * with the package's own reason, so the state of the mapping is visible in
 * the console rather than silently baked in.
 */
export function logUnverifiedResidences(model: FloorExplorerModel): void {
  if (!import.meta.env.DEV) return
  const hotspots = model.floorplates.flatMap((plate) => plate.hotspots.map((hotspot) => ({ plate, hotspot })))
  const confirmed = hotspots.filter(({ hotspot }) => hotspot.plan && hotspot.residence.mappingStatus !== 'VERIFIED')
  const pending = hotspots.filter(({ hotspot }) => hotspot.plan === null)
  if (confirmed.length) {
    console.info(
      `Floor explorer: ${confirmed.length} residence link(s) confirmed from the artwork (see unitPlanVerification.ts):\n  ${confirmed
        .map(({ plate, hotspot }) => `${plate.id} · ${hotspot.residence.id} → ${confirmedUnitPlans[hotspot.residence.id]?.unitPlanId}`)
        .join('\n  ')}`,
    )
  }
  if (pending.length) {
    console.info(
      `Floor explorer: ${pending.length} residence(s) still open no unit plan:\n  ${pending
        .map(({ plate, hotspot }) => `${plate.id} · ${hotspot.residence.id}: ${hotspot.residence.notes || hotspot.residence.mappingStatus}`)
        .join('\n  ')}`,
    )
  }
}

/** "Levels 01, 05 & 11" */
export function formatLevelList(levels: readonly LevelId[]): string {
  if (levels.length === 0) return ''
  if (levels.length === 1) return `Level ${levels[0]}`
  const head = levels.slice(0, -1).join(', ')
  return `Levels ${head} & ${levels[levels.length - 1]}`
}
