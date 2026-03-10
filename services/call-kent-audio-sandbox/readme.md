This service runs FFmpeg for Call Kent episode audio generation on Cloudflare
Sandboxes.

Architecture:

- `src/sandbox-worker.ts` is the public Worker endpoint (`POST /jobs/episode-audio`).
- For each draft job, it starts a one-shot sandbox process (`node src/index.ts`)
  in an isolated sandbox id (`call-kent-audio-<draftId>`).
- `src/index.ts` processes a single job from
  `CALL_KENT_AUDIO_JOB_REQUEST_BODY` and exits.

This design intentionally avoids custom heartbeat/shutdown control flows and
lets sandbox lifecycle be process-driven.

Behavior per job:

1. Downloads caller and response audio from R2.
2. Runs FFmpeg normalization + stitch with intro/interstitial/outro bumpers.
3. Uploads episode + segment audio to R2.
4. Calls app callback endpoint with HMAC-signed status events.

Stitch assets are required; job startup fails if these files are missing.
The sandbox job expects these files in `assets/`:

- `assets/intro.mp3`
- `assets/interstitial.mp3`
- `assets/outro.mp3`
