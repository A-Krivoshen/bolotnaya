#!/usr/bin/env bash
set -euo pipefail

cd public
FOUND=0
for p in "localhost" "127.0.0.1" "a-krivoshen.github.io" "bolotnaya.netlify.app"; do
  if grep -R -n "$p" .; then
    echo "Found forbidden reference: $p" >&2
    FOUND=1
  fi
done

if [ "$FOUND" -ne 0 ]; then
  exit 1
fi
