#!/bin/sh
# Sets the admin password for the local dev environment.
# Usage: scripts/set-admin-password-dev.sh <password>
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA_ROOT="$REPO_ROOT/data" node "$REPO_ROOT/server/scripts/set-admin-password.js" "$@"
