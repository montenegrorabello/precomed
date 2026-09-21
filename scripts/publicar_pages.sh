#!/usr/bin/env bash
# Compila o Angular e publica o resultado na branch gh-pages (GitHub Pages).
# Uso: bash scripts/publicar_pages.sh
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RAIZ/app"
npx ng build
DIST="$RAIZ/app/dist/app/browser"
touch "$DIST/.nojekyll"
REMOTO="$(git -C "$RAIZ" remote get-url origin)"
cd "$DIST"
rm -rf .git
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C "$RAIZ" config user.name)" -c user.email="$(git -C "$RAIZ" config user.email)" \
  commit -q -m "Publicação $(date '+%Y-%m-%d %H:%M')"
git push -q -f "$REMOTO" gh-pages
rm -rf .git
echo "Publicado na branch gh-pages."
