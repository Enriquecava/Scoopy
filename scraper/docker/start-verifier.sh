#!/bin/sh
set -eu

DISPLAY_NUMBER="${VERIFIER_DISPLAY_NUMBER:-99}"
DISPLAY_SOCKET="/tmp/.X11-unix/X${DISPLAY_NUMBER}"
XVFB_PID=
NODE_PID=

cleanup() {
  if [ -n "$NODE_PID" ]; then
    kill "$NODE_PID" 2>/dev/null || true
  fi
  if [ -n "$XVFB_PID" ]; then
    kill "$XVFB_PID" 2>/dev/null || true
  fi
  if [ -n "$NODE_PID" ]; then
    wait "$NODE_PID" 2>/dev/null || true
  fi
  if [ -n "$XVFB_PID" ]; then
    wait "$XVFB_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

Xvfb ":${DISPLAY_NUMBER}" -screen 0 1280x1024x24 -nolisten tcp -ac &
XVFB_PID=$!

attempt=0
while [ ! -S "$DISPLAY_SOCKET" ]; do
  if ! kill -0 "$XVFB_PID" 2>/dev/null; then
    echo "Xvfb exited before display ${DISPLAY_NUMBER} became ready" >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 50 ]; then
    echo "Timed out waiting for Xvfb display ${DISPLAY_NUMBER}" >&2
    exit 1
  fi
  sleep 0.1
done

export DISPLAY=":${DISPLAY_NUMBER}"
node /app/dist/function/verifierServer.js &
NODE_PID=$!
wait "$NODE_PID"