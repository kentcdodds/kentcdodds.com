# Mock API servers

This repo is incrementally migrating from MSW-only mocks to Worker-based mock
API servers (epicflare-style).

## Current worker-based mocks

- `mock-servers/kit/worker.ts`
  - local dev URL: `http://127.0.0.1:8790`
  - dashboard: `GET /__mocks`
  - metadata: `GET /__mocks/meta`
  - reset state: `POST /__mocks/reset`
- `mock-servers/verifier/worker.ts`
  - local dev URL: `http://127.0.0.1:8791`
  - dashboard: `GET /__mocks`
  - metadata: `GET /__mocks/meta`
  - reset state: `POST /__mocks/reset`
- `mock-servers/oauth/worker.ts`
  - local dev URL: `http://127.0.0.1:8792`
  - dashboard: `GET /__mocks`
  - metadata: `GET /__mocks/meta`
  - reset state: `POST /__mocks/reset`
- `mock-servers/mailgun/worker.ts`
  - local dev URL: `http://127.0.0.1:8793`
  - dashboard: `GET /__mocks`
  - metadata: `GET /__mocks/meta`
  - reset state: `POST /__mocks/reset`
  - captured messages: `GET /__mocks/emails`
- `mock-servers/discord/worker.ts`
  - local dev URL: `http://127.0.0.1:8794`
  - dashboard: `GET /__mocks`
  - metadata: `GET /__mocks/meta`
  - reset state: `POST /__mocks/reset`
- `mock-servers/simplecast/worker.ts`
  - local dev URL: `http://127.0.0.1:8795`
  - dashboard: `GET /__mocks`
  - metadata: `GET /__mocks/meta`
  - reset state: `POST /__mocks/reset`
- `mock-servers/transistor/worker.ts`
  - local dev URL: `http://127.0.0.1:8796`
  - dashboard: `GET /__mocks`
  - metadata: `GET /__mocks/meta`
  - reset state: `POST /__mocks/reset`
- `mock-servers/twitter/worker.ts`
  - local dev URL: `http://127.0.0.1:8797`
  - dashboard: `GET /__mocks`
  - metadata: `GET /__mocks/meta`
  - reset state: `POST /__mocks/reset`
- `mock-servers/security/worker.ts`
  - local dev URL: `http://127.0.0.1:8798`
  - dashboard: `GET /__mocks`
  - metadata: `GET /__mocks/meta`
  - reset state: `POST /__mocks/reset`
- `mock-servers/oembed/worker.ts`
  - local dev URL: `http://127.0.0.1:8799`
  - dashboard: `GET /__mocks`
  - metadata: `GET /__mocks/meta`
  - reset state: `POST /__mocks/reset`
- `mock-servers/mermaid-to-svg/worker.ts`
  - local dev URL: `http://127.0.0.1:8800`
  - dashboard: `GET /__mocks`
  - metadata: `GET /__mocks/meta`
  - reset state: `POST /__mocks/reset`

## Local development wiring

- `bun run dev` now starts:
  - app server (`dev:app`)
  - kit mock worker (`dev:mock-kit`)
  - verifier mock worker (`dev:mock-verifier`)
  - oauth mock worker (`dev:mock-oauth`)
  - mailgun mock worker (`dev:mock-mailgun`)
  - discord mock worker (`dev:mock-discord`)
  - simplecast mock worker (`dev:mock-simplecast`)
  - transistor mock worker (`dev:mock-transistor`)
  - twitter mock worker (`dev:mock-twitter`)
  - security mock worker (`dev:mock-security`)
  - oembed mock worker (`dev:mock-oembed`)
  - mermaid-to-svg mock worker (`dev:mock-mermaid-to-svg`)
- `KIT_API_BASE_URL` and `VERIFIER_API_BASE_URL` are set to local mock worker
  URLs in this mode. `OAUTH_PROVIDER_BASE_URL` is also pointed at the local
  oauth mock worker. `MAILGUN_API_BASE_URL` is pointed at the local mailgun
  mock worker. `DISCORD_API_BASE_URL` is pointed at the local discord mock
  worker. `SIMPLECAST_API_BASE_URL` is pointed at the local simplecast mock
  worker. `TRANSISTOR_API_BASE_URL` is pointed at the local transistor mock
  worker. `TWITTER_SYNDICATION_BASE_URL`, `TWITTER_SHORTENER_BASE_URL`, and
  `TWITTER_OEMBED_BASE_URL` are pointed at the local twitter mock worker.
  `PWNED_PASSWORDS_API_BASE_URL` and `GRAVATAR_BASE_URL` are pointed at the
  local security mock worker. `OEMBED_API_BASE_URL` is pointed at the local
  oembed mock worker. `MERMAID_TO_SVG_BASE_URL` is pointed at the local
  mermaid-to-svg mock worker.

MSW remains active for integrations that have not yet been migrated to Worker
mock servers.
