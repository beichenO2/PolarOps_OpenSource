#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$SCRIPT_DIR/.pid"
LOG_FILE="$SCRIPT_DIR/../start.log"

cd "$PROJECT_DIR"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

is_running() {
    local pid
    if [ ! -f "$PID_FILE" ]; then
        return 1
    fi
    pid=$(cat "$PID_FILE" 2>/dev/null || true)
    if [ -z "$pid" ]; then
        return 1
    fi
    kill -0 "$pid" 2>/dev/null
}

wait_for_readiness() {
    local max_wait=30
    local waited=0
    while [ $waited -lt $max_wait ]; do
        if is_running; then
            echo "PolarOps is running (pid=$(cat "$PID_FILE"))."
            return 0
        fi
        sleep 1
        waited=$((waited + 1))
    done
    echo "PolarOps failed to start within ${max_wait}s." >&2
    return 1
}

# ---------------------------------------------------------------------------
# Subcommands
# ---------------------------------------------------------------------------

do_start() {
    if is_running; then
        echo "PolarOps is already running (pid=$(cat "$PID_FILE"))."
        exit 0
    fi

    # Install dependencies
    if [ -f "package-lock.json" ]; then
        echo "Installing dependencies (npm ci)..."
        npm ci
    fi

    # Build if needed
    if [ -f "tsconfig.json" ]; then
        echo "Building..."
        npm run build
    fi

    # Start in background
    echo "Starting PolarOps..."
    nohup npm start > "$LOG_FILE" 2>&1 &
    local daemon_pid=$!
    echo "$daemon_pid" > "$PID_FILE"

    # Wait for readiness
    wait_for_readiness
}

do_stop() {
    if ! is_running; then
        echo "PolarOps is not running."
        rm -f "$PID_FILE"
        exit 0
    fi

    local pid
    pid=$(cat "$PID_FILE")
    echo "Stopping PolarOps (pid=$pid)..."

    # Graceful SIGTERM
    kill -15 "$pid" 2>/dev/null || true

    # Wait up to 10s for graceful shutdown
    local waited=0
    while [ $waited -lt 10 ]; do
        if ! kill -0 "$pid" 2>/dev/null; then
            break
        fi
        sleep 1
        waited=$((waited + 1))
    done

    # SIGKILL fallback
    if kill -0 "$pid" 2>/dev/null; then
        echo "Process did not exit, sending SIGKILL..."
        kill -9 "$pid" 2>/dev/null || true
        sleep 1
    fi

    rm -f "$PID_FILE"
    echo "PolarOps stopped."
}

do_restart() {
    do_stop
    do_start
}

do_status() {
    if is_running; then
        echo "PolarOps is running (pid=$(cat "$PID_FILE"))."
    else
        echo "PolarOps is not running."
        rm -f "$PID_FILE"
    fi
}

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

COMMAND="${1:-start}"

case "$COMMAND" in
    start)
        do_start
        ;;
    stop)
        do_stop
        ;;
    restart)
        do_restart
        ;;
    status)
        do_status
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}" >&2
        exit 1
        ;;
esac
