#!/bin/sh
set -eu

SCREENSHOT_DIR="${SCREENSHOT_DIR:-/app/tmp/screenshot}"
mkdir -p "$SCREENSHOT_DIR"
# The API image runs as UID/GID 1000 and removes expired screenshots.
chown 1000:1000 "$SCREENSHOT_DIR"

exec ./docker/with-xvfb.sh node dist/function/verifierServer.js
