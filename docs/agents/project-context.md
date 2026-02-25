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
| Lint            | `npm run lint`                                                                    |
| Typecheck       | `npm run typecheck`                                                               |
| Unit tests      | `npm run test` (runs backend + browser-mode tests)                                |
| Backend tests   | `npm run test:backend`                                                            |
| Browser tests   | `npm run test:browser` (requires Playwright browsers: `npm run test:e2e:install`) |
| E2E tests       | `npm run test:e2e:dev` (requires Playwright browsers: `npm run test:e2e:install`) |
| DB reset + seed | `npx prisma@7 migrate reset --force` then `npm run runfile -- prisma/seed.ts`     |

## Non-obvious caveats

- All external APIs are mocked via MSW when `MOCKS=true` (the default in dev).
  No real API keys are needed for local development; `.env.example` values are
  sufficient.
- SQLite is file-based: the database file lives at `prisma/sqlite.db`. No
  external database server is required.
- If Playwright E2E tests fail with Prisma "table does not exist" errors, run
  the DB reset + seed command from the table above to apply migrations and seed
  data.
- Cache database: a separate SQLite cache DB is created at `other/cache.db`.
  It's populated on first request or via `npm run prime-cache:mocks`.
- Content is filesystem-based: blog posts are MDX files in `content/blog/`.
  Changes to content files are auto-detected by the dev server's file watcher.
- Semantic search caveat: YouTube auto-captions can include cue-only chunks like
  `[Music]`. The YouTube indexer filters these low-signal caption lines at
  ingest time, but old vectors can still linger until the next YouTube reindex.

## Cloud / headless manual testing

- In cloud VMs, Chrome may block camera/microphone access by default. Visiting
  `/calls/record/new` can hit the route ErrorBoundary unless `localhost` is
  allowed mic/camera access in site settings (even if you intend to use the
  typed question → text-to-speech path).
