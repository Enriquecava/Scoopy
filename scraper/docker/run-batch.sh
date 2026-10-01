#!/bin/sh
# Runs the batch processor on a loop, waiting SCRAPER_BATCH_INTERVAL_SECONDS between runs.
# This is the "internal cron" for the scraper container.
set -e

INTERVAL="${SCRAPER_BATCH_INTERVAL_SECONDS:-3600}"

while true; do
  echo "[run-batch] Starting batch run at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  node dist/function/productBatchProcessor.js || echo "[run-batch] Batch run failed, will retry on next interval"
  echo "[run-batch] Sleeping ${INTERVAL}s"
  sleep "${INTERVAL}"
done
