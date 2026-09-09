#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
for pid in $(lsof -tiTCP:8080 -sTCP:LISTEN 2>/dev/null); do
  kill -9 "$pid" 2>/dev/null || true
done
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
exec npm run dev:local
