#!/usr/bin/env bash
# Kill orphaned Next.js dev processes for this project and remove stale lock files.
# Safe to run when no dev server is active.

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK_FILE="$PROJECT_DIR/.next/dev/lock"

kill_pid() {
  local pid="$1"
  [[ -z "$pid" ]] && return 0
  kill "$pid" 2>/dev/null || true
  sleep 0.2
  kill -9 "$pid" 2>/dev/null || true
}

# next dev launcher + worker subprocesses
if pgrep -f "$PROJECT_DIR/node_modules/.bin/next dev" >/dev/null 2>&1; then
  pkill -f "$PROJECT_DIR/node_modules/.bin/next dev" 2>/dev/null || true
  sleep 0.3
fi
pkill -f "$PROJECT_DIR/.next/dev/build" 2>/dev/null || true

# next-server from lock file (parent may already be gone after a crash)
if [[ -f "$LOCK_FILE" ]]; then
  LOCK_PID="$(node -e "
    try {
      const lock = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'));
      process.stdout.write(String(lock.pid ?? ''));
    } catch {}
  " "$LOCK_FILE" 2>/dev/null || true)"
  kill_pid "$LOCK_PID"
  rm -f "$LOCK_FILE"
fi
