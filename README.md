# Kent C. Dodds' site

[![Build Status][build-badge]][build]
[![GPL 3.0 License][license-badge]][license]

This repository contains the source code for
[kentcdodds.com](https://kentcdodds.com/), built with Remix, React, TypeScript,
Vite, and an Express server.

## Tech stack

- React Router + React + TypeScript
- Vite build pipeline
- Express runtime server
- Prisma + SQLite
- Tailwind CSS
- Vitest and Playwright for testing

## Prerequisites

- [Node.js](https://nodejs.org/) `24`
- `npm` `>=10`
- [git](https://git-scm.com/)

## Setup

1. Clone the repository.
2. Copy environment variables:
   - `cp services/site/.env.example services/site/.env`
3. Run the full setup script:
   - `npm run setup -s`

The setup script installs dependencies, resets the local database, validates the
project, primes local cache data, installs Playwright browsers, and runs
end-to-end tests.

This repo now uses npm workspaces. Install dependencies from the repository root
so the site and worker packages share one lockfile and one `node_modules` tree.
The site itself lives in `services/site`, while root `npm run ...` commands
forward to that workspace for convenience.

## Local development

Start the development server:

- `npm run dev`

Then open `http://localhost:3000`.

## Git hooks

This repo uses Husky + lint-staged from the repository root.

- On `git commit`, staged files are formatted with Prettier, then the repo runs
  `npm run lint:all`, `npm run typecheck:all`, and `npm run build:all`.
- On `git push`, the repo runs `npm run test:all`.

If hooks stop running after a fresh clone, run `npm install` from the repo root
to reinstall them via the `prepare` script.

## Useful scripts

- `npm run dev` - start local development server
- `npm run format:staged` - format staged files the same way pre-commit does
- `npm run test` - run unit/component tests
- `npm run test:all` - run workspace tests used by pre-push
- `npm run test:e2e:dev` - run Playwright tests against dev server
- `npm run lint` - run Oxlint
- `npm run lint:all` - run lint across the site and workspace packages
- `npm run typecheck` - run TypeScript checks
- `npm run typecheck:all` - run TypeScript checks across all workspaces
- `npm run build` - build the app
- `npm run build:all` - run workspace builds used by pre-commit
- `npm run nx:graph` - inspect the Nx workspace graph

## Contributing

For contribution guidelines and manual setup details, read
[`CONTRIBUTING.md`](./CONTRIBUTING.md).

<!-- prettier-ignore-start -->
[build-badge]: https://github.com/kentcdodds/kentcdodds.com/actions/workflows/deployment.yml/badge.svg?branch=main
[build]: https://github.com/kentcdodds/kentcdodds.com/actions/workflows/deployment.yml
[license-badge]: https://img.shields.io/badge/license-GPL%203.0%20License-blue.svg?style=flat-square
[license]: https://github.com/kentcdodds/kentcdodds.com/blob/main/LICENSE.md
<!-- prettier-ignore-end -->
