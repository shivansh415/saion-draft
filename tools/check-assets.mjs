#!/usr/bin/env node
/**
 * Verifies that every runtime asset the application can request is actually
 * present in `public/`. Runs as `prebuild`, so a build that would ship with
 * holes in it fails here, by name, instead of on the deployment.
 *
 * This exists because of a real failure. `.gitignore` carried a bare
 * `repose-experience/` — a pattern with a trailing slash and no leading slash,
 * which git matches at ANY depth. It was written for the standalone source
 * folder at the project root and also matched
 * `public/assets/repose-experience/`, quietly excluding all 82 of the
 * lifestyle chapter's photographs from the repository. Everything worked
 * locally, where the files sat on disk, and every deployment served a chapter
 * with type and no pictures. Nothing in the application could tell: an image
 * that fails is resolved rather than waited on, by design, so a wholesale
 * absence looked exactly like a completed load.
 *
 * A missing file is not a warning here. It is a failed build.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = join(root, 'public')
const missing = []
const checked = { files: 0, groups: 0 }

/**
 * Present AND spelled the way the source asks for it.
 *
 * `existsSync` alone is not enough here. Development is on macOS, whose
 * filesystem is case-insensitive, and the site is served from Linux, whose
 * filesystem is not: `assets/amenities/jacuzzi.webp` resolves happily against
 * a file called `Jacuzzi.webp` on the machine the build runs on and 404s on
 * the one that serves it. So the last segment is matched against the
 * directory listing exactly, which is the only check that can tell the
 * difference. (It also catches the reverse: a file whose name a later edit
 * re-cased without the source following it.)
 */
const listings = new Map()
const need = (relative, why) => {
  checked.files++
  const full = join(PUBLIC, relative)
  if (!existsSync(full)) {
    missing.push({ relative, why })
    return
  }
  const folder = dirname(full)
  if (!listings.has(folder)) listings.set(folder, new Set(readdirSync(folder)))
  const name = relative.split('/').pop()
  if (!listings.get(folder).has(name)) {
    missing.push({ relative, why: `${why} — present but spelled differently on disk (case mismatch)` })
  }
}

/* ------------------------------------------------------------------ *
 * 1. The lifestyle chapter's photographs, every candidate the
 *    `<picture>` can resolve to — both encodings and both widths.
 *
 *    The names are read out of `data/experience.ts`, which is where the
 *    chapter declares what it loads (CRITICAL_PHOTOS, DEFERRED_PHOTOS and
 *    the two panel images), so adding a photograph there brings it under
 *    this check automatically. The manifest is consulted only for whether
 *    a given name ships a 720w variant — it also lists source imagery the
 *    chapter does not render, which is not this script's business.
 * ------------------------------------------------------------------ */
const REPOSE = 'assets/repose-experience'
const MANIFEST = join(root, 'src/components/repose/data/asset-manifest.json')
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
const meta = new Map(manifest.map((r) => [String(r.file).replace(/\.[a-z0-9]+$/, ''), r]))

const experience = readFileSync(join(root, 'src/components/repose/data/experience.ts'), 'utf8')
const used = new Set()
for (const match of experience.matchAll(/\bname:\s*'([a-z0-9-]+)'/g)) used.add(match[1])
for (const match of experience.matchAll(/\bimage:\s*'([a-z0-9-]+)'/g)) used.add(match[1])

if (used.size === 0) {
  console.error('✗ check-assets could not read any photo names out of data/experience.ts')
  process.exit(1)
}

for (const name of [...used].sort()) {
  checked.groups++
  const responsive = Boolean(meta.get(name)?.responsiveFile)
  for (const extension of ['avif', 'webp', 'jpg']) {
    need(`${REPOSE}/${name}.${extension}`, `${name} — the native candidate`)
    if (responsive) need(`${REPOSE}/${name}-720.${extension}`, `${name} — the 720w candidate`)
  }
}

/* ------------------------------------------------------------------ *
 * 2. Fixed paths written as literals in the source.
 * ------------------------------------------------------------------ */
for (const relative of [
  `${REPOSE}/tower-original.png`,
  'assets/opening/branding/saion-logo.png',
  'assets/opening/building/final-frame.webp',
  'assets/reception-entry/building-final.webp',
  'assets/reception-entry/reception-final.webp',
  'floor-explorer/repose-floor-explorer-assets/floor-selector.json',
  'floor-explorer/repose-floor-explorer-assets/residences-map.json',
  // The site's two faces. They moved out of src/ so the preload in index.html
  // and the @font-face in index.css resolve to the same URL in dev and in the
  // build; a miss here is the whole site falling back to Georgia.
  'assets/fonts/repose-display.woff2',
  'assets/fonts/repose-display-italic.woff2',
  'assets/fonts/repose-sans.woff2',

  // The residence chapter: four films, each with the card poster the selector
  // paints and the still the film opens on. A missing poster is a black frame
  // at exactly the moment the transition is supposed to be seamless.
  'assets/interiors/kitchen.mp4',
  'assets/interiors/kitchen-card.webp',
  'assets/interiors/kitchen-still.webp',
  'assets/interiors/living-room.mp4',
  'assets/interiors/living-room-card.webp',
  'assets/interiors/living-room-still.webp',
  'assets/interiors/bedroom.mp4',
  'assets/interiors/bedroom-card.webp',
  'assets/interiors/bedroom-still.webp',
  'assets/interiors/bathroom.mp4',
  'assets/interiors/bathroom-card.webp',
  'assets/interiors/bathroom-still.webp',

  // The amenity films and their posters (data/experience.ts → AMENITY_FILMS,
  // sections/Story.tsx → the panels), and the supplied amenities map.
  'assets/amenity-videos/pool.mp4',
  'assets/amenity-videos/pool.webp',
  'assets/amenity-videos/gym.mp4',
  'assets/amenity-videos/gym.webp',
  'assets/amenity-videos/steam-room.mp4',
  'assets/amenity-videos/steam-room.webp',
  'assets/amenities/map.webp',

  // The amenity plates supplied at the final review (data/amenities.ts →
  // AMENITY_PLATES), and the picture the family chapter's card holds.
  'assets/amenities/web/jacuzzi.webp',
  'assets/amenities/web/adults-outdoor-gym.webp',
  'assets/amenities/web/kids-play-area.webp',
  'assets/amenities/web/cricket-simulator.webp',
  'assets/amenities/web/for-every-generation.webp',

  // The index plates that are single files rather than the chapter's own
  // six-candidate photographs (data/amenities.ts → `src`).
  `${REPOSE}/walking-track-01.webp`,

  // The terrace: the supplied model, and the plates its amenity details
  // stand on. The chapter is disconnected from the production flow
  // (floor-explorer/terraceZone.ts → TERRACE_ENABLED) but the amenity index
  // still shows four of these plates, so they are still shipped.
  'models/repose-terrace.glb',
  'assets/terrace/plate-pool.webp',
  'assets/terrace/plate-sports-court.webp',
  'assets/terrace/plate-play-area.webp',
  'assets/terrace/plate-fitness.webp',
  'assets/terrace/plate-walking-track.webp',
  'assets/terrace/plate-garden.webp',
]) {
  need(relative, 'referenced directly in src/')
}

/* ------------------------------------------------------------------ *
 * 2b. The 3D unit renders, read out of `unit3dViews.ts` rather than
 *     listed here — so adding a residence to that map brings its render
 *     under this check with it, and removing one stops the check asking
 *     for a file nothing loads. A residence whose render is missing gets
 *     a "View in 3D" that opens onto nothing, which is worse than the
 *     control never being offered.
 * ------------------------------------------------------------------ */
const views = readFileSync(join(root, 'src/components/floor-explorer/unit3dViews.ts'), 'utf8')
let renders = 0
for (const match of views.matchAll(/assetUrl\('(units-3d\/[^']+)'\)/g)) {
  renders++
  need(`floor-explorer/repose-floor-explorer-assets/${match[1]}`, 'a 3D unit render registered in unit3dViews.ts')
}
if (renders === 0) {
  console.error('✗ check-assets could not read any 3D renders out of unit3dViews.ts')
  process.exit(1)
}

/* ------------------------------------------------------------------ *
 * 3. The film. Not every frame by name — the count, which catches a
 *    truncated or half-committed sequence just as well.
 * ------------------------------------------------------------------ */
const SEQUENCES = [
  { id: 'sequence-01', count: 200 },
  { id: 'sequence-02', count: 240 },
]

const shortfall = []
for (const { id, count } of SEQUENCES) {
  const folder = join(PUBLIC, 'assets/opening', id, 'webp')
  const found = existsSync(folder) ? readdirSync(folder).filter((f) => f.endsWith('.webp')).length : 0
  checked.files += count
  if (found !== count) shortfall.push(`${id}: ${found} frames present, ${count} declared in src/data/opening.ts`)
}

/* ------------------------------------------------------------------ *
 * Verdict
 * ------------------------------------------------------------------ */
if (!missing.length && !shortfall.length) {
  console.log(
    `✓ assets — ${checked.files} runtime files present (${checked.groups} photographs × 6 candidates, ` +
      `${SEQUENCES.reduce((a, s) => a + s.count, 0)} film frames, and the fixed paths)`,
  )
  process.exit(0)
}

console.error('\n✗ BUILD STOPPED — runtime assets are missing from public/\n')
if (missing.length) {
  const byFolder = new Map()
  for (const m of missing) {
    const folder = m.relative.split('/').slice(0, -1).join('/')
    byFolder.set(folder, (byFolder.get(folder) || 0) + 1)
  }
  for (const [folder, count] of byFolder) {
    console.error(`  ${count} file(s) missing from public/${folder}/`)
  }
  console.error('\n  first few:')
  for (const m of missing.slice(0, 8)) console.error(`    public/${m.relative}   (${m.why})`)
  if (missing.length > 8) console.error(`    … and ${missing.length - 8} more`)
}
for (const line of shortfall) console.error(`  ${line}`)

console.error(
  '\n  If these files are on your disk but missing here, they are almost certainly\n' +
    '  being excluded from the repository. Ask git directly:\n\n' +
    '    git check-ignore -v public/assets/repose-experience/pool-01.avif\n\n' +
    '  A .gitignore pattern with a trailing slash and no LEADING slash matches a\n' +
    '  directory of that name at any depth. Anchor it: /repose-experience/\n',
)
process.exit(1)
