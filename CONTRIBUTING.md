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

- [Bun](https://bun.sh/) >= 1.3.9
- [Node.js](https://nodejs.org/) >= 24.0.0
- [git](https://git-scm.com/) >= 2.7.0
- [Docker](https://www.docker.com/)

### Setup steps

1.  Fork and clone the repo
2.  Copy `.env.example` into `.env`
3.  Run `bun run setup -s` to install dependencies and run validation
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

# copy the .env.example to .env
#   everything's mocked out during development so you shouldn't need to
#   change any of these values unless you want to hit real environments.
cp .env.example .env

# Install deps
bun install

# setup database
prisma migrate reset --force

# run build, typecheck, linting
bun run validate

# setup cache database
bun run prime-cache:mocks

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
The DB runs locally, but all third party endpoints are mocked out via
Worker mock servers in `mock-servers/**`.

## Caching

Because the mdx files are built on-demand and that can take some time, we
heavily cache them in sqlite. This means that if you need to work on content,
you'll need a way to clear the cache. Luckily, when running the dev script, we
have a file watcher that auto-updates the cache as you save the file. It should
happen so fast you don't even notice what's going on, but I thought I'd mention
it here just so you know if it doesn't work.

## Running automated tests

We have two kinds of tests, unit and component tests with Jest and E2E tests
with Playwright.

```sh
# run the unit and component tests with jest via:
bun run test

# run the Playwright tests in dev mode:
bun run test:e2e:dev

# run the Playwright tests in headless mode:
bun run test:e2e:run
```

## Running static tests (Formatting/Linting/Typing)

Everything's set up with TypeScript/Prettier/ESLint. These should all run on
commit (only relevant files are checked). You can run them individually though
if you want:

```sh
bun run format
bun run lint
bun run typecheck
```

These are all configured in the project to hopefully work with whatever editor
plugins you have so it should work as you working as well.

## Styles

We use Tailwind for our styles. Tailwind is configured directly in
`app/styles/tailwind.css` (CSS-first config) and via the Tailwind Vite plugin in
`vite.config.ts`.

## Database

We've got SQLite and Prisma set up. Learn about the schema and learn more about
what commands you can run in `./prisma/schema.prisma`.

One common command you might need to run is to re-seed the database:

```sh
bunx prisma@7 migrate reset --force
```

In addition to resetting your database to the latest schema, it'll also run the
seed script which will populate the database with some example data.

## Maintenance tips

The production platform is Cloudflare Workers + D1 + KV + Queues + container
helpers. For operational procedures, use these runbooks:

- `docs/cloudflare-cutover-runbook.md`
- `docs/call-kent-container-runbook.md`

Useful commands for local verification:

```sh
# queue + mock container stack
bun run dev:calls-e2e

# queue + real local ffmpeg container stack
bun run dev:calls-e2e:real-container

# strict content compile report (CI parity)
bun run content:compile-mdx-remote:strict-report
```

## Help needed

Please checkout [the open issues][issues]

Also, please watch the repo and respond to questions/bug reports/feature
requests! Thanks!

<!-- prettier-ignore-start -->
[egghead]: https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github
[issues]: https://github.com/kentcdodds/kentcdodds.com/issues
<!-- prettier-ignore-end -->
