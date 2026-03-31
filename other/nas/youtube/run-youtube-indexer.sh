#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
default_repo_root="$(cd -- "$script_dir/../../.." && pwd)"
repo_root="${REPO_ROOT:-$default_repo_root}"

image_tag="${IMAGE_TAG:-kcd-youtube-indexer:latest}"
container_name="${CONTAINER_NAME:-kcd-youtube-indexer}"
env_file="${ENV_FILE:-$script_dir/youtube-indexer.env}"
cache_dir="${CACHE_DIR:-$script_dir/.cache/youtube-transcripts}"
container_cache_dir="/cache/youtube-transcripts"
# Mount env file in-container so secrets are not listed in `docker inspect` Config.Env.
container_env_file="/run/secrets/youtube-indexer.env"

if [ ! -f "$env_file" ]; then
	echo "Missing env file: $env_file" >&2
	echo "Copy $script_dir/youtube-indexer.env.example to $env_file and fill it in." >&2
	exit 1
fi

mkdir -p "$cache_dir"

# Synology Docker often has no buildx; BuildKit then errors:
# "BuildKit is enabled but the buildx component is missing or broken."
# Default to the legacy builder. On a machine with buildx, set DOCKER_BUILDKIT=1.
export DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-0}"
if [ "${DOCKER_BUILDKIT}" = "1" ]; then
	export BUILDKIT_PROGRESS="${BUILDKIT_PROGRESS:-plain}"
fi

docker build --network host \
	-f "$script_dir/youtube-indexer.dockerfile" \
	-t "$image_tag" \
	"$repo_root"

docker rm -f "$container_name" >/dev/null 2>&1 || true

docker run --name "$container_name" --rm --network host \
	-v "$env_file:$container_env_file:ro" \
	-e "YOUTUBE_TRANSCRIPT_CACHE_DIR=$container_cache_dir" \
	-v "$cache_dir:$container_cache_dir" \
	"$image_tag" \
	--env-file="$container_env_file" \
	other/semantic-search/index-youtube-playlist.ts \
	"$@"
