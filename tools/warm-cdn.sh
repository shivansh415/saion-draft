#!/usr/bin/env bash
# Warms the CDN after a deployment.
#
# Every file the site ships is requested once, twelve at a time, so the edge
# cache (Cloudflare with Smart Tiered Cache, or Hostinger's CDN) holds it
# before a real visitor asks — the first visitor in a region otherwise pays the
# shared origin's cost for every one of the 700-odd files, and on a busy day
# that is the whole film arriving at a crawl.
#
# Usage:  tools/warm-cdn.sh https://reposeresidence.com
# Run it from the repo root after `npm run build` has produced dist/ and the
# same build has been uploaded. It reads dist/ for the file list, so it only
# ever asks for what actually shipped.
set -euo pipefail
ORIGIN="${1:-https://reposeresidence.com}"
cd "$(dirname "$0")/../dist"
[ -f index.html ] || { echo "dist/ is missing — run npm run build first"; exit 1; }
list=$(find . -type f ! -name '*.br' ! -name '*.gz' ! -name '.DS_Store' ! -name '.htaccess' | sed 's|^\./||')
total=$(printf '%s\n' "$list" | wc -l | tr -d ' ')
echo "Warming $total files on $ORIGIN …"
printf '%s\n' "$list" | python3 -c 'import sys,urllib.parse;[print(urllib.parse.quote(l.rstrip("\n"))) for l in sys.stdin]' \
  | xargs -P 12 -I{} curl -s -o /dev/null -A "warm-cdn/1.0" --max-time 120 -w "%{http_code} {}\n" "$ORIGIN/{}" \
  | awk '{ c[$1]++ } END { for (k in c) printf "  %s × %d\n", k, c[k] }'
echo "Done. Check: curl -sI $ORIGIN/assets/opening/building/final-frame.webp | grep -i cache-status"
