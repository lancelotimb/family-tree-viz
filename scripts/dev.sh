#!/usr/bin/env bash
# Start vercel dev with automatic cleanup on start and exit.
# Prevents "Another next dev server is already running" after crashes or Ctrl+C.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cleanup() {
  bash "$PROJECT_DIR/scripts/clean-dev.sh"
}

trap cleanup EXIT INT TERM

bash "$PROJECT_DIR/scripts/clean-dev.sh"
exec vercel dev "$@"
