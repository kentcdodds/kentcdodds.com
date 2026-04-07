# Project context

This is Kent C. Dodds' personal website (kentcdodds.com) — a React Router v7 app
with Express, SQLite (via Prisma), and extensive MSW mocks for all external
APIs.

## Prerequisites

- Node.js 24 is required (`engines` in `package.json`).
  - Install via `nvm install 24 && nvm alias default 24`.

## Key commands

Standard dev commands are documented in `README.md` and `CONTRIBUTING.md`. Quick
reference:

| Task            | Command                                                                           |
| --------------- | --------------------------------------------------------------------------------- |
| Dev server      | `npm run dev` (starts on port 3000 with `MOCKS=true`)                             |
| Format (staged) | `npm run format:staged`                                                           |
| Lint            | `npm run lint`                                                                    |
| Lint (all)      | `npm run lint:all`                                                                |
| Typecheck       | `npm run typecheck`                                                               |
| Typecheck (all) | `npm run typecheck:all`                                                           |
| Build (all)     | `npm run build:all`                                                               |
| Unit tests      | `npm run test` (runs backend + browser-mode tests)                                |
| Tests (all)     | `npm run test:all`                                                                |
| Pre-commit gate | `npm run precommit:verify`                                                        |
| Pre-push gate   | `npm run prepush:verify`                                                          |
| Backend tests   | `npm run test:backend`                                                            |
| Browser tests   | `npm run test:browser` (requires Playwright browsers: `npm run test:e2e:install`) |
| E2E tests       | `npm run test:e2e:dev` (requires Playwright browsers: `npm run test:e2e:install`) |
| DB reset + seed | `npm exec --workspace kentcdodds.com prisma migrate reset --force`                |

## Non-obvious caveats

- All external APIs are mocked via MSW when `MOCKS=true` (the default in dev).
  No real API keys are needed for local development; `services/site/.env.example`
  values are sufficient.
- This repo uses npm workspaces. Install dependencies from the repository root,
  and run worker/package scripts with `npm run <script> --workspace <name>`.
- `npm install` runs `prepare`, which installs Husky hooks. Pre-commit formats
  staged files with `lint-staged` and then runs workspace lint, typecheck, and
  build checks. Pre-push runs workspace tests.
- CI workflows that install a single workspace use `npm ci --include-workspace-root`
  so the root Husky dependency is still available during `prepare`.
- Cloudflare worker deploy workflows should use the workspace-installed
  Wrangler CLI (`npm exec wrangler -- ...`) instead of relying on
  `cloudflare/wrangler-action` or a runner-preinstalled Wrangler release, so CI
  deploys stay aligned with the repo lockfile.
- The main site lives in `services/site`. Root `npm run dev`, `npm run build`,
  `npm run test`, and similar commands forward to that workspace.
- Search worker relevance thresholds (`M`, `R`, `noCloseMatches`): see
  [`search-relevance.md`](./search-relevance.md).
- Playwright already launches Chromium with fake media permissions/device input
  plus `tests/sample.wav`. If an e2e needs recorded audio, drive the real
  recorder UI and keep the fake-audio setup in Playwright/helpers rather than
  adding app runtime shortcuts.
- SQLite is file-based: the database file lives at `services/site/prisma/sqlite.db`. No
  external database server is required.
- If Playwright E2E tests fail with Prisma "table does not exist" errors, run
  the DB reset + seed command from the table above to apply migrations and seed
  data.
- Production Prisma schema changes must follow widen-then-narrow rollouts:
  deploy backward-compatible "widen" changes first, then ship narrowing
  constraints/removals in a follow-up deploy.
- When shipping a widen migration, create a linked follow-up issue for the
  narrow step before merging so the cleanup pass does not get forgotten.
- Cache database: a separate SQLite cache DB is created at `services/site/other/cache.db`.
  It's populated on first request or via `npm run prime-cache:mocks`.
- Search now runs through a dedicated Cloudflare Worker workspace at
  `services/search-worker`. Production/staging site envs must set
  `SEARCH_WORKER_URL` and `SEARCH_WORKER_TOKEN`.
- Search Worker URL: if `SEARCH_WORKER_URL` contains `mock`, MSW returns fixtures;
  otherwise MSW passthrough sends traffic to that URL (e.g. local `wrangler dev`
  on `http://127.0.0.1:8787`). Tests expect a mock URL (see `.env.example`).
- Content is filesystem-based: blog posts are MDX files in `services/site/content/blog/`.
  Changes to content files are auto-detected by the dev server's file watcher.
- `npm run dev` should not wrap `services/site/index.ts` in an outer `node --watch`. React
  Router dev rewrites `.react-router/types` on startup, which can trigger an
  infinite restart loop in headless/CI environments.
- Playwright/Prisma caveat: `services/site/playwright.config.ts` sets
  `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` so e2e runs can reset the local
  SQLite DB without tripping Cursor's destructive-action guard. This is only for
  Playwright's dev/test DB reset path, not a general exemption for Prisma
  commands.
- Oxlint config caveat: prefer package-export extends
  (`"@epic-web/config/oxlint"`) in `.oxlintrc.json`. In this repo, path-based
  extends into `node_modules` can fail to inherit the shared env/rules.
- Semantic search caveat: YouTube auto-captions can include cue-only chunks like
  `[Music]`. The YouTube indexer filters these low-signal caption lines and
  merges tiny trailing transcript chunks at ingest time, but old vectors can
  still linger until the next YouTube reindex.
- Call Kent FFmpeg offload caveat: episode audio generation runs through a
  Cloudflare queue/worker/sandbox pipeline. Local site development still uses
  the MSW Cloudflare mock end-to-end, but running the real worker sandbox
  locally requires Docker plus real R2-accessible inputs because the site's MSW
  R2 mock does not extend into sandbox containers. The sandbox image expects
  `services/call-kent-audio-worker/assets/{intro,interstitial,outro}.mp3`.

## Seed data

The seed script (`services/site/prisma/seed.ts`) creates an admin user:
`me@kentcdodds.com` / `iliketwix` (role ADMIN, Blue Team).

After `prisma migrate reset --force`, verify the seed ran (look for `created`
output). If it didn't, run `node prisma/seed.ts` from `services/site/`.

## Cloud / headless manual testing

- The Cursor Cloud VM snapshot ships with Node 24 via nvm, Chrome configured to
  open `localhost:3000` on startup and new tabs, and the browser pre-logged-in
  as the seed admin user (`me@kentcdodds.com` / `iliketwix`).
- The first request after starting the dev server compiles all MDX blog posts
  and can take ~30 s; subsequent loads are fast.
- In cloud VMs, Chrome may block camera/microphone access by default. Visiting
  `/calls/record/new` can hit the route ErrorBoundary unless `localhost` is
  allowed mic/camera access in site settings (even if you intend to use the
  typed question → text-to-speech path).
