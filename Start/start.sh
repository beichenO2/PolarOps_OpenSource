#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
POLARPORT_URL=${POLARPORT_URL:-http://127.0.0.1:11050}
PREFERRED_PORT=11065

if [ "$#" -ne 0 ]; then
  echo "PolarOps lifecycle is managed by PolarProcess; do not pass start/stop/restart arguments" >&2
  exit 2
fi

if [ ! -f "$PROJECT_DIR/dist/server.js" ]; then
  echo "PolarOps is not built; run npm ci && npm run build before registration/start" >&2
  exit 1
fi

if ! curl -fsS --max-time 3 "$POLARPORT_URL/api/health" >/dev/null; then
  echo "PolarPort is unavailable; refusing preferred-port fallback" >&2
  exit 1
fi

source "$HOME/Polarisor/Agent_core/scripts/port-claim.sh"
PORT=$(claim_port "polarops" "PolarOps" 11065)

if [ "$PORT" -ne "$PREFERRED_PORT" ]; then
  release_port "$PORT"
  echo "PolarPort returned $PORT, but PolarOps SSoT requires preferred port $PREFERRED_PORT" >&2
  exit 1
fi

cd "$PROJECT_DIR"
export PORT
exec node dist/server.js
