# Project context

This is Kent C. Dodds' personal website (kentcdodds.com) — a React Router v7 app
running on Cloudflare Workers in production, with a workerd-native local dev
stack (`@cloudflare/vite-plugin` + Miniflare D1/KV). SQL migrations live in
`services/site/migrations/`; runtime DB access uses `@remix-run/data-table`.

## Prerequisites

- Node.js 26 is required (`engines` in `package.json`).
  - Install via `nvm install 26 && nvm alias default 26`.

## Key commands

Standard dev commands are documented in `README.md` and `CONTRIBUTING.md`. Quick
reference:

| Task            | Command                                                                           |
| --------------- | --------------------------------------------------------------------------------- |
| Dev server      | `npm run dev` (workerd + Vite HMR on port 3000; `MOCKS=true` by default)          |
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
| DB reset + seed | `npm run db:reset --workspace kentcdodds.com` (local Miniflare D1)                |

## Non-obvious caveats

- All external APIs are mocked when `MOCKS=true` (the default in dev). The dev
  worker wraps outbound `fetch` with the same mock routes as production's
  `OutboundProxy` (no MSW in workerd). Transactional emails (Cloudflare Email
  Sending) are captured to `services/site/mocks/msw.local.json` via the MDX
  dev-watcher sidecar (`POST /__dev/capture-email` on port 3099) and logged to
  the dev worker console. No real API keys are needed for local development;
  `services/site/.env.example` values are sufficient.
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
- SQLite is file-based for **unit tests** (`services/site/.data/sqlite.db` via
  `DATABASE_URL`). **Local dev and Playwright e2e** use Miniflare's persistent
  local D1 (`services/site/.wrangler/state/v3/d1/...`). Migrations, seed, the
  Vite plugin, and e2e helpers share the path from
  `services/site/scripts/local-d1-state.mjs` (`--persist-to` / `persistState`).
- **Production** runs on Cloudflare Worker `kentcdodds-com` (D1 + KV + R2).
  Local dev and e2e use workerd via `@cloudflare/vite-plugin`. Architecture,
  deploy, D1 migrations, and sharp edges:
  [`cloudflare-worker-architecture.md`](./cloudflare-worker-architecture.md).
  MDX artifact compiler (`npm run mdx:compile --workspace kentcdodds.com`)
  requires the app server module graph to stay importable by plain Node (no
  `.tsx` in the chain). Production workerd forbids module-scope I/O/timers/random
  (keep module init lazy — `wrangler dev` is lenient and won't catch this).
- If Playwright E2E tests fail with D1 "table does not exist" errors, run
  `npm run db:reset --workspace kentcdodds.com` to apply migrations and seed
  data against the local Miniflare D1 database.
- Production schema changes must follow widen-then-narrow rollouts:
  deploy backward-compatible "widen" changes first, then ship narrowing
  constraints/removals in a follow-up deploy. Apply D1 migrations with
  `npm run d1:migrations:apply:production --workspace site-worker` (remote).
- When shipping a widen migration, create a linked follow-up issue for the
  narrow step before merging so the cleanup pass does not get forgotten.
- Cache uses `SITE_CACHE_KV` in dev (Miniflare) and `CACHE_RPC` in production.
- Search runs through `services/search-worker`. Production site envs must set
  `SEARCH_WORKER_URL` and `SEARCH_WORKER_TOKEN`.
- Search Worker URL: if `SEARCH_WORKER_URL` contains `mock`, MSW returns fixtures;
  otherwise MSW passthrough sends traffic to that URL (e.g. local `wrangler dev`
  on `http://127.0.0.1:8787`). Tests expect a mock URL (see `.env.example`).
- Content is filesystem-based: blog posts are MDX files in `services/site/content/blog/`.
  The MDX dev-watcher sidecar (`other/mdx-artifacts/dev-watcher.ts`) compiles
  content to `node_modules/.cache/mdx-dev/` and triggers Vite full-reload on change.
- `npm run dev` runs concurrently: MDX dev-watcher sidecar + `react-router dev`
  (Vite + `@cloudflare/vite-plugin`). Do not wrap in an outer `node --watch`.
  React Router dev rewrites `.react-router/types` on startup, which can trigger
  an infinite restart loop in headless/CI environments.
- Playwright caveat: `services/site/playwright.config.ts` runs `npm run db:reset`
  before e2e in CI so tests start from a migrated + seeded local D1 database.
- Oxlint config caveat: prefer package-export extends
  (`"@epic-web/config/oxlint"`) in `.oxlintrc.json`. In this repo, path-based
  extends into `node_modules` can fail to inherit the shared env/rules.
- Semantic search caveat: the JSX-page indexer
  (`other/semantic-search/jsx-page-content.ts`) boots `npm run dev` and waits for
  `/sitemap.xml`. Vite binds to `localhost`, which resolves to IPv6 (`::1`) or
  IPv4 (`127.0.0.1`) depending on the runner, so the readiness probe checks both
  loopback families (`resolveReachableSitemapOrigin`) and uses whichever the dev
  server actually bound to. Probing a single hard-coded address caused CI
  "Timed out waiting for local dev server" failures even though the server was up.
- Semantic search caveat: YouTube auto-captions can include cue-only chunks like
  `[Music]`. The YouTube indexer filters these low-signal caption lines and
  merges tiny trailing transcript chunks at ingest time, but old vectors can
  still linger until the next YouTube reindex.
- Call Kent FFmpeg offload caveat: episode audio generation runs through a
  Cloudflare queue/worker/sandbox pipeline. Local site development uses the dev
  worker's outbound fetch mocks end-to-end, but running the real worker sandbox
  locally requires Docker plus real R2-accessible inputs. The sandbox image
  expects `services/call-kent-audio-worker/assets/{intro,interstitial,outro}.mp3`.

## Seed data

The seed script (`services/site/scripts/seed-local-d1.mjs`) creates an admin
user against the local Miniflare D1 database: `me@kentcdodds.com` / `iliketwix`
(role ADMIN, Blue Team).

After `npm run db:reset --workspace kentcdodds.com`, verify the seed ran.
Unit tests apply committed SQL migrations via `app/utils/db/test-helpers.server.ts`.

## Cloud / headless manual testing

- The Cursor Cloud VM snapshot's default nvm Node is older than the required
  Node 26 (it has shipped Node 22/24 in different snapshots), so run
  `nvm install 26 && nvm use 26` before installing dependencies or testing. The
  startup update script already selects Node 26 via nvm, but interactive shells
  do not inherit that, so switch again in your shell.
  If the shell still resolves `/exec-daemon/node`, prepend nvm after switching:
  `export PATH="$NVM_BIN:$PATH"`.
  Chrome is configured to
  open `localhost:3000` on startup and new tabs, and the browser pre-logged-in
  as the seed admin user (`me@kentcdodds.com` / `iliketwix`).
- If `node --version` still reports an older version after `nvm use 26`, the
  `/exec-daemon/node` shim is ahead of nvm on `PATH`; prefix commands with
  `PATH="$(dirname "$(nvm which 26)"):$PATH"` when testing.
- The first request after starting the dev server may compile all MDX blog posts
  via the sidecar watcher and can take ~30 s; subsequent loads are fast.
- Playwright browsers (needed for `npm run test:browser` and `test:e2e:*`) are
  pre-installed in the VM snapshot under `~/.cache/ms-playwright`, so you should
  not normally need to reinstall them. On Node 26, `npm run test:e2e:install`
  (i.e. `npx playwright install`) hangs during archive extraction (the download
  reaches 100% but never finishes unpacking). If a browser is missing or its
  revision changed, install it manually instead: `curl` the build zips from
  `https://cdn.playwright.dev/builds/...` and unzip them into the matching
  `~/.cache/ms-playwright/<name>-<revision>/` directory, then `touch` an
  `INSTALLATION_COMPLETE` marker in each so Playwright treats them as installed.
  Both `chrome-linux64` (chromium) and `chrome-headless-shell-linux64`
  (chromium-headless-shell) come from the `builds/cft/<version>/linux64/` path;
  ffmpeg comes from `builds/ffmpeg/<rev>/ffmpeg-linux.zip`.
- Run the Playwright e2e suite with `npm run test:e2e:run` (CI mode, its own
  server on port 8811). It fails to start if a dev server is already bound to
  port 3000/3099 (the MDX sidecar), so stop `npm run dev` first, or set
  `PW_REUSE_EXISTING_SERVER=true` to reuse a running dev server.
- In cloud VMs, Chrome may block camera/microphone access by default. Visiting
  `/calls/record/new` can hit the route ErrorBoundary unless `localhost` is
  allowed mic/camera access in site settings (even if you intend to use the
  typed question → text-to-speech path).
