# Reposé unit-plan QA report — revised 10 September 2026

- Original ZIP sources: 35; newly supplied Level 13 source: 1; total paired plans: 36.
- 3D files: 36 (35 newly generated across sessions plus supplied reference).
- Matched pairs: 36/36; image assets: 72; missing outputs: none.
- Manifest statuses: 19 approved, 17 needs-review. Previously assigned statuses for unaffected files are retained; this revision is not a fresh audit of the entire batch.

## This revision

- Added `unit-l13-3bhk-maidroom-a-prime.webp` and `unit-l13-3bhk-maidroom-a-prime-3d.webp` from the user-supplied Level 13 drawing. The PNG was losslessly encoded as WebP; decoded pixels were verified equal. The existing Level 13 a and b files remain unchanged.
- Replaced `unit-l14-3bhk-maidroom-b-prime-3d.webp` with a fresh render from its exact Level 14 2D source. The prior mirrored render is excluded.
- Both revised renders show kitchen and entrance left, living and two stacked bedrooms right, third bedroom bottom-left, and separate upper/lower right balconies. Labels read normally. These are fresh source-based renders, not raster flips.
- Level 13 kitchen duplication and tiny-bath missing toilet were addressed in a correction attempt. Residual fixture errors remain, listed below. Level 14 PWD toilet was added in a correction pass.
- Website IDs reported by the user map to Level 13 a-prime and Level 14 b-prime asset stems. The website code itself was not provided or inspected.

## Validation and limits

- Every manifest pair exists, decodes as WebP, and has a 1536 × 1024 3D image. All 35 original 2D files are byte-identical to the extracted originals.
- Original sources have different aspect ratios from the 3D canvases. A common render canvas does not establish pixel registration or a seamless morph.
- Approval is an earlier visual QA designation, not architectural certification. The Level 14 mirror defect demonstrated that the earlier batch QA missed a material error.
- Earlier notes that attributed every mismatch to source ambiguity were too broad. Some flagged files have generated furniture/fixture or balcony discrepancies. They must not be treated as fully accurate merely because their file pairs exist.

## Review entries

- `unit-l01-05-07-11-1bhk-study-b-prime.webp` — Needs review: one small bathroom fixture arrangement is visually ambiguous in the source/render.
- `unit-l01-05-07-11-2bhk-maidroom-a-prime.webp` — Generated dining chair count differs from source; not corrected in this revision.
- `unit-l01-05-07-11-2bhk-maidroom-a.webp` — Generated extra living chair versus source side-table/armchair arrangement; not corrected in this revision.
- `unit-l02-04-08-10-1bhk-a-prime.webp` — Generated right balcony extends too far beside kitchen versus source; not corrected in this revision.
- `unit-l03-09-1bhk-a-prime.webp` — Needs review: the lower-right balcony outline is open/ambiguous in the supplied 2D source.
- `unit-l06-1bhk-a-prime.webp` — Needs review: the lower-right balcony outline is open/ambiguous in the supplied 2D source.
- `unit-l12-3bhk-maidroom-a.webp` — Needs review: small maid-bath and kitchen fixture symbols are ambiguous in the source.
- `unit-l12-3bhk-maidroom-b-prime.webp` — Generated extra dining chairs and balcony plants versus source; not corrected in this revision.
- `unit-l12-3bhk-maidroom-b.webp` — Needs review: bathroom fixture ordering and the small lower balcony edge need a human source comparison.
- `unit-l13-3bhk-maidroom-a-prime.webp` — Created independently from newly supplied Level 13 drawing; orientation and readable labels verified. Residual bathroom fixture errors after correction attempt: tall left bath retains an extra basin; middle-right ensuite toilet is not clearly rendered. Not approved for exact architectural use.
- `unit-l13-3bhk-maidroom-a.webp` — Needs review: small maid-bath and kitchen fixture symbols are ambiguous in the source.
- `unit-l13-3bhk-maidroom-b.webp` — Needs review: some bathroom fixture orientation is difficult to verify at the supplied source resolution.
- `unit-l14-3bhk-maidroom-a.webp` — Needs review: kitchen fixture symbols are dense/ambiguous in the source.
- `unit-l14-3bhk-maidroom-b-prime.webp` — Fresh render replaces mirrored version. Kitchen/entry left, two stacked bedrooms right, third bedroom bottom-left, two separate right balconies and readable labels verified. PWD toilet corrected. Exact door swings, glazing and bathroom fixture placements remain approximate and need review.
- `unit-l14-3bhk-maidroom-b.webp` — Needs review: the separate lower-right balcony has an open/ambiguous outer edge in the supplied source.
- `unit-l15-3bhk-penthouse-jacuzzi-a.webp` — Needs review: a white opaque strip in the source conceals some upper kitchen/dining details; visible geometry was preserved without guessing hidden content.
- `unit-l15-4bhk-penthouse-jacuzzi-a.webp` — Needs review: a white opaque strip in the source conceals some upper terrace/kitchen/dining details; visible geometry was preserved without guessing hidden content.
