#!/usr/bin/env bash

set -euo pipefail

log() {
	printf '%s\n' "$*" >&2
}

curl_connect_timeout_seconds=10
curl_max_time_seconds=300
curl_retry_count=3
curl_retry_delay_seconds=5

require_env() {
	local name="$1"
	if [[ -z "${!name:-}" ]]; then
		log "Missing required env var: ${name}"
		exit 1
	fi
}

require_file() {
	local file_path="$1"
	if [[ ! -f "$file_path" ]]; then
		log "Missing required file: ${file_path}"
		exit 1
	fi
}

download_to_file() {
	local output_path="$1"
	local url="$2"
	curl \
		--fail \
		--silent \
		--show-error \
		--location \
		--connect-timeout "$curl_connect_timeout_seconds" \
		--max-time "$curl_max_time_seconds" \
		--retry "$curl_retry_count" \
		--retry-delay "$curl_retry_delay_seconds" \
		--retry-connrefused \
		--output "$output_path" \
		"$url"
}

upload_file() {
	local input_path="$1"
	local url="$2"
	curl \
		--fail \
		--silent \
		--show-error \
		--request PUT \
		--connect-timeout "$curl_connect_timeout_seconds" \
		--max-time "$curl_max_time_seconds" \
		--retry "$curl_retry_count" \
		--retry-delay "$curl_retry_delay_seconds" \
		--retry-connrefused \
		--header "Content-Type: audio/mpeg" \
		--header "Expect:" \
		--output /dev/null \
		--upload-file "$input_path" \
		"$url"
}

require_env "CALL_KENT_AUDIO_DRAFT_ID"
require_env "CALL_KENT_AUDIO_ATTEMPT"
require_env "CALL_AUDIO_URL"
require_env "RESPONSE_AUDIO_URL"
require_env "EPISODE_UPLOAD_URL"
require_env "CALLER_SEGMENT_UPLOAD_URL"
require_env "RESPONSE_SEGMENT_UPLOAD_URL"

assets_dir="${CALL_KENT_AUDIO_ASSETS_DIR:-/opt/call-kent-audio/assets}"
intro_path="${assets_dir}/intro.mp3"
interstitial_path="${assets_dir}/interstitial.mp3"
outro_path="${assets_dir}/outro.mp3"

require_file "$intro_path"
require_file "$interstitial_path"
require_file "$outro_path"

work_dir="$(mktemp -d -t call-kent-audio-XXXXXX)"
cleanup() {
	rm -rf "$work_dir"
}
trap cleanup EXIT

call_path="${work_dir}/call.input"
response_path="${work_dir}/response.input"
call_out_path="${work_dir}/call.normalized.mp3"
response_out_path="${work_dir}/response.normalized.mp3"
episode_out_path="${work_dir}/episode.mp3"

log "Downloading Call Kent audio inputs for draft ${CALL_KENT_AUDIO_DRAFT_ID} (attempt ${CALL_KENT_AUDIO_ATTEMPT})"
download_to_file "$call_path" "$CALL_AUDIO_URL"
download_to_file "$response_path" "$RESPONSE_AUDIO_URL"

log "Running FFmpeg stitching pipeline"
ffmpeg \
	-hide_banner \
	-nostats \
	-loglevel error \
	-i "$intro_path" \
	-i "$call_path" \
	-i "$interstitial_path" \
	-i "$response_path" \
	-i "$outro_path" \
	-filter_complex "
		[1]silenceremove=1:0:-50dB[trimmedCall];
		[3]silenceremove=1:0:-50dB[trimmedResponse];
		[trimmedCall]silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-50dB[noSilenceCall];
		[trimmedResponse]silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-50dB[noSilenceResponse];
		[noSilenceCall]loudnorm=I=-16:LRA=11:TP=0.0[call0];
		[noSilenceResponse]loudnorm=I=-16:LRA=11:TP=0.0[response0];
		[call0]asplit=2[callForEpisode][callForStandalone];
		[response0]asplit=2[responseForEpisode][responseForStandalone];
		[0][callForEpisode]acrossfade=d=1:c2=nofade[a01];
		[a01][2]acrossfade=d=1:c1=nofade[a02];
		[a02][responseForEpisode]acrossfade=d=1:c2=nofade[a03];
		[a03][4]acrossfade=d=1:c1=nofade[out]
	" \
	-map "[callForStandalone]" "$call_out_path" \
	-map "[responseForStandalone]" "$response_out_path" \
	-map "[out]" "$episode_out_path"

log "Uploading stitched audio outputs"
upload_file "$episode_out_path" "$EPISODE_UPLOAD_URL"
upload_file "$call_out_path" "$CALLER_SEGMENT_UPLOAD_URL"
upload_file "$response_out_path" "$RESPONSE_SEGMENT_UPLOAD_URL"

episode_size="$(wc -c < "$episode_out_path" | tr -d '[:space:]')"
caller_segment_size="$(wc -c < "$call_out_path" | tr -d '[:space:]')"
response_segment_size="$(wc -c < "$response_out_path" | tr -d '[:space:]')"

printf '{"episodeAudioSize":%s,"callerSegmentAudioSize":%s,"responseSegmentAudioSize":%s}\n' \
	"$episode_size" \
	"$caller_segment_size" \
	"$response_segment_size"
