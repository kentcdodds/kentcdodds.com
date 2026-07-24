# Kent C. Dodds' site

[![Build Status][build-badge]][build]
[![GPL 3.0 License][license-badge]][license]

This repository contains the source code for
[kentcdodds.com](https://kentcdodds.com/), built with React Router v8, React,
TypeScript, Vite, and Cloudflare Workers.

## Tech stack

- React Router + React + TypeScript
- Vite build pipeline + `@cloudflare/vite-plugin` (local dev in workerd)
- Cloudflare Workers (production) with D1 + KV + R2
- Flat SQL migrations (`services/site/migrations/`) + `@remix-run/data-table`
  (runtime DB)
- Tailwind CSS
- Vitest and Playwright for testing

## Prerequisites

- [Node.js](https://nodejs.org/) `26`
- [Bun](https://bun.com/) `1.3.14`
- [git](https://git-scm.com/)

## Setup

1. Clone the repository.
2. Copy environment variables:
   - `cp services/site/.env.example services/site/.env`
3. Run the full setup script:
   - `bun run setup`

The setup script installs dependencies, resets the local D1 database (Miniflare),
validates the project, installs Playwright browsers, and runs end-to-end tests.

This repo uses Bun workspaces. Install dependencies from the repository root
so the site and worker packages share one lockfile and one `node_modules` tree.
The site itself lives in `services/site`, while root `bun run ...` commands
forward to that workspace for convenience.

Bun owns package installation and task orchestration. Node 26 remains available
for Node-specific scripts, Vite remains React Router's framework compiler, and
local/production application code runs in workerd through Cloudflare's Vite
integration. Bun's standalone bundler is not a replacement for that SSR/workerd
pipeline.

## Local development

Start the development server (MDX watcher sidecar + workerd via Vite):

- `bun run dev`

Then open `http://localhost:3000`. External APIs are mocked by default
(`MOCKS=true`). Transactional emails are written to
`services/site/mocks/msw.local.json`.

## Git hooks

This repo uses Husky + lint-staged from the repository root.

- On `git commit`, staged files are formatted with Prettier, then the repo runs
  `bun run lint:all`, `bun run typecheck:all`, and `bun run build:all`.
- On `git push`, the repo runs `bun run test:all`.

If hooks stop running after a fresh clone, run `bun install` from the repo root
to reinstall them via the `prepare` script.

## Useful scripts

- `bun run dev` - start local development server
- `bun run format:staged` - format staged files the same way pre-commit does
- `bun run test` - run unit/component tests
- `bun run test:all` - run workspace tests used by pre-push
- `bun run test:e2e:dev` - run Playwright tests against dev server
- `bun run lint` - run Oxlint
- `bun run lint:all` - run lint across the site and workspace packages
- `bun run typecheck` - run TypeScript checks
- `bun run typecheck:all` - run TypeScript checks across all workspaces
- `bun run build` - build the app
- `bun run build:all` - run workspace builds used by pre-commit
- `bun run nx:graph` - inspect the Nx workspace graph

## Contributing

For contribution guidelines and manual setup details, read
[`CONTRIBUTING.md`](./CONTRIBUTING.md).

<!-- prettier-ignore-start -->
[build-badge]: https://github.com/kentcdodds/kentcdodds.com/actions/workflows/deployment.yml/badge.svg?branch=main
[build]: https://github.com/kentcdodds/kentcdodds.com/actions/workflows/deployment.yml
[license-badge]: https://img.shields.io/badge/license-GPL%203.0%20License-blue.svg?style=flat-square
[license]: https://github.com/kentcdodds/kentcdodds.com/blob/main/LICENSE.md
<!-- prettier-ignore-end -->
