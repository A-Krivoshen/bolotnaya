#!/usr/bin/env bash
# One day only. Every two hours, save a clean frame for the neo-punk restyle.
# The clock band is chopped off. Styling happens before the card is published.
# ${HOME}/bolotnaya-poster-until holds the unix deadline. After it, the cron line is removed.
set -euo pipefail

UNTIL_FILE="${HOME}/bolotnaya-poster-until"
INBOX="${HOME}/poster-inbox"

finish_poster_day() {
  tmp="$(mktemp)"
  crontab -l 2>/dev/null | grep -v 'capture-poster.sh' | grep -v '^CRON_TZ=Europe/Moscow$' > "${tmp}" || true
  crontab "${tmp}" || true
  rm -f "${tmp}"
  echo "poster day finished"
  exit 0
}

if [[ -f "${UNTIL_FILE}" ]]; then
  now="$(date +%s)"
  end="$(tr -cd '0-9' < "${UNTIL_FILE}")"
  if [[ -n "${end}" && "${now}" -ge "${end}" ]]; then
    finish_poster_day
  fi
fi

exec 9>/tmp/bolotnaya-poster.lock
flock -n 9 || exit 0

slot="$(TZ=Europe/Moscow date +%H)"
slot="$(printf '%02d' $((10#${slot} / 2 * 2)))"
raw="$(mktemp /tmp/bolotnaya-raw-XXXX.jpg)"
trap 'rm -f "${raw}"' EXIT

/usr/bin/ffmpeg -y -loglevel error \
  -i http://127.0.0.1:8888/boloto_new/index.m3u8 \
  -frames:v 1 -q:v 2 "${raw}"

mkdir -p "${INBOX}"
/usr/bin/convert "${raw}" -chop 0x180 -strip -quality 90 "${INBOX}/${slot}.jpg"
echo "inbox ${slot}"
