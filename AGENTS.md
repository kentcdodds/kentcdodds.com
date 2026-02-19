# AGENTS.md

## Cloud-specific instructions

### Overview

This is Kent C. Dodds' personal website (kentcdodds.com) — a React Router v7 app with Express, SQLite (via Prisma), and extensive MSW mocks for all external APIs.

### Prerequisites

- **Node.js 24** is required (`engines` field in `package.json`). Install via `nvm install 24 && nvm alias default 24`.
- The `.npmrc` sets `legacy-peer-deps=true`; `npm install` respects this automatically.

### Key commands

Standard dev commands are documented in `README.md` and `CONTRIBUTING.md`. Quick reference:

| Task | Command |
|---|---|
| Dev server | `npm run dev` (starts on port 3000 with `MOCKS=true`) |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Unit tests | `npm run test -- --watch=false` |
| E2E tests | `npm run test:e2e:dev` (requires Playwright browsers: `npm run test:e2e:install`) |
| DB reset + seed | `npx prisma@7 migrate reset --force` then `npx tsx other/runfile prisma/seed.ts` |

### Non-obvious caveats

- **Prisma AI guard**: Running `prisma migrate reset` from an AI agent requires the env var `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` to be set (Prisma detects Cursor and blocks destructive commands otherwise). The value should be the user's consent message.
- **Dev server is not a TTY**: `server/dev-server.js` detects non-TTY and disables keyboard shortcuts. This is expected in cloud agent terminals.
- **All external APIs are mocked** via MSW when `MOCKS=true` (the default in dev). No real API keys are needed for local development — the `.env.example` values are sufficient.
- **SQLite is file-based**: The database file lives at `prisma/sqlite.db`. No external database server is required.
- **Cache database**: A separate SQLite cache DB is created at `other/cache.db`. It's populated on first request or via `npm run prime-cache:mocks`.
- **Patch-package**: Three Remix packages are patched during `postinstall` (patches in `other/patches/`). If you see patch errors after dependency changes, check those patches.
- **Content is filesystem-based**: Blog posts are MDX files in `content/blog/`. Changes to content files are auto-detected by the dev server's file watcher.
