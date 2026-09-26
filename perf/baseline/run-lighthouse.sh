#!/usr/bin/env bash
set -euo pipefail

# Usage: run-lighthouse.sh <date-dir>
# Reads ../pages.json, runs lighthouse mobile preset N times per page:
#   1 warm-up (discarded) + RUNS_PER_PAGE measured runs.
# Writes <slug>-1.report.{json,html} ... <slug>-N.report.{json,html} into
# the date dir. summarize.mjs / diff.mjs take the median across these runs.

RUNS_PER_PAGE="${RUNS_PER_PAGE:-3}"

DATE_DIR="${1:-$(date +%F)}"
ROOT="$(cd "$(dirname "$0")" && pwd)"
OUT_DIR="$ROOT/$DATE_DIR"
PAGES_JSON="$ROOT/pages.json"

mkdir -p "$OUT_DIR"

HOST=$(node -e "console.log(require('$PAGES_JSON')._meta.host)")
PAGES=$(node -e "const p=require('$PAGES_JSON').pages; p.forEach(x=>console.log(x.slug+'\t'+x.path))")

COMMON_FLAGS=(
  --quiet
  --chrome-flags="--headless=new --no-sandbox --disable-gpu --hide-scrollbars"
  --only-categories=performance
  --output=json --output=html
  --max-wait-for-load=60000
)

echo "lighthouse runs → $OUT_DIR (runs/page=$RUNS_PER_PAGE)"
echo "host: $HOST"
echo

while IFS=$'\t' read -r slug path; do
  url="${HOST}${path}"
  echo "▶ [$slug] $url"

  echo "  warm-up …"
  pnpm dlx lighthouse@latest "$url" "${COMMON_FLAGS[@]}" \
    --output-path="$OUT_DIR/_warmup-$slug" > /dev/null 2>&1 || {
      echo "  ⚠ warm-up failed for $slug, skipping page"
      continue
    }
  rm -f "$OUT_DIR/_warmup-$slug".report.{json,html}

  for i in $(seq 1 "$RUNS_PER_PAGE"); do
    echo "  measure $i/$RUNS_PER_PAGE …"
    pnpm dlx lighthouse@latest "$url" "${COMMON_FLAGS[@]}" \
      --output-path="$OUT_DIR/$slug-$i" 2>&1 | tail -3
  done

  echo "  ✓ $slug ($RUNS_PER_PAGE runs)"
  echo
done <<< "$PAGES"

echo "done. reports → $OUT_DIR"
