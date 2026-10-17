#!/usr/bin/env bash
# Builds the server bundle the app carries: headless.mjs (the library server in one file) and the web client, into apps/android-server/bundle/.
# Run from anywhere; needs `pnpm install --ignore-scripts --filter @turbomusic/web --filter @turbomusic/core --filter @turbomusic/server --filter @turbomusic/electron` first.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
OUT="$ROOT/apps/android-server/bundle"
pnpm --dir "$ROOT" --filter @turbomusic/web build
node "$ROOT/apps/electron/scripts/build.mjs"
rm -rf "$OUT" && mkdir -p "$OUT/web"
cp "$ROOT/apps/electron/dist/headless.mjs" "$OUT/"
cp -r "$ROOT/apps/web/dist/." "$OUT/web/"
ls -la "$OUT"
