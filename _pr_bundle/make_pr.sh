#!/usr/bin/env bash
set -euo pipefail

# Usage: place this file in the repo root and run: bash make_pr.sh
BRANCH="feat/camera-player-and-pages"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Run this script from your Git repository root."
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Your working tree has uncommitted changes. Commit or stash them first."
  git status
  exit 1
fi

git fetch origin
git checkout -b "$BRANCH"

# Copy files from the bundle folder (this script expects ./_pr_bundle present)
SRC_DIR="./_pr_bundle"
if [ ! -d "$SRC_DIR" ]; then
  echo "Put the bundle folder as ./_pr_bundle and re-run. Aborting."
  exit 1
fi

mkdir -p content/ru/cameras/bolotnaya-square
mkdir -p content/ru/cameras/ul-serafimovicha

cp -a "$SRC_DIR/content/ru/cameras/bolotnaya-square/index.md" content/ru/cameras/bolotnaya-square/index.md
cp -a "$SRC_DIR/content/ru/cameras/ul-serafimovicha/index.md" content/ru/cameras/ul-serafimovicha/index.md

git add content/ru/cameras/bolotnaya-square/index.md content/ru/cameras/ul-serafimovicha/index.md
git commit -m "Cameras: add RU pages with stream_url (Bolotnaya Square, ul.Serafimovicha)"

# push & PR
git push -u origin "$BRANCH" || true

if command -v gh >/dev/null 2>&1; then
  gh pr create --fill --title "Add camera pages and HLS player integration" \
    --body "This PR adds RU camera pages with stream URLs and integrates the new tabbed HLS player. Pages: /ru/cameras/bolotnaya-square/ and /ru/cameras/ul-serafimovicha/."
else
  echo "Now open GitHub and create a PR from branch '$BRANCH'."
fi

echo "Done."
