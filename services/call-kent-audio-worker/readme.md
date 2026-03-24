This Worker consumes Cloudflare Queue messages for Call Kent FFmpeg jobs,
executes the stitch command inside a Cloudflare Sandbox, and reports the result
back to the app via signed callbacks.

Key files:

- `src/index.ts`: queue consumer entrypoint + Sandbox export
- `src/call-kent-audio-r2.ts`: creates signed R2 download/upload URLs
- `src/call-kent-audio-sandbox.ts`: runs the sandbox CLI via `exec()`
- `sandbox/call-kent-audio-cli.sh`: minimal FFmpeg stitch/upload CLI
- `sandbox.dockerfile`: Sandbox image definition

The app enqueues messages via Cloudflare's Queue REST API.

## Runtime environment variables

Set these on the Cloudflare Worker:

- `CALL_KENT_AUDIO_CALLBACK_URL` (plain var)
  - Purpose: callback endpoint on the app (for started/completed/failed events).
  - Where to set: `wrangler.jsonc` `vars` (or Cloudflare Worker dashboard vars).
- `CALL_KENT_AUDIO_CALLBACK_SECRET` (secret)
  - Purpose: HMAC secret used to sign callbacks; app verifies this.
  - Generate: `openssl rand -hex 32`
  - Must match app `CALL_KENT_AUDIO_PROCESSOR_CALLBACK_SECRET`.
  - Where to set: Cloudflare Worker secret
    (`wrangler secret put CALL_KENT_AUDIO_CALLBACK_SECRET`).
- `R2_ENDPOINT` (plain var)
  - Purpose: S3-compatible R2 endpoint used for presigned URLs.
  - Where to set: `wrangler.jsonc` `vars` (or Cloudflare Worker dashboard vars).
- `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` (secrets)
  - Purpose: credentials used to presign sandbox download/upload URLs.
  - Where to set: Cloudflare Worker secrets.
- `CALL_KENT_R2_BUCKET` (plain var)
  - Purpose: bucket holding raw call audio and stitched draft episode outputs.
  - Where to set: `wrangler.jsonc` `vars` (or Cloudflare Worker dashboard vars).

## Assets

The sandbox image expects these files in `assets/`:

- `assets/intro.mp3`
- `assets/interstitial.mp3`
- `assets/outro.mp3`

## Sandbox image requirements

- The Docker image must extend `docker.io/cloudflare/sandbox:<version>` (or copy
  the `/sandbox` binary from that image) so the SDK can create exec sessions.
- Keep the Docker image version in sync with the installed
  `@cloudflare/sandbox` package version.
- Do not replace the base image `ENTRYPOINT` with a custom HTTP server. If you
  need startup behavior, add a `CMD` instead and let the base image keep serving
  the sandbox control API.

## Sandbox image publishing

The sandbox image is built and pushed to Docker Hub by GitHub Actions whenever
files under `services/call-kent-audio-worker/` change on `main`. The workflow
publishes `docker.io/kentcdodds/kcd-call-kent-audio-sandbox:latest` and a
short-SHA tag. `wrangler deploy` now pulls the pre-built image from Docker Hub
instead of building it locally.

To deploy a new sandbox image version, push the sandbox changes, wait for the
GitHub Actions workflow to publish the image, then re-deploy the worker so the
new image tag is pulled.

Site development/tests still use the MSW Cloudflare mock instead of the real
worker+sandbox path, and the sandbox CLI tests generate temporary fixture
assets at runtime.
