# Mock API servers

This repo is incrementally migrating from MSW-only mocks to Worker-based mock
API servers (epicflare-style).

## Current worker-based mocks

- `mock-servers/kit/worker.ts`
  - local dev URL: `http://127.0.0.1:8790`
  - dashboard: `GET /__mocks`
  - metadata: `GET /__mocks/meta`
  - reset state: `POST /__mocks/reset`

## Local development wiring

- `bun run dev` now starts:
  - app server (`dev:app`)
  - kit mock worker (`dev:mock-kit`)
- `KIT_API_BASE_URL` is set to the local kit mock worker URL in this mode.

MSW remains active for integrations that have not yet been migrated to Worker
mock servers.
