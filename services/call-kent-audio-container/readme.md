This service runs FFmpeg for Call Kent episode audio generation.

Endpoints:

- `POST /jobs/episode-audio`: authenticated by bearer token, async job +
  callbacks
- `POST /jobs/episode-audio-sync`: authenticated by bearer token, waits for
  ffmpeg/upload completion and returns generated audio keys

Behavior:

1. Downloads caller and response audio from R2.
2. Runs FFmpeg normalization + stitch with intro/interstitial/outro bumpers.
3. Uploads episode + segment audio to R2.
4. Calls app callback endpoint with HMAC-signed status events.
5. Sends heartbeat pings to the container controller while a job is running and
   requests shutdown once the last active job completes.

Stitch assets are required; startup requests fail if these files are missing.
The container expects these files in `assets/`:

- `assets/intro.mp3`
- `assets/interstitial.mp3`
- `assets/outro.mp3`
