# Project context

This is Kent C. Dodds' personal website (kentcdodds.com) — a React Router v7 app
with Express, SQLite (via Prisma), and extensive MSW mocks for all external
APIs.

## Prerequisites

- Bun 1.3.9+ is required (`packageManager` in `package.json`).
  - Install via `curl -fsSL https://bun.sh/install | bash`.
- Node.js 24 is still required for some tooling/runtime scripts.
  - Install via `nvm install 24 && nvm alias default 24`.

## Key commands

Standard dev commands are documented in `README.md` and `CONTRIBUTING.md`. Quick
reference:

| Task            | Command                                                                           |
| --------------- | --------------------------------------------------------------------------------- |
| Dev server      | `bun run dev` (starts app + kit mock worker; app runs on port 3000)               |
| Lint            | `bun run lint`                                                                    |
| Typecheck       | `bun run typecheck`                                                               |
| Unit tests      | `bun run test` (runs backend + browser-mode tests)                                |
| Backend tests   | `bun run test:backend`                                                            |
| Browser tests   | `bun run test:browser` (requires Playwright browsers: `bun run test:e2e:install`) |
| E2E tests       | `bun run test:e2e:dev` (requires Playwright browsers: `bun run test:e2e:install`) |
| DB reset + seed | `bunx prisma@7 migrate reset --force` then `bun run runfile -- prisma/seed.ts`     |

## Non-obvious caveats

- All external APIs are mocked via MSW when `MOCKS=true` (the default in dev).
- The Kit integration is now served by a Worker mock server in dev
  (`mock-servers/kit/worker.ts`, local port `8790`). Other third-party
  integrations still use MSW while migration is in progress.
- The email verifier integration is served by a Worker mock server in dev
  (`mock-servers/verifier/worker.ts`, local port `8791`).
- No real API keys are needed for local development; `.env.example` values are
  sufficient.
- SQLite is file-based: the database file lives at `prisma/sqlite.db`. No
  external database server is required.
- If Playwright E2E tests fail with Prisma "table does not exist" errors, run
  the DB reset + seed command from the table above to apply migrations and seed
  data.
- Shared cache backend:
  - Worker runtime uses the `SITE_CACHE_KV` binding when configured.
  - If `SITE_CACHE_KV` is not bound (including most local Node workflows), the
    app falls back to the SQLite cache file at `other/cache.db`.
  - Add `SITE_CACHE_KV` in Wrangler env config per environment before relying on
    KV-backed shared cache behavior.
- Content is filesystem-based: blog posts are MDX files in `content/blog/`.
  Changes to content files are auto-detected by the dev server's file watcher.

## Cloud / headless manual testing

- In cloud VMs, Chrome may block camera/microphone access by default. Visiting
  `/calls/record/new` can hit the route ErrorBoundary unless `localhost` is
  allowed mic/camera access in site settings (even if you intend to use the
  typed question → text-to-speech path).

## Related operational docs

- Cloudflare-managed controls (rate limiting, cron cleanup, KV cache binding):
  `docs/agents/cloudflare-managed-controls.md`
