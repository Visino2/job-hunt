#!/bin/bash
# Starts the backend, frontend, and a Cloudflare quick tunnel together, then
# prints the public URL to open on your phone. Ctrl+C stops all three.
#
# The tunnel URL is random and changes every time you run this — that's the
# tradeoff for not paying for a stable one. Requires server/.env to have
# APP_PASSWORD set, since this exposes a real public URL.

set -e
cd "$(dirname "$0")"

if ! grep -q "^APP_PASSWORD=.\+" server/.env 2>/dev/null; then
  echo "APP_PASSWORD is not set in server/.env — refusing to expose this publicly without it."
  echo "Add a line like APP_PASSWORD=your-password to server/.env and try again."
  exit 1
fi

LOG_DIR="/tmp"
(cd server && npm run dev) > "$LOG_DIR/job-hunt-server.log" 2>&1 &
SERVER_PID=$!
echo "Backend starting (pid $SERVER_PID)..."

(cd client && npm run dev) > "$LOG_DIR/job-hunt-client.log" 2>&1 &
CLIENT_PID=$!
echo "Frontend starting (pid $CLIENT_PID)..."

sleep 3

cloudflared tunnel --url http://localhost:5173 > "$LOG_DIR/job-hunt-tunnel.log" 2>&1 &
TUNNEL_PID=$!
echo "Tunnel starting (pid $TUNNEL_PID)..."

# Killed by matching the actual process command lines, not the $SERVER_PID/
# $CLIENT_PID wrapper PIDs above — those are the `npm run dev` subshells,
# not the real tsx/vite processes npm spawns underneath them, so killing
# just the wrapper PIDs leaves the real ones running as orphans.
# `|| true` on each: under `set -e`, pkill finding nothing to kill (exit
# code 1) would otherwise abort cleanup before reaching the later lines.
cleanup() {
  echo ""
  echo "Stopping everything..."
  pkill -f "tsx watch src/index.ts" 2>/dev/null || true
  pkill -f "job-hunt-assistant/client/node_modules/.bin/vite" 2>/dev/null || true
  pkill -f "cloudflared tunnel --url" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

echo "Waiting for tunnel URL..."
URL=""
for _ in $(seq 1 20); do
  URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$LOG_DIR/job-hunt-tunnel.log" 2>/dev/null | head -1)
  if [ -n "$URL" ]; then
    break
  fi
  sleep 1
done

if [ -z "$URL" ]; then
  echo "Couldn't find the tunnel URL — check $LOG_DIR/job-hunt-tunnel.log"
else
  echo ""
  echo "=========================================="
  echo "Open this on your phone: $URL"
  echo "=========================================="
  echo ""
  # Printed as terminal text (not a saved image), so it always renders
  # here regardless of what's viewing this terminal — scan it straight
  # off the screen with your phone's camera.
  if command -v qrencode >/dev/null 2>&1; then
    qrencode -t ANSIUTF8 "$URL"
    echo ""
  fi
fi

echo "Press Ctrl+C to stop everything."
wait
