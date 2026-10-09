#!/usr/bin/env bash
# Update the Pi deployment: stop service, pull, install, build web client, restart.
# Run as the user that owns the checkout (e.g. curator). Needs sudo for systemctl unless root.
set -euo pipefail

SERVICE="${CURATOR_SERVICE:-curator}"
NODE_BIN="/home/curator/.nvm/versions/node/v22.23.3/bin"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# pnpm is installed globally under the same nvm node, so it must be on PATH too.
export PATH="$NODE_BIN:$PATH"

SUDO=""
if [ "$(id -u)" -ne 0 ]; then SUDO="sudo"; fi

# Report which step failed (set -e exits right after this runs).
CURRENT_STEP="starting"
trap 'echo "FAILED during: $CURRENT_STEP" >&2' ERR

step() { CURRENT_STEP="$1"; echo; echo "==> $1"; }

[ -x "$NODE_BIN/node" ] || { echo "Node not found at $NODE_BIN/node" >&2; exit 1; }
cd "$REPO_DIR"

step "Using node $("$NODE_BIN/node" -v) in $REPO_DIR"

step "Stopping $SERVICE service"
$SUDO systemctl stop "$SERVICE"

step "Pulling latest code (git pull --ff-only)"
git pull --ff-only

step "Installing dependencies (pnpm install)"
pnpm install --ignore-scripts --filter @curator/core --filter @curator/server --filter @curator/web

step "Building web client"
pnpm --filter @curator/web build

step "Starting $SERVICE service"
$SUDO systemctl start "$SERVICE"

step "Checking $SERVICE is running"
sleep 2
$SUDO systemctl is-active --quiet "$SERVICE"

echo
echo "Update complete. $SERVICE is running."
