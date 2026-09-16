# Fix prompt — Level 13 right wing, bathroom fixtures

Give the text below to the image model, together with the three files it names.

**Why this one is separate from the glazing pass.** The glazing fix
(`3d-glass-fix-prompt.md`) covers eight 1 BHK Type A / A′ renders. This is a
different defect in a different apartment and should be sent as its own job.

**What you are asking the model to revisit is its own finding.** The model's QA
report already marks this render *"Not approved for exact architectural use"*
and names both defects. It produced the render anyway and shipped it under two
filenames. So this is not a new complaint — it is asking for the correction pass
its own report says is outstanding.

**One render, two filenames.** `unit-l13-3bhk-maidroom-a-prime-3d.webp` and
`unit-l13-3bhk-maidroom-b-prime-3d.webp` are **the same image** — different file
bytes, identical decoded pixels (verified by SHA-256 of the decoded arrays, and
stated in the model's own report). Both names have to come back corrected and
identical, or the package has to collapse to one.

**Which 2D plan is current.** Follow `unit-l13-3bhk-maidroom-b-prime.webp`
(apartment 1691.33 / balcony 670.91 / total 2362.24 sq ft). Do **not** follow
`unit-l13-3bhk-maidroom-a-prime.webp` — it prints the superseded balcony and
total (660.58 / 2351.91), which the 2026-09 brochure revision replaced and which
belong to Level 14's right wing, not this apartment.

---

## THE PROMPT

You previously generated a 3D cutaway floor-plan render for a Dubai residential
tower (Reposé Residence) — the **Level 13 right wing, 3 BHK + Maid Room**. Your
own QA report marks it *"Not approved for exact architectural use"* because of
two bathroom fixture errors. I need that correction pass now.

### Defect 1 — the ensuite has no toilet

The bathroom labelled **BATH 1.8x2.7 m** (the ensuite to the right of the MAID
room, serving the 3.8x4.2 m bedroom) is rendered with only **a shower enclosure
and a wash basin**. There is no WC in it at all.

The 2D plan shows a WC in that room. Add it, in the position the 2D plan puts
it, drawn in the same WC style you have already used elsewhere in this same
image.

### Defect 2 — the long bathroom has a duplicated basin

The bathroom labelled **BATH 1.6x3.6 m** (the tall narrow one on the left,
below PWD 1.6x2.3 m and above BEDROOM 4.1x3.6 m) is rendered with, from top to
bottom: a shower enclosure, a square wash basin, and then **a second identical
square wash basin** with a WC crowded underneath it.

There should be **one** basin. Remove the duplicate and lay the room out as the
2D plan draws it — shower, basin, WC — with each fixture clear of the others
and in the plan's positions.

### Read the plan, not my description

For both rooms, the 2D file is the authority on what fixture goes where. Work
room by room off it rather than off the wording above.

### While you are in this apartment

Check every other bathroom and the kitchen in this render against the 2D plan
and fix any fixture that is missing, duplicated, or in the wrong place. There
are five wet rooms in this apartment (PWD 1.6x2.3, BATH 1.5x1.5, BATH 1.6x3.6,
BATH 1.8x2.7, BATH 1.8x2.9) plus the KITCHEN 2.4x4.2 and the MAID 1.8x2.1.

### What must NOT change

Everything else must stay as it is:

- Same canvas size: **1536 × 1024**, same file format (WebP).
- Same camera angle, same isometric projection, same scale and the same
  position of the apartment on the canvas — the corrected image has to line up
  with the original, because the website registers it over the 2D drawing to
  within a pixel or two.
- Same lighting, materials, colour palette, flooring and rugs.
- Same furniture everywhere outside the two bathrooms above.
- Same balconies, railings and glazing.
- Same room name labels and dimension strings, same positions, same font
  ("BEDROOM", "4.4x4.2 m", etc.) — do not re-letter, re-space or re-word a
  label.
- Do not mirror, flip, rotate, crop or re-frame the image. The entrance marker
  stays on the left side, as in both the 2D plan and your current render.

### Files

```
saion/public/floor-explorer/repose-unit-plans-2d-3d/
```

| Role | File |
|------|------|
| 2D plan to follow | `unit-l13-3bhk-maidroom-b-prime.webp` |
| Render to fix | `unit-l13-3bhk-maidroom-b-prime-3d.webp` |
| Same image under its other name — return it corrected too | `unit-l13-3bhk-maidroom-a-prime-3d.webp` |

Overwrite each file under its existing name — do not rename anything. If you
would rather collapse the two render filenames into one, say so and say which
name you are keeping; do not do it silently.

### Before you finish

Check the corrected render against `unit-l13-3bhk-maidroom-b-prime.webp` and
confirm:

- BATH 1.8x2.7 m now has a WC, and it is where the 2D plan puts it.
- BATH 1.6x3.6 m has exactly one basin, one WC and one shower, none overlapping.
- Canvas is still 1536 × 1024 and the apartment has not shifted or rescaled —
  overlay the new render on the old one and confirm the walls sit on the walls.
- Every label and dimension string is unchanged and still readable.
- The two returned filenames decode to identical pixels.
- Update the QA report: this render should no longer be marked "not approved",
  or the report should say what is still wrong.

---

## AFTER THE MODEL RETURNS THE FILES

1. Copy the corrected render into the folder the website serves, under the same
   name:

   ```
   saion/public/floor-explorer/repose-floor-explorer-assets/units-3d/unit-l13-3bhk-maidroom-b-prime-3d.webp
   ```

   Check its file size first. The model has returned losslessly-encoded WebP
   before — around 1 MB where the shipped renders are 150–270 KB. If it comes
   back over ~400 KB, re-encode it at quality 94 rather than shipping it as is.

2. **The residence still will not show a 3D view after this.** The website only
   offers "View in 3D" for a residence listed in
   `src/components/floor-explorer/unit3dViews.ts`, and each entry carries an
   `align` box measured by fitting that render's ink over its drawing. Level 13's
   right wing (`l13-3bed-a-prime`) has no entry yet, deliberately — there was no
   point measuring a file that was about to be replaced. Measure and add it once
   the corrected render is in.

3. Run the build, which verifies every asset the site can ask for:

   ```
   npm run build
   ```
