# Call Kent ffmpeg container runbook

This runbook covers the ffmpeg container endpoint used by Call Kent draft
processing in queue-consumer environments.

## Endpoint contract

- Method: `POST`
- Path: `/episode-audio`
- Content type: `multipart/form-data`
- Required file fields:
  - `callAudio`
  - `responseAudio`

Successful response JSON:

```json
{
	"callerMp3Base64": "<base64>",
	"responseMp3Base64": "<base64>",
	"episodeMp3Base64": "<base64>"
}
```

Health endpoint:

- `GET /health` → `{ "ok": true, "service": "call-kent-ffmpeg-container" }`

## Local development paths

### Fast mock path (recommended default)

Use:

```sh
bun run dev:calls-e2e
```

This starts:

- Worker runtime with queue producer/consumer bindings
- all integration mock workers
- Call Kent ffmpeg **mock container** endpoint at `http://localhost:8804`

### Queue + real local container path

Use:

```sh
bun run dev:calls-e2e:real-container
```

This starts the queue-enabled Worker stack plus the local Node ffmpeg container
service (`http://localhost:8810`) and points
`CALL_KENT_FFMPEG_BINDING_BASE_URL` at that service for the local Node binding
adapter.

### Local real ffmpeg path

Run container-compatible service directly:

```sh
bun run dev:call-kent-ffmpeg-container
```

This starts the service at `http://localhost:8810`.

To use it with Worker runtime, set:

```sh
CALL_KENT_FFMPEG_BINDING_BASE_URL=http://localhost:8810
```

before starting the Worker runtime stack.

## Image build

Build local image:

```sh
bun run container:build:call-kent-ffmpeg
```

The Docker build uses:

- `containers/call-kent-ffmpeg/dockerfile`
- Node 24 base image
- system ffmpeg package

## Preview/production wiring

- Worker binding name:
  - `CALL_KENT_FFMPEG` (service binding)
- Preview generated config rewrites this binding to:
  - `<preview-worker-name>-mock-call-kent-ffmpeg`
- Production config keeps:
  - `kentcdodds-com-call-kent-ffmpeg`
- No ffmpeg base-URL secret is required for preview/deploy workflows.

## Current limitations

- Response payloads are base64 JSON for simplicity; this is acceptable because
  conversion is performed in background/container path, not browser request path.
- The local mock container endpoint is deterministic and does not execute real
  ffmpeg transforms.
- Queue consumer retry/backoff/DLQ behavior still relies on queue configuration
  in Cloudflare control plane.
