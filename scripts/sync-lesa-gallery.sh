#!/usr/bin/env bash
# Drop new files into static/images/galleries/lesa-2026/
# then run this to print YAML for content/*/galleries/remont-lesa-2026.md
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/static/images/galleries/lesa-2026"
echo "# images for $DIR"
echo "images:"
find "$DIR" -maxdepth 1 -type f \( \
  -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' \
  -o -iname '*.gif' -o -iname '*.mp4' -o -iname '*.webm' \) \
  | sort | while read -r f; do
  base="$(basename "$f")"
  # skip video posters if a matching mp4 exists (listed separately with thumb)
  ext="${base##*.}"
  stem="${base%.*}"
  if [[ "${ext,,}" =~ ^(jpg|jpeg)$ && -f "$DIR/${stem}.mp4" ]]; then
    continue
  fi
  src="/images/galleries/lesa-2026/${base}"
  if [[ "${ext,,}" =~ ^(mp4|webm|mov)$ ]]; then
    thumb=""
    [[ -f "$DIR/${stem}.jpg" ]] && thumb="/images/galleries/lesa-2026/${stem}.jpg"
    echo "  - src: $src"
    [[ -n "$thumb" ]] && echo "    thumb: $thumb"
    echo "    caption: \"${stem}\""
  else
    echo "  - src: $src"
    echo "    caption: \"${stem}\""
  fi
done
