# Kent C. Dodds' site (Remix)

[![Build Status][build-badge]][build]
[![GPL 3.0 License][license-badge]][license]

This repository contains the source code for [kentcdodds.com](https://kentcdodds.com/),
built with Remix, React, TypeScript, Vite, and an Express server.

## Tech stack

- Remix + React + TypeScript
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
   - `cp .env.example .env`
3. Run the full setup script:
   - `npm run setup -s`

The setup script installs dependencies, resets the local database, validates
the project, primes local cache data, installs Playwright browsers, and runs
end-to-end tests.

## Local development

Start the development server:

- `npm run dev`

Then open `http://localhost:3000`.

## Useful scripts

- `npm run dev` - start local development server
- `npm run test` - run unit/component tests
- `npm run test:e2e:dev` - run Playwright tests against dev server
- `npm run lint` - run ESLint
- `npm run typecheck` - run TypeScript checks
- `npm run build` - build the app

## Contributing

For contribution guidelines and manual setup details, read
[`CONTRIBUTING.md`](./CONTRIBUTING.md).

<!-- prettier-ignore-start -->
[build-badge]: https://github.com/kentcdodds/kentcdodds.com/actions/workflows/deployment.yml/badge.svg?branch=main
[build]: https://github.com/kentcdodds/kentcdodds.com/actions/workflows/deployment.yml
[license-badge]: https://img.shields.io/badge/license-GPL%203.0%20License-blue.svg?style=flat-square
[license]: https://github.com/kentcdodds/kentcdodds.com/blob/main/LICENSE.md
<!-- prettier-ignore-end -->
