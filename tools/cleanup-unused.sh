#!/usr/bin/env bash
#
# Reposé Residence — take the files nothing uses out of the deployment.
#
#   bash tools/cleanup-unused.sh          # show what would happen
#   bash tools/cleanup-unused.sh --apply  # do it
#
# Everything here was established by resolving every runtime asset path the
# code can build (string literals, the two floor-explorer JSONs, the frame-URL
# pattern, unit3dViews, the CSS and index.html — 686 distinct URLs) and
# subtracting them from what is on disk.
#
# WHAT THIS DOES NOT DO
#
# It deletes no original. Large unreferenced source imagery is MOVED into
# `assets-master/unused-from-public/`, which `.gitignore` already keeps out of
# the repository — so it stays on your disk, stops being committed, and stops
# being served. Only genuine junk (.DS_Store, empty directories) and the four
# dead source modules are actually removed.
#
# Already handled by .gitignore, so deliberately NOT touched here:
#   public/floor-explorer/repose-unit-plans-2d-3d/        (13MB, duplicate)
#   public/floor-explorer/.../units-master/               (8.4MB, PNG masters)
#   media-src/, repose-terrace/, assets-master/, scripts/
#
# Deliberately KEPT even though nothing renders them:
#   public/assets/terrace/plate-*.webp   the terrace chapter is switched off,
#                                        not deleted (terraceZone.TERRACE_ENABLED),
#                                        and tools/check-assets.mjs guards these
#   public/assets/reception-entry/entrance-reference.webp
#                                        73KB, cited by entranceCalibration.ts
#   .../repose-floor-explorer-assets/README.md, floorplan-inventory.csv
#                                        25KB of the supplied package's own docs

set -euo pipefail

cd "$(dirname "$0")/.."

APPLY=0
if [ "${1:-}" = "--apply" ]; then APPLY=1; fi

if [ "$APPLY" = "0" ]; then
  echo "DRY RUN — nothing will change. Re-run with --apply to carry it out."
  echo
fi

ATTIC="assets-master/unused-from-public"

say() { printf '  %s\n' "$*"; }

run() {
  if [ "$APPLY" = "1" ]; then
    "$@"
  fi
}

# Move a tracked-but-unused file out of public/ and out of the repository,
# keeping it on disk under the (gitignored) attic.
retire() {
  local path="$1" reason="$2"
  if [ ! -e "$path" ]; then
    say "skip   $path  (already gone)"
    return
  fi
  local dest="$ATTIC/$(dirname "${path#public/}")"
  say "retire $path"
  say "       -> $dest/   ($reason)"
  if [ "$APPLY" = "1" ]; then
    mkdir -p "$dest"
    git rm -r --cached --quiet --ignore-unmatch "$path" || true
    mv "$path" "$dest/"
  fi
}

# Delete outright: dead code, and junk.
drop() {
  local path="$1" reason="$2"
  if [ ! -e "$path" ]; then
    say "skip   $path  (already gone)"
    return
  fi
  say "delete $path   ($reason)"
  if [ "$APPLY" = "1" ]; then
    git rm -rf --quiet --ignore-unmatch "$path" >/dev/null 2>&1 || true
    rm -rf "$path"
  fi
}

echo "1. Source modules nothing imports"
echo "   (verified with grep across src/ — each is defined and never used)"
drop "src/components/SitePreloader.tsx"        "never imported; its CRITICAL_IMAGES list preloads nothing"
drop "src/styles/preloader.css"                "only SitePreloader used .site-preloader"
drop "src/components/repose/ReposeLoader.tsx"  "the amenities are entered on scroll; no loader is rendered"
drop "src/components/opening/FinalReveal.tsx"  "the closing title card was removed; opening.ts says so itself"
drop "src/components/reception/ExploreCue.tsx" "the lobby's real control is .rc__explore in ReceptionExperience"
echo

echo "2. Source imagery served to every visitor and rendered by nothing"
retire "public/floor-explorer/repose-floor-explorer-assets/supporting-assets" \
       "1.56MB — zero references in src/; the shipping copies live in public/assets/"
retire "public/assets/amenities/Cricket Simulator.webp"    "2.72MB master; web/cricket-simulator.webp is what ships"
retire "public/assets/amenities/Adults Outdoor Gym.webp"   "2.55MB master; web/adults-outdoor-gym.webp ships"
retire "public/assets/amenities/Kids Play Area.webp"       "2.55MB master; web/kids-play-area.webp ships"
retire "public/assets/amenities/For every generation.webp" "1.89MB master; web/for-every-generation.webp ships"
retire "public/assets/repose-experience/family-01.webp"    "in asset-manifest.json but no <Photo name=\"family-01\">"
retire "public/assets/repose-experience/family-01.jpg"     "same"
retire "public/assets/repose-experience/family-01.avif"    "same"
retire "public/assets/repose-experience/tower-original.webp" "the code asks only for tower-original.png"
echo
echo "   Those four capitalised masters are also the case-sensitivity trap"
echo "   amenities.ts warns about: a name with spaces and capitals resolves on"
echo "   a Mac and 404s on Linux. Out of public/, it cannot be reached for."
echo

echo "3. Junk"
while IFS= read -r -d '' f; do
  say "delete $f"
  if [ "$APPLY" = "1" ]; then
    git rm -f --quiet --ignore-unmatch "$f" >/dev/null 2>&1 || true
    rm -f "$f"
  fi
done < <(find . -name '.DS_Store' -not -path './node_modules/*' -print0 2>/dev/null)
for d in "public/assets/Amenity videos" "public/assets/media-src"; do
  if [ -d "$d" ] && [ -z "$(ls -A "$d" 2>/dev/null)" ]; then
    say "rmdir  $d   (empty; a leftover of the source drop)"
    run rmdir "$d"
  fi
done
echo

if [ "$APPLY" = "1" ]; then
  echo "Done. Now check the build still passes before committing:"
  echo
  echo "    npm run build"
  echo "    git status"
  echo "    git add -A && git commit -m 'Remove unused modules and source imagery from the deployment'"
else
  echo "Nothing changed. Re-run with --apply when you are happy with the list."
fi
