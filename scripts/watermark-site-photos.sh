#!/bin/bash
# Burn a small "bolotnaya.online" mark on stills that lack one.
# Skips GIFs (already grok-watermarked), screenshots, reconstructions, placeholders.
set -euo pipefail
ROOT=/var/www/src/bolotnaya/static/images
FONT=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
MARK=' bolotnaya.online '
count=0
skip=0
while IFS= read -r -d '' f; do
  base=$(basename "$f")
  case "$base" in
    *watermarked*|Screenshot*|reconstruct-*|camera.svg|*placeholder*) skip=$((skip+1)); continue ;;
  esac
  case "$f" in
    */placeholders/*) skip=$((skip+1)); continue ;;
  esac
  # already burned?
  if identify -format '%[comment]\n%[label]\n' "$f" 2>/dev/null | grep -qi 'bolotnaya.online'; then
    skip=$((skip+1)); continue
  fi
  w=$(identify -format '%w' "$f")
  ps=$(( w / 40 ))
  if [ "$ps" -lt 12 ]; then ps=12; fi
  if [ "$ps" -gt 22 ]; then ps=22; fi
  ext="${f##*.}"
  tmp="${f}.wm.$$.${ext}"
  convert "$f" \
    -font "$FONT" -pointsize "$ps" \
    -gravity southeast \
    -fill 'rgba(255,255,255,0.40)' \
    -annotate +18+14 "$MARK" \
    -strip -quality 85 \
    "$tmp"
  mv -f "$tmp" "$f"
  # drop stale webp sidecar next to source if any (optimize script regenerates)
  rm -f "${f}.webp" "${f}.br"
  count=$((count+1))
  echo "wm $count $f"
done < <(find "$ROOT" -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) -print0)
echo "watermarked=$count skipped=$skip"
