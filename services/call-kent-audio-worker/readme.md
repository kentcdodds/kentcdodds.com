This Worker hosts the Cloudflare Workflow entrypoint for the full Call Kent
draft pipeline.

Key files:

- `src/index.ts`: workflow entrypoint and pipeline steps
- `wrangler.jsonc`: workflow binding, R2 binding, runtime vars

The app starts workflow instances via Cloudflare's Workflows REST API.

Pipeline steps:

1. Signal `audio_generation_started` callback to the app.
2. Ask the container service to synchronously generate episode + segment audio.
3. Signal `audio_generation_completed` callback with generated audio keys.
4. Transcribe/format transcript via Workers AI.
5. Signal `transcript_generation_completed`.
6. Generate title/description/keywords via Workers AI.
7. Signal `metadata_generation_completed` (or `draft_processing_failed`).

## Runtime environment variables

Set these on the Cloudflare Worker:

- `CALL_KENT_AUDIO_CONTAINER_URL` (plain var)
  - Purpose: base URL for the container service
    (`POST /jobs/episode-audio-sync`).
  - Where to set: `wrangler.jsonc` `vars` (or Cloudflare Worker dashboard vars).
- `CALL_KENT_AUDIO_CONTAINER_TOKEN` (secret)
  - Purpose: bearer token for workflow -> container auth.
  - Generate: `openssl rand -hex 32`
  - Where to set: Cloudflare Worker secret
    (`wrangler secret put CALL_KENT_AUDIO_CONTAINER_TOKEN`).
- `CALL_KENT_AUDIO_CALLBACK_URL` (plain var)
  - Purpose: callback endpoint on the app (for started/completed/failed events).
  - Where to set: `wrangler.jsonc` `vars` (or Cloudflare Worker dashboard vars).
- `CALL_KENT_AUDIO_CALLBACK_SECRET` (secret)
  - Purpose: HMAC secret used to sign callbacks; app verifies this.
  - Generate: `openssl rand -hex 32`
  - Must match app `CALL_KENT_AUDIO_PROCESSOR_CALLBACK_SECRET`.
  - Where to set: Cloudflare Worker secret
    (`wrangler secret put CALL_KENT_AUDIO_CALLBACK_SECRET`).
- `CLOUDFLARE_API_TOKEN` (secret)
  - Purpose: bearer token for Workers AI gateway requests.
  - Where to set: Cloudflare Worker secret
    (`wrangler secret put CLOUDFLARE_API_TOKEN`).
- `CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN` (secret)
  - Purpose: `cf-aig-authorization` token for Workers AI gateway.
  - Where to set: Cloudflare Worker secret
    (`wrangler secret put CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN`).
- `CLOUDFLARE_AI_GATEWAY_ID` (plain var)
  - Purpose: AI Gateway id for transcription/format/metadata generation calls.
  - Where to set: `wrangler.jsonc` `vars`.
- `CLOUDFLARE_AI_TRANSCRIPTION_MODEL` (plain var)
  - Purpose: transcription model id used by Workers AI.
  - Where to set: `wrangler.jsonc` `vars`.
- `CLOUDFLARE_AI_CALL_KENT_TRANSCRIPT_FORMAT_MODEL` (plain var)
  - Purpose: transcript formatting model id used by Workers AI.
  - Where to set: `wrangler.jsonc` `vars`.
- `CLOUDFLARE_AI_CALL_KENT_METADATA_MODEL` (plain var)
  - Purpose: metadata generation model id used by Workers AI.
  - Where to set: `wrangler.jsonc` `vars`.
