#!/usr/bin/env bash
# Optimize gallery images for the web.
# Animated GIFs stay GIFs (motion preserved), only re-encoded smaller.
set -euo pipefail

if ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  cd "$ROOT_DIR"
else
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  cd "$SCRIPT_DIR/.."
fi

echo "→ Working dir: $(pwd)"
need() { command -v "$1" >/dev/null 2>&1 || { echo "Install $1"; exit 1; }; }
need ffmpeg
need python3

compress_gif() {
  local f="$1"
  local sz tmp out nsz
  sz=$(stat -c%s "$f")
  [[ "$sz" -lt 400000 ]] && return 0
  tmp=$(mktemp --suffix=.gif)
  if ffmpeg -y -i "$f" -filter_complex \
    "fps=7,scale=288:288:force_original_aspect_ratio=decrease,pad=288:288:(ow-iw)/2:(oh-ih)/2,split[a][b];[a]palettegen=max_colors=28:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5" \
    -f gif -loop 0 "$tmp" 2>/dev/null; then
    nsz=$(stat -c%s "$tmp")
    if [[ "$nsz" -lt "$sz" ]] && python3 -c "from PIL import Image; im=Image.open(r'''$tmp'''); assert im.n_frames>1"; then
      cp -f "$tmp" "$f"
      echo "GIF $(basename "$f"): $((sz/1024))KB → $((nsz/1024))KB"
    fi
  fi
  rm -f "$tmp"
}

echo "• Animated GIFs (keep motion)..."
while IFS= read -r -d '' f; do
  compress_gif "$f"
done < <(find static/images -type f -iname '*.gif' -print0)

echo "• JPEG / PNG via Pillow..."
python3 - <<'PY'
from pathlib import Path
from PIL import Image, ImageOps
import io
root = Path('static/images')
for p in root.rglob('*'):
    if p.suffix.lower() not in {'.jpg','.jpeg'}:
        continue
    before = p.stat().st_size
    try:
        with Image.open(p) as im:
            im = ImageOps.exif_transpose(im).convert('RGB')
            w,h = im.size
            s = min(1.0, 1600/max(w,h))
            if s < 1: im = im.resize((int(w*s), int(h*s)), Image.Resampling.LANCZOS)
            buf = io.BytesIO(); im.save(buf, format='JPEG', quality=82, optimize=True, progressive=True)
            data = buf.getvalue()
        if len(data) < before * 0.98:
            p.write_bytes(data)
            print(f"JPG {p.name}: {before//1024}→{len(data)//1024}KB")
    except Exception as e:
        print('fail', p, e)
print('done')
PY

echo "✓ Images optimized (GIFs remain animated)."
du -sh static/images || true
