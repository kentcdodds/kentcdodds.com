This Worker consumes Cloudflare Queue messages for Call Kent FFmpeg jobs and
dispatches them to the sandbox-backed audio service.

Key files:

- `src/index.ts`: queue consumer entrypoint
- `wrangler.jsonc`: queue binding + retry settings (3 concurrent batch size)

The app enqueues messages via Cloudflare's Queue REST API.

## Runtime environment variables

Set these on the Cloudflare Worker:

- `CALL_KENT_AUDIO_CONTAINER_URL` (plain var)
  - Purpose: base URL for the container service (`POST /jobs/episode-audio`).
  - Where to set: `wrangler.jsonc` `vars` (or Cloudflare Worker dashboard vars).
- `CALL_KENT_AUDIO_CONTAINER_TOKEN` (secret)
  - Purpose: bearer token for worker -> container auth.
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
