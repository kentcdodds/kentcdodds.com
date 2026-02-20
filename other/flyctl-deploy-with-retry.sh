#!/usr/bin/env bash
set -euo pipefail

max_attempts="${FLY_DEPLOY_MAX_ATTEMPTS:-3}"
base_backoff_seconds="${FLY_DEPLOY_BASE_BACKOFF_SECONDS:-8}"

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 <flyctl deploy args...>" >&2
  exit 2
fi

if ! [[ "$max_attempts" =~ ^[1-9][0-9]*$ ]]; then
  echo "FLY_DEPLOY_MAX_ATTEMPTS must be a positive integer." >&2
  exit 2
fi

if ! [[ "$base_backoff_seconds" =~ ^[0-9]+$ ]]; then
  echo "FLY_DEPLOY_BASE_BACKOFF_SECONDS must be a non-negative integer." >&2
  exit 2
fi

is_transient_deploy_error() {
  local log_file="$1"
  grep -E -q \
    'error releasing builder: deadline_exceeded|failed to receive status: rpc error: code = Unavailable|error reading from server: EOF|graceful_stop' \
    "$log_file"
}

attempt=1
while [ "$attempt" -le "$max_attempts" ]; do
  log_file="$(mktemp)"
  echo "Running flyctl deploy attempt ${attempt}/${max_attempts}..."

  set +e
  flyctl deploy "$@" 2>&1 | tee "$log_file"
  exit_code="${PIPESTATUS[0]}"
  set -e

  if [ "$exit_code" -eq 0 ]; then
    rm -f "$log_file"
    exit 0
  fi

  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Deploy failed after ${attempt} attempts."
    rm -f "$log_file"
    exit "$exit_code"
  fi

  if is_transient_deploy_error "$log_file"; then
    sleep_seconds=$((base_backoff_seconds * attempt))
    echo "Transient Fly/Depot builder transport error detected."
    echo "Retrying in ${sleep_seconds}s..."
    rm -f "$log_file"
    sleep "$sleep_seconds"
    attempt=$((attempt + 1))
    continue
  fi

  echo "Non-retryable flyctl deploy failure encountered."
  rm -f "$log_file"
  exit "$exit_code"
done
