#!/usr/bin/env bash
set -euo pipefail

# Определяем корень репо и переходим туда
if ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  cd "$ROOT_DIR"
else
  # если git недоступен — идём на уровень выше от скрипта
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  cd "$SCRIPT_DIR/.."
fi

echo "→ Working dir: $(pwd)"

# Проверка зависимостей (не падаем, если jpegtran не установлен)
need() { command -v "$1" >/dev/null 2>&1 || { echo "Install $1"; exit 1; }; }
need mogrify
if ! command -v jpegtran >/dev/null 2>&1; then
  echo "⚠ jpegtran not found (optional). You can: sudo apt install libjpeg-turbo-progs"
fi

TARGET_DIRS=("static")

for DIR in "${TARGET_DIRS[@]}"; do
  if [[ ! -d "$DIR" ]]; then
    echo "✗ Skip: $DIR not found"
    continue
  fi

  echo "• Optimizing JPG in $DIR ..."
  # 1) resize ≤ 1920, убрать метаданные, прогрессивные, качество ~82
  find "$DIR" -type f -iregex '.*\.\(jpg\|jpeg\)' -exec mogrify \
    -resize "1920x1920>" -sampling-factor 4:2:0 -strip -interlace Plane -quality 82 {} +

  # 2) доп. оптимизация (если есть jpegtran)
  if command -v jpegtran >/dev/null 2>&1; then
    find "$DIR" -type f -iregex '.*\.\(jpg\|jpeg\)' -exec sh -c '
      for f in "$@"; do
        tmp="$f.tmp"
        jpegtran -copy none -optimize -progressive -outfile "$tmp" "$f" && mv "$tmp" "$f"
      done
    ' sh {} +
  fi

  # 3) показать «крупняк», если вдруг остался
  echo "Big files (>1MB) in $DIR:"
  find "$DIR" -type f -iregex '.*\.\(jpg\|jpeg\)' -size +1000k -exec ls -lh {} \; || true
done

echo "✓ Images optimized."
