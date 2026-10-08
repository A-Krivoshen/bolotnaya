#!/usr/bin/env bash
# Every two hours: one frame from the local MediaMTX HLS, neo-punk still, push that slot.
# Runs on the VPS as drslon. The clock band is chopped off before the grade.
set -euo pipefail

REPO="${POSTER_REPO:-/home/drslon/bolotnaya-poster}"
KEY="${POSTER_KEY:-${HOME}/.ssh/id_ed25519_bolotnaya_poster}"
export GIT_SSH_COMMAND="ssh -i ${KEY} -o IdentitiesOnly=yes -o BatchMode=yes"

exec 9>/tmp/bolotnaya-poster.lock
flock -n 9 || exit 0

cd "${REPO}"
git fetch --prune origin
git checkout main
git reset --hard origin/main

slot="$(TZ=Europe/Moscow date +%H)"
slot="$(printf '%02d' $((10#${slot} / 2 * 2)))"
raw="$(mktemp /tmp/bolotnaya-raw-XXXX.jpg)"
trap 'rm -f "${raw}"' EXIT

/usr/bin/ffmpeg -y -loglevel error \
  -i http://127.0.0.1:8888/boloto_new/index.m3u8 \
  -frames:v 1 -q:v 2 "${raw}"

mkdir -p static/images/cameras/pool
/usr/bin/convert "${raw}" -chop 0x180 \
  -modulate 94,145,100 \
  -fill '#16081c' -colorize 16% \
  -channel B -evaluate multiply 1.2 +channel \
  -sigmoidal-contrast 4,42% \
  -filter point -resize 480x270 -resize 1440x810! \
  -strip -quality 80 \
  "static/images/cameras/pool/${slot}.jpg"

python3 - <<'PY'
import json, time
from pathlib import Path
root = Path("static/images/cameras/pool")
files = sorted(root.glob("seed.jpg")) + sorted(root.glob("[0-9][0-9].jpg"))
images = []
for path in files:
    images.append({
        "src": "/images/cameras/pool/" + path.name,
        "v": str(int(path.stat().st_mtime)),
    })
manifest = {
    "slot_hours": 2,
    "timezone": "Europe/Moscow",
    "updated": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
    "images": images,
}
(root / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
PY

git add static/images/cameras/pool
if git diff --cached --quiet; then
  echo "slot ${slot} unchanged"
  exit 0
fi
git -c user.name="Bolotnaya poster" -c user.email="info@bolotnaya.online" \
  commit -m "Refresh the ${slot}:00 camera card."
git push origin HEAD:main
echo "slot ${slot} pushed"
