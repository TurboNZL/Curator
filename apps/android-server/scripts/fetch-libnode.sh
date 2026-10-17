#!/usr/bin/env bash
# Downloads libnode.so (Node.js as a library for Android) from the nodejs-mobile release into app/libnode/bin/<abi>/.
# Usage: apps/android-server/scripts/fetch-libnode.sh [abi ...]      (default: arm64-v8a x86_64)
# LIBNODE_TAG picks the release (default below). The zip has bin/<abi>/libnode.so and include/node; the headers are not needed (node::Start is declared by hand).
set -euo pipefail
TAG="${LIBNODE_TAG:-v24.20.0-0}"
VERSION="${TAG#v}"
ABIS=("$@"); [ ${#ABIS[@]} -gt 0 ] || ABIS=(arm64-v8a x86_64)
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$HERE/../app/libnode"
ZIP="$(mktemp -d)/libnode.zip"
URL="https://github.com/digidem/nodejs-mobile/releases/download/${TAG}/nodejs-mobile-android-${VERSION}.zip"
echo "downloading $URL"
curl -fsSL --retry 3 -o "$ZIP" "$URL"
mkdir -p "$DEST"
for abi in "${ABIS[@]}"; do unzip -q -o "$ZIP" "bin/$abi/*" -d "$DEST"; test -s "$DEST/bin/$abi/libnode.so"; done
ls -la "$DEST"/bin/*/libnode.so
