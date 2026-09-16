#!/bin/bash
#
# Take the supplied delivery packages out of public/.
#
# Everything under public/ is copied verbatim into the build, so anything
# sitting there is weight on the deployment whether or not the site reads it.
# These three folders are client/model deliveries that the site never reads:
# the floor explorer resolves every asset through exactly two roots, both in
# src/components/floor-explorer/floorExplorerData.ts —
#
#   FLOOR_EXPLORER_BASE = '/floor-explorer/repose-floor-explorer-assets/'
#   RELIT_BASE          = '/floor-explorer/relit/'
#
# — so nothing under repose-unit-plans-2d-3d/,
# repose-unit-plans-glazing-corrected/ or repose-level13-fixture-patch/ is
# reachable at runtime. What ships from each of them has already been copied
# into repose-floor-explorer-assets/.
#
# NOTHING IS DELETED. The deliveries move to deliveries/ at the repo root,
# beside media-src/ and assets-master/, which .gitignore already keeps out of
# the deployment. They stay on disk, out of the build.
#
# Safe to re-run.

set -euo pipefail
cd "$(dirname "$0")/.."
root=$(pwd)
echo "repo: $root"
echo

have () { [ -e "$1" ]; }
size () { du -sh "$1" 2>/dev/null | cut -f1; }

echo "=== before ==="
du -sh public 2>/dev/null || true
echo

mkdir -p deliveries

for d in repose-unit-plans-2d-3d repose-unit-plans-glazing-corrected repose-level13-fixture-patch; do
  src="public/floor-explorer/$d"
  if have "$src"; then
    echo "moving $src ($(size "$src")) -> deliveries/$d"
    rm -rf "deliveries/$d"
    mv "$src" "deliveries/$d"
  else
    echo "already moved: $d"
  fi
done
echo

# Empty directories that Vite still walks and that confuse the asset check.
for d in "public/assets/Amenity videos" "public/assets/media-src"; do
  if have "$d" && [ -z "$(ls -A "$d" 2>/dev/null)" ]; then
    echo "removing empty directory: $d"
    rmdir "$d"
  fi
done

# macOS leaves these everywhere; they break `vite build` when it clears dist/.
n=$(find public dist -name '.DS_Store' 2>/dev/null | wc -l | tr -d ' ')
if [ "$n" != "0" ]; then
  echo "removing $n .DS_Store file(s) from public/ and dist/"
  find public dist -name '.DS_Store' -delete 2>/dev/null || true
fi
echo

echo "=== after ==="
du -sh public
echo
echo "kept, out of the build:"
du -sh deliveries/* 2>/dev/null || true
echo
echo "Now run:  npm run build"
