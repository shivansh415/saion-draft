# Fix prompt — 3D unit renders where glazing was rendered as solid wall

Give the text below to the image model, together with the 16 files it names
(8 renders to fix + the 8 matching 2D plans it must follow).

**Which drawings are current.** The 2D plans in the folder named below are cut
from `SAION Brochure Updated 2026` as revised 2026-09-15 ("new SAION Brochure
Updated 2026.pdf"). That revision changed three printed figures — Level 06 B's
total, Level 13 B′'s balcony and total, and the Level 15 right-hand penthouse's
badge (A → C) — and the folder has been brought up to date, so the 2D files
there are the ones to follow. None of the eight renders in this fix are
affected by those three changes; they are 1 BHK Type A / A′ only.

---

## THE PROMPT

You previously generated a set of 3D cutaway floor-plan renders for a Dubai
residential tower (Reposé Residence). Each render was generated from a 2D
architectural floor plan of the same apartment. I need a correction pass on
8 of them.

### The defect

In the **1 BHK – Type A and Type A′** apartments, the apartment has TWO
balconies: a main balcony off the bedroom, and a second balcony running down
the side of the LIVING + DINING room and the KITCHEN.

In the 2D plan, the wall between LIVING + DINING / KITCHEN and that **side
balcony** is drawn as a **thin double line** — architectural notation for
**full-height glazing** (a glass curtain wall with a sliding glass door).

In your 3D render you drew that same wall as a **solid opaque wall** in the
dark navy wall colour. The result is a balcony that is completely sealed off
from the living room — no glass, no door, no way to see out or walk out.
The bedroom's balcony glazing was rendered correctly; only this side wall is
wrong.

### What to change

For each file listed below, re-render the apartment with **only** this change:

1. Replace the solid wall between the LIVING + DINING room and the side
   balcony with **full-height glazing**, drawn in exactly the same glass
   style you already used for the bedroom's balcony glazing in that same
   image (same light blue-grey tint, same frame/mullion treatment, same
   thickness).
2. Include the **sliding glass door** panel divisions where the 2D plan shows
   them.
3. Do the same for the KITCHEN wall on that balcony **only where the 2D plan
   shows a thin double line**. Where the 2D plan shows a **thick solid black
   line**, that is a genuine structural wall — leave it as a solid wall.

**Follow the 2D plan, not my description.** For every segment of that façade,
read the matching 2D file: thin double line = glass, thick black line = solid
wall. Reproduce it segment by segment.

### What must NOT change

Everything else must stay pixel-identical in intent:

- Same canvas size: **1536 × 1024**, same file format (WebP).
- Same camera angle, same isometric projection, same scale and position of the
  apartment on the canvas — the corrected image must line up with the original.
- Same lighting, same materials, same colour palette.
- Same furniture, same fixtures, same flooring, same rugs, same plants.
- Same room name labels and the same dimension strings, in the same positions
  and the same font ("LIVING + DINING", "7.1x3.5 m", etc.) — do not re-letter,
  re-space or re-word any label.
- Same balcony railings and balcony floor tiling.
- Do not mirror, flip, rotate, crop or re-frame the image.

### Files

Work in this folder, where each 3D render sits next to the 2D plan it must
follow:

```
saion/public/floor-explorer/repose-unit-plans-2d-3d/
```

| # | Render to fix (3D)                             | 2D plan to follow                          |
|---|------------------------------------------------|--------------------------------------------|
| 1 | `unit-l01-05-07-11-1bhk-a-3d.webp`             | `unit-l01-05-07-11-1bhk-a.webp`            |
| 2 | `unit-l01-05-07-11-1bhk-a-prime-3d.webp`       | `unit-l01-05-07-11-1bhk-a-prime.webp`      |
| 3 | `unit-l02-04-08-10-1bhk-a-3d.webp`             | `unit-l02-04-08-10-1bhk-a.webp`            |
| 4 | `unit-l02-04-08-10-1bhk-a-prime-3d.webp`       | `unit-l02-04-08-10-1bhk-a-prime.webp`      |
| 5 | `unit-l03-09-1bhk-a-3d.webp`                   | `unit-l03-09-1bhk-a.webp`                  |
| 6 | `unit-l03-09-1bhk-a-prime-3d.webp`             | `unit-l03-09-1bhk-a-prime.webp`            |
| 7 | `unit-l06-1bhk-a-3d.webp`                      | `unit-l06-1bhk-a.webp`                     |
| 8 | `unit-l06-1bhk-a-prime-3d.webp`                | `unit-l06-1bhk-a-prime.webp`               |

In the **A** files the side balcony is on the **left**; in the **A′** files it
is mirrored to the **right**. The defect is the same in both.

Overwrite each file under its existing name — do not rename anything.

### Before you finish

For each of the 8 corrected renders, check it against its 2D plan and confirm:

- The living room now opens onto the side balcony through glass.
- The glazing matches the bedroom balcony's glazing style in the same image.
- Solid black walls in the 2D are still solid in the 3D.
- Canvas is still 1536 × 1024 and the apartment has not shifted or rescaled.
- Every label and dimension string is unchanged and still readable.

### Also worth checking while you are in there

The same glass-as-wall error may exist in other renders in that folder. After
the 8 above, compare each remaining `*-3d.webp` against its 2D plan and report
(do not silently change) any other place where a thin double line in the 2D
was rendered as a solid wall.

---

## AFTER THE MODEL RETURNS THE FILES

The corrected renders must be copied into the folder the website actually
serves, under the same names:

```
saion/public/floor-explorer/repose-floor-explorer-assets/units-3d/
```

Then run the build, which verifies every asset the site can ask for:

```
npm run build
```

The 3D renders are not relit for dark mode, so nothing else needs regenerating.
