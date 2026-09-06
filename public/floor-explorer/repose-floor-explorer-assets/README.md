# Reposé Residence Floor Explorer Asset Package

Production-ready extraction package derived only from **SAION Brochure Updated 2026** (62-page PDF). No architectural drawing was generated, redrawn, traced, simplified, cleaned up, or altered with AI. Master plan images are direct 450 DPI rasterizations of the supplied PDF with only unrelated page surroundings cropped away. WebP files preserve the master dimensions and aspect ratio and use high-quality compression.

## Executive summary

- Selectable residential levels explicitly supplied: **01 through 15**.
- Unique complete residential floorplates: **8**.
- Unique detailed unit-plan assets: **35**.
- Detailed unit-plan occurrences in the brochure: **36**; the right-hand Level 14 B′ plan appears identically on PDF pages 46 and 48, so one asset is retained and referenced by both source pages.
- Residence terminology found: **1 BHK**, **1 BHK + Study**, **2 BHK + Maid Room**, **3 BHK + Maid Room**, **3 BHK Penthouse with Jacuzzi**, and **4 BHK Penthouse with Jacuzzi**.
- Brochure floorplate/detail-plan conflicts exist on Levels **12-15**. These are explicitly encoded as `NEEDS MANUAL VERIFICATION`; uncertain mappings are never silently treated as verified.
- A **podium level** is explicitly mentioned for amenities, but the brochure does not provide its numbered level. It is not included in the residential selector.
- The brochure calls the project a **20-story** tower, but it only maps residential Levels 01-15 plus an unnumbered podium amenity level. The remaining storey numbering/use is not stated.

## Verified floor structure

| Actual selectable level(s) | Complete floorplate | Residence types visible on floorplate | Detail-plan mapping |
| --- | --- | --- | --- |
| 01, 05, 07, 11 | `floorplate-l01-05-07-11` | 1 BHK A/A′; 1 BHK + Study B/B′; 2 BHK + Maid Room A/A′ | Verified |
| 02, 04, 08, 10 | `floorplate-l02-04-08-10` | 1 BHK A/A′; 1 BHK + Study B/B′; 2 BHK + Maid Room A/A′ | Verified |
| 03, 09 | `floorplate-l03-09` | 1 BHK A/A′; 1 BHK + Study B/B′; 2 BHK + Maid Room A/A′ | Verified |
| 06 | `floorplate-l06` | 1 BHK A/A′; 1 BHK + Study B/B′; 2 BHK + Maid Room A/A′ | Verified |
| 12 | `floorplate-l12` | Three 3 BHK + Maid Room residences: A, B, A′ on floorplate | **Needs manual verification** because detailed pages use A/B badges against opposite geometries/positions |
| 13 | `floorplate-l13` | Three 3 BHK + Maid Room residences: A, B, A′ on floorplate | **Needs manual verification**; outer-right detail is not unambiguously supplied |
| 14 | `floorplate-l14` | Three 3 BHK + Maid Room residences: A, B, A′ on floorplate | **Needs manual verification** because detailed pages use A/B badges against opposite geometries/positions |
| 15 | `floorplate-l15-penthouse` | 4-bedroom penthouse, 2-bedroom + maid centre residence, 3-bedroom penthouse | Partly verified; centre B/C variant conflict and right unit has no visible floorplate variant label |

## Level-by-level summary

```text
LEVEL 01 -> floorplate-l01-05-07-11 -> 1 BHK A/A′; 1 BHK + Study B/B′; 2 BHK + Maid Room A/A′
LEVEL 02 -> floorplate-l02-04-08-10 -> 1 BHK A/A′; 1 BHK + Study B/B′; 2 BHK + Maid Room A/A′
LEVEL 03 -> floorplate-l03-09       -> 1 BHK A/A′; 1 BHK + Study B/B′; 2 BHK + Maid Room A/A′
LEVEL 04 -> floorplate-l02-04-08-10 -> same verified residence set as Level 02
LEVEL 05 -> floorplate-l01-05-07-11 -> same verified residence set as Level 01
LEVEL 06 -> floorplate-l06          -> 1 BHK A/A′; 1 BHK + Study B/B′; 2 BHK + Maid Room A/A′
LEVEL 07 -> floorplate-l01-05-07-11 -> same verified residence set as Level 01
LEVEL 08 -> floorplate-l02-04-08-10 -> same verified residence set as Level 02
LEVEL 09 -> floorplate-l03-09       -> same verified residence set as Level 03
LEVEL 10 -> floorplate-l02-04-08-10 -> same verified residence set as Level 02
LEVEL 11 -> floorplate-l01-05-07-11 -> same verified residence set as Level 01
LEVEL 12 -> floorplate-l12          -> 3 BHK + Maid Room; three positions; A/B detail mapping requires verification
LEVEL 13 -> floorplate-l13          -> 3 BHK + Maid Room; three positions; outer-right detail requires verification
LEVEL 14 -> floorplate-l14          -> 3 BHK + Maid Room; three positions; A/B detail mapping requires verification
LEVEL 15 -> floorplate-l15-penthouse -> 4 BHK Penthouse with Jacuzzi; 2 BHK + Maid Room; 3 BHK Penthouse with Jacuzzi
```

## Source PDF pages

PDF page numbers below are 1-based physical PDF page numbers; the brochure does not print a reliable page-number system.

| Content | PDF page(s) |
| --- | --- |
| Unit plans for Levels 01, 05, 07, 11 | 31-33 |
| Unit plans for Levels 02, 04, 08, 10 | 34-36 |
| Unit plans for Levels 03, 09 | 37-39 |
| Unit plans for Level 06 | 40-42 |
| Unit plans for Level 12 | 43-44 |
| Unit plans involving Levels 13/14 | 45-48 |
| Unit plans for Level 15 | 49-51 |
| Complete floorplate: Levels 01, 05, 07, 11 | 52 |
| Complete floorplate: Levels 02, 04, 08, 10 | 53 |
| Complete floorplate: Levels 03, 09 | 54 |
| Complete floorplate: Level 06 | 55 |
| Complete floorplate: Level 12 | 56 |
| Complete floorplate: Level 13 | 57 |
| Complete floorplate: Level 14 | 58 |
| Complete floorplate: Level 15 - Penthouse | 59 |
| Podium-level amenity statement and amenity layout | 20 and 25 |

## Important ambiguities and brochure conflicts

1. **Levels 12-14 A/B conflict:** complete floorplates label outer residences A/A′ and centre residence B. The detailed plan pages badge the wide centre geometry A and the outer geometries B/B′. Candidate files are supplied in `residences-map.json`, but `unitPlan` is left `null` for these uncertain links.
2. **Level 13 outer-right detail:** page 46 right is explicitly labelled Level 14 and is identical to the Level 14 B′ plan on page 48. There is no unambiguous detailed plan for the Level 13 outer-right residence.
3. **Level 15 centre variant:** the complete floorplate labels the centre residence `2-BED C`, while its detailed page is badged `B`.
4. **Level 15 right penthouse:** page 50 and its locator clearly identify the right 3 BHK Penthouse with Jacuzzi, badged A. The complete floorplate does not visibly print a residence type/variant label for that right unit.
5. **1 BHK A narrative:** prose on the A-type 1 BHK pages mentions a study, while the drawing labels the small room `STORE` and the printed plan name is `1BHK-A`. This package classifies Study only on B/B′ drawings that explicitly label `STUDY`.
6. **Level/storey count:** "20-story" is marketing copy, not a complete level schedule. Do not infer extra selectable levels from it.

All six items above are marked `NEEDS MANUAL VERIFICATION` in the machine-readable data where applicable.

## Folder structure

```text
repose-floor-explorer-assets/
├── floorplates-master/   # 8 high-resolution PNG floorplates
├── floorplates-web/      # 8 matching high-quality WebP floorplates
├── units-master/         # 35 unique high-resolution PNG unit plans
├── units-web/            # 35 matching high-quality WebP unit plans
├── supporting-assets/
│   ├── building/          # 4 brochure-derived assets
│   ├── reception/         # 2 brochure-derived assets
│   ├── interiors/         # 6 brochure-derived assets
│   └── amenities/         # 9 brochure-derived assets
├── residences-map.json
├── floor-selector.json
├── floorplan-inventory.csv
└── README.md
```

## Filename convention

- `l01-05-07-11` means the brochure explicitly assigns that plan/floorplate to Levels 01, 05, 07 and 11.
- `a-prime` and `b-prime` represent the brochure's typographic `A′` and `B′` variants.
- `maidroom`, `study`, `penthouse`, and `jacuzzi` are used only where the brochure states or labels them.
- Level and page qualifiers are included when needed to keep materially different plans distinct.
- The repeated Level 14 B′ plan from pages 46 and 48 is stored once as `unit-l14-3bhk-maidroom-b-prime`.

## `residences-map.json`

The file is normalized for development use:

- `floorplates`: unique floorplate registry, including master/web files and source page.
- `unitPlans`: unique extracted plan registry, including master/web files, brochure badges, claimed levels and source pages.
- `residenceSets`: residences visible on each floorplate. Verified mappings use `unitPlanId`/`unitPlan`. Uncertain mappings use `candidateUnitPlanId`/`candidateUnitPlan`, keep `unitPlan` as `null`, and set `mappingStatus` to `NEEDS MANUAL VERIFICATION`.
- `levels`: actual selectable Levels 01-15, each referencing one floorplate and one residence set. Shared floorplates reference the same asset rather than duplicates.
- `nonResidentialLevels`: the unnumbered podium amenity evidence.
- `brochureConflicts`: explicit, machine-readable conflict list.

Recommended developer rule: never auto-promote a `candidateUnitPlan` to `unitPlan` until SAION or the project architect confirms it.

## `floor-selector.json`

Lightweight selector data for the building UI. Each entry includes the actual level, display label, WebP floorplate, available residence-type names, shared-floorplate levels and unit-plan verification status.

## `floorplan-inventory.csv`

Contains one row per selectable level and floorplate residence/variant (78 data rows). This intentionally repeats shared-level rows so each level can be filtered and manually signed off independently.

## Supporting asset sources

| Folder | Assets | PDF source page(s) |
| --- | --- | --- |
| `building/` | tower cutout, clean tower hero, podium exterior, night tower | 1, 3, 12, 14 |
| `reception/` | two reception/lobby views | 6 |
| `interiors/` | kitchen/living, living/dining, bedroom, kitchen, two bathrooms | 5, 7, 8, 9, 11 |
| `amenities/` | zen garden, yoga, steam room, gym, pool, BBQ, open terrace, play area, podium amenity layout | 15-25 |

Supporting assets are direct embedded brochure images or non-generative crops of those images. No new visual content was created.

## Developer integration notes

1. Build the floor selector from `floor-selector.json`.
2. Resolve the selected level in `residences-map.json`.
3. Load the referenced `floorplate` from `floorplates-web/`.
4. Resolve `residenceIds` through the referenced `residenceSetId`.
5. Show a unit plan only when `unitPlan` is non-null. For `NEEDS MANUAL VERIFICATION`, block production selection or show an internal verification state rather than using the candidate silently.
6. Use PNG masters only for archival/reference workflows; ship WebP assets to the website.

## Quality-control status

- 8/8 unique complete floorplates extracted and visually checked.
- 35/35 unique detailed unit-plan assets extracted; one exact repeated brochure occurrence deduplicated.
- PNG and WebP references were checked against real files.
- WebP dimensions match PNG dimensions for all floorplates and units.
- All Levels 01-15 resolve to an existing floorplate.
- Ambiguous unit links are flagged rather than guessed.

