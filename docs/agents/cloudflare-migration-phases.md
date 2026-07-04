# Cloudflare migration phases

## Migration status

| Phase | Status |
| ----- | ------ |
| Phase 1 — Worker-shaped app on Fly | ✅ Complete (historical) |
| Phase 2 — Staging Worker | ✅ Complete on `cursor/cloudflare-site-worker-2309` — see [cloudflare-worker-architecture.md](./cloudflare-worker-architecture.md) |
| Phase 3 — Production cutover | ✅ Worker deploy on merge to `main`; DNS cutover to `kentcdodds.com` is manual |

This documents the move of `services/site` production traffic from Fly.io to
Cloudflare Workers. **Local dev, backend tests, and Playwright e2e still use the
Node/Express server** (`npm run dev`, `start:mocks` with `NODE_ENV=production`).

Open PR [#704](https://github.com/kentcdodds/kentcdodds.com/pull/704) is useful
as a historical spike only. Treat it as prior exploration of possible Cloudflare
changes, not as a production-ready migration plan or an implementation source to
merge wholesale.

## Phase 1: Worker-shaped app on Fly (historical)

Goal: make the site more Worker-compatible while still running on Fly.

- Completed before the Cloudflare worker path; Fly production is decommissioned
  when PR #813 merges.

## Phase 2: Staging Worker

Goal: run a non-production Cloudflare Worker staging environment that mirrors the
site shape without taking production traffic.

- Deploy a staging Worker with non-production bindings.
- Compare staging Worker behavior against production expectations for auth,
  content, Call Kent, search, cache, and admin paths.

Exit criteria: met on the migration branch (see architecture doc).

## Phase 3: Production cutover (this PR)

Goal: production deploys only to Cloudflare Workers; Fly deploy pipeline removed.

- Production worker `kentcdodds-com` with D1 `kentcdodds-com-db`, production KV/R2.
- `main` deploy pipeline: build → MDX artifacts → worker deploy → secrets →
  artifact publish → D1 migrations → smoke checks.
- Content-only pushes: compile artifacts → publish → `POST /action/refresh-cache`.
- **DNS:** attach `kentcdodds.com` to the worker manually at cutover (not in
  wrangler config until then).
- **Data:** production user data arrives via the migration script (separate from
  this PR); anonymous pages must work with an empty D1.

Exit criteria:

- Production traffic served by `kentcdodds-com` worker (workers.dev immediately;
  custom domain after DNS).
- D1 is the production system of record.
- Fly deploy artifacts and pipeline removed.
