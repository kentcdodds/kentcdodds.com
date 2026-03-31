#!/usr/bin/env bash
# Synology Task Scheduler (or cron): clone/pull repo, then run the Dockerized indexer.
# Point the scheduled task at this file, or paste its contents into "User-defined script".
# Requires bash (not plain sh). In Task Scheduler use:
#   /bin/bash /volume1/docker/kentcdodds.com/youtube-index-task.sh

set -euo pipefail
set -o pipefail
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

BUNDLE_DIR=/volume1/docker/kentcdodds.com
REPO_DIR="$BUNDLE_DIR/repo"
REPO_URL=https://github.com/kentcdodds/kentcdodds.com.git
GIT_IMAGE=alpine/git:latest
GIT_CONTAINER_NAME=kcd-youtube-indexer-git
LOG_DIR="$BUNDLE_DIR/logs"
# One append-only file (no new file per day). Override: LOG_FILE=/path/to/custom.log
LOG_FILE="${LOG_FILE:-$LOG_DIR/youtube-indexer.log}"

mkdir -p "$BUNDLE_DIR" "$LOG_DIR"

timestamp() {
	date '+%Y-%m-%d %H:%M:%S'
}

run_task() {
	echo "[$(timestamp)] Starting YouTube index task"
	echo "[$(timestamp)] Bundle dir: $BUNDLE_DIR"
	echo "[$(timestamp)] Repo dir: $REPO_DIR"
	echo "[$(timestamp)] Log file: $LOG_FILE"
	echo "[$(timestamp)] Tip: DSM Task 'Run Result' often stays empty until the task exits; tail this file for live output."

	if [ ! -f "$BUNDLE_DIR/youtube-indexer.env" ]; then
		echo "[$(timestamp)] ERROR: Missing env file: $BUNDLE_DIR/youtube-indexer.env"
		exit 1
	fi

	docker rm -f "$GIT_CONTAINER_NAME" >/dev/null 2>&1 || true

	if [ ! -d "$REPO_DIR/.git" ]; then
		echo "[$(timestamp)] Repo missing, cloning fresh checkout"
		docker run --name "$GIT_CONTAINER_NAME" --rm --network host \
			-v "$BUNDLE_DIR:/work" \
			"$GIT_IMAGE" \
			clone "$REPO_URL" /work/repo
		echo "[$(timestamp)] Clone completed"
	else
		echo "[$(timestamp)] Repo exists, pulling latest main"
		# alpine/git uses ENTRYPOINT git; override to shell so we can run multiple git commands.
		docker run --name "$GIT_CONTAINER_NAME" --rm --network host \
			--entrypoint /bin/sh \
			-v "$REPO_DIR:/repo" \
			-w /repo \
			"$GIT_IMAGE" \
			-c 'git fetch origin && git checkout main && git pull --ff-only origin main'
		echo "[$(timestamp)] Pull completed"
	fi

	echo "[$(timestamp)] Starting Dockerized YouTube indexer (build may show random container names; see nas-youtube-indexer.md)"
	export CONTAINER_NAME="${CONTAINER_NAME:-kcd-youtube-indexer}"
	REPO_ROOT="$REPO_DIR" "$BUNDLE_DIR/start-youtube-indexer.sh"
	echo "[$(timestamp)] YouTube indexer finished successfully"
}

# tee: same bytes to log file and stdout. DSM may still buffer Run Result until exit.
if command -v stdbuf >/dev/null 2>&1; then
	run_task 2>&1 | stdbuf -oL -eL tee -a "$LOG_FILE"
else
	run_task 2>&1 | tee -a "$LOG_FILE"
fi
