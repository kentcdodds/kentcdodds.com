# Contributing

Thanks for being willing to contribute!

**Working on your first Pull Request?** You can learn how from this _free_
series [How to Contribute to an Open Source Project on GitHub][egghead]

## Content Changes

Most content changes can be made without cloning the repository. Simply locate
the file you wish to change in the GitHub UI, and click the little edit icon to
make your change directly on the GitHub website.

If you need to make any other substantial changes, then follow the project setup
steps below.

### Translation contributions

Translations for blog posts are more than welcome, but I'm afraid I don't have
the bandwidth to manage them within this repository. So if you'd like to
translate content on my blog, simply translate the post and put it on your own
blog. Then come here and add a link to the translation in the mdx file for the
post you translated. It should look like this:

```mdx
---
title: Some great post
... other stuff ...
translations:
  - language: Español
    link: https://example.com/your/translation/link/here
    author:
      name: Your name
      link: https://example.com/your/link/here
... more other stuff ...
---
```

The link can be your twitter, website, or LinkedIn.

The only requirement is that at the beginning of your translation, you explain
that it is a translation of the original post and link back to the original
post. For example:

> This is a translation of the original post
> [Some great post](https://kentcdodds.com/blog/some-great-post) by
> [Kent C. Dodds](https://kentcdodds.com/).

If you notice an error in an existing translation or if the link to the
translation is not working, please try to reach out to the translator directly
to get it fixed. The only thing we can do in this repo is remove the link. If
you feel that's necessary, feel free to open a pull request to do that.

Thanks for helping to make my content more accessible!

## Project setup

If you do need to set the project up locally yourself, feel free to follow these
instructions:

### System Requirements

- [Node.js](https://nodejs.org/) 26
- [Bun](https://bun.com/) 1.3.14
- [git](https://git-scm.com/) >= 2.7.0
- Dory (optional; the supported container-runtime entry point for Call Kent
  sandbox work)

### Setup steps

1.  Fork and clone the repo
2.  Copy `services/site/.env.example` into `services/site/.env`
3.  Run `bun run setup` to install dependencies and run validation
4.  Create a branch for your PR with `git checkout -b pr/your-branch-name`

> Tip: Keep your `main` branch pointing at the original repository and make pull
> requests from branches on your fork. To do this, run:
>
> ```
> git remote add upstream https://github.com/kentcdodds/kentcdodds.com.git
> git fetch upstream
> git branch --set-upstream-to=upstream/main main
> ```
>
> This will add the original repository as a "remote" called "upstream," Then
> fetch the git information from that remote, then set your local `main` branch
> to use the upstream main branch whenever you run `git pull`. Then you can make
> all of your pull request branches based on this `main` branch. Whenever you
> want to update your version of `main`, do a regular `git pull`.

If the setup script doesn't work, you can try to run the commands manually:

```sh
git clone <your-fork>
cd ./kentcdodds.com

# copy the site env example to services/site/.env
#   everything's mocked out during development so you shouldn't need to
#   change any of these values unless you want to hit real environments.
cp services/site/.env.example services/site/.env

# Install deps
bun install

# setup local D1 (migrations + seed)
bun run --filter kentcdodds.com db:reset

# run build, typecheck, linting
bun run validate

# Install playwright browsers
bun run test:e2e:install

# run e2e tests
bun run test:e2e:run
```

If that all worked without trouble, you should be able to start development
with:

```sh
bun run dev
```

And open up `http://localhost:3000` and rock!

## Mocks

Everything's mocked locally so you should be able to work completely offline.
The local D1 database runs via Miniflare; all third party endpoints are mocked
via the dev worker's outbound fetch wrapper (same routes as production's
`OutboundProxy`). Unit tests still use MSW in Node via `msw/node`.

Transactional emails (Cloudflare Email Sending) are captured to
`services/site/mocks/msw.local.json` and logged to the dev worker console.

## Caching

MDX content is pre-compiled by the dev-watcher sidecar into
`node_modules/.cache/mdx-dev/`. On file save, the watcher recompiles the
changed document and triggers a Vite full-reload. Application data caching uses
the local Miniflare `SITE_CACHE_KV` binding.

## Running automated tests

We have two kinds of tests, unit and component tests with Vitest and E2E tests
with Playwright.

```sh
# run the unit and component tests with vitest via:
bun run test

# run the Playwright tests in dev mode:
bun run test:e2e:dev

# run the Playwright tests in headless mode:
bun run test:e2e:run
```

## Running static tests (Formatting/Linting/Typing)

Everything's set up with TypeScript/Prettier/Oxlint, plus Husky + lint-staged
git hooks from the repository root:

- `pre-commit` formats staged files with Prettier, then runs workspace linting,
  typechecking, and builds.
- `pre-push` runs the workspace test suite.

After `bun install`, Husky installs the hooks automatically via the root
`prepare` script. CI workspace installs include the workspace root so the same
plain `prepare` command works there too.
You can run the same checks manually if you want:

```sh
bun run format
bun run format:staged
bun run lint
bun run lint:all
bun run typecheck
bun run typecheck:all
bun run build
bun run build:all
bun run precommit:verify
bun run test
bun run test:all
bun run prepush:verify
```

These are all configured in the project to hopefully work with whatever editor
plugins you have so it should work as you working as well.

This repo uses Bun workspaces, so install dependencies from the repository root.
To run a script for a specific workspace package, use
`bun run --filter <package-name> <script>`.
The main site now lives in `services/site`, and the root `bun run dev`,
`bun run build`, `bun run test`, and related commands forward there.

Bun is the package manager and task runner. Node 26 remains required for
Node-specific scripts; Vite remains React Router's framework compiler and the
Cloudflare Vite plugin keeps local development in workerd.

## Styles

We use Tailwind for our styles. Tailwind is configured directly in
`services/site/app/styles/tailwind.css` (CSS-first config) and via the Tailwind
Vite plugin in `services/site/vite.config.ts`.

## Database

Schema and migrations live in `services/site/migrations/` as flat `.sql` files.
`app/utils/db/schema.server.ts` (`@remix-run/data-table`) is the runtime schema
source of truth.

| Environment                | Database                                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| Unit tests (Node)          | In-memory SQLite via test helpers, or file at `services/site/.data/sqlite.db` (`DATABASE_URL`) |
| Local dev + Playwright e2e | Miniflare D1 (`.wrangler/state/v3/d1/…`)                                                       |
| Production                 | Cloudflare D1 via `services/site-worker`                                                       |

Create a migration:

```sh
bun run --filter kentcdodds.com db:migration:new -- add_my_column
```

Edit the generated SQL, then reset local dev D1 + seed:

```sh
bun run --filter kentcdodds.com db:reset
```

This applies migrations to the local Miniflare D1 database and runs the seed
script (admin user `me@kentcdodds.com` / `iliketwix`).

Remote D1 migrations:
`bun run --filter site-worker d1:migrations:apply:production`
(after widen steps land on `main`). See
`docs/agents/cloudflare-worker-architecture.md` for the full command table.

## Maintenance Tips

### Production topology

Production runs on the Cloudflare Worker `kentcdodds-com` (see
`docs/agents/cloudflare-worker-architecture.md`). Local development and CI/e2e
run the app in workerd via `@cloudflare/vite-plugin` (single-worker HMR model).

Schema changes: widen-then-narrow migrations; apply remote D1 migrations via
`bun run --filter site-worker d1:migrations:apply:production` after merging
widen steps.

Local D1 reset + seed: `bun run --filter kentcdodds.com db:reset`.

## Help needed

Please checkout [the open issues][issues]

Also, please watch the repo and respond to questions/bug reports/feature
requests! Thanks!

<!-- prettier-ignore-start -->
[egghead]: https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github
[issues]: https://github.com/kentcdodds/kentcdodds.com/issues
<!-- prettier-ignore-end -->
