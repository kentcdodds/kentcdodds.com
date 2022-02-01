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

- [Node.js](https://nodejs.org/) >= 16.0.0
- [git](https://git-scm.com/) >= 2.7.0
- [Docker](https://www.docker.com/)

### Setup steps

First, fork the repo, then do this:

```sh
git clone <your-fork>
cd ./kentcdodds.com

# copy the .env.example to .env
#   everything's mocked out during development so you shouldn't need to
#   change any of these values unless you want to hit real environments.
cp .env.example .env

npm run setup
```

That should do everything for you... If it doesn't work, here's basically what
it does, go ahead and try each of these commands one at a time:

```sh
npm install

# make sure you have docker installed
# The `-d` tells docker to run this in the background
docker compose up -d

# get the postgres DB initialized to match our prisma schema.
npx prisma migrate reset --force

# Run type checking, linting, and unit tests
npm run validate

# Prime the cache with the mock data
npm run prime-cache:mocks

# Run the E2E tests
npm run test:e2e:run
```

If that all worked without trouble, you should be able to start development
with:

```sh
npm run dev
```

And open up `http://localhost:3000` and rock!

## Mocks

Everything's mocked locally so you should be able to work completely offline.
The postgres DB runs in a docker container locally, but all third party
endpoints are mocked out via [`MSW`](https://mswjs.io/).

## Caching

Because the mdx files are built on-demand and that can take some time, we
heavily cache them via redis (which is configured in the `docker-compose.yml`
file). This means that if you need to work on content, you'll need a way to
clear the cache. Luckily, when running the dev script, we have a file watcher
that auto-updates the cache as you save the file. It should happen so fast you
don't even notice what's going on, but I thought I'd mention it here just so you
know if it doesn't work.

## Running automated tests

We have two kinds of tests, unit and component tests with Jest and E2E tests
with Cypress.

```sh
# run the unit and component tests with jest via:
npm run test

# run the Cypress tests in dev mode:
npm run test:e2e:dev

# run the Cypress tests in headless mode:
npm run test:e2e:run
```

Jest runs on changed files as part of the husky git commit hook. Cypress runs
only on CI.

## Running static tests (Formatting/Linting/Typing)

Everything's set up with TypeScript/Prettier/ESLint. These should all run on
commit (only relevant files are checked). You can run them individually though
if you want:

```sh
npm run format
npm run lint
npm run typecheck
```

These are all configured in the project to hopefully work with whatever editor
plugins you have so it should work as you working as well.

## Styles

We use Tailwind for our styles. That's all configured in the
`tailwind.config.js` file. We use the jit feature. The source files are in
`styles` and they build to the `app/styles` directory where our app picks them
up from there.

## Database

We've got PostgreSQL and Prisma set up. Learn about the schema and learn more
about what commands you can run in `./prisma/schema.prisma`.

One common command you might need to run is to re-seed the database:

```sh
npx prisma migrate reset --force
```

In addition to resetting your database to the latest schema, it'll also run the
seed script which will populate the database with some example data.

## Help needed

Please checkout [the open issues][issues]

Also, please watch the repo and respond to questions/bug reports/feature
requests! Thanks!

<!-- prettier-ignore-start -->
[egghead]: https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github
[issues]: https://github.com/kentcdodds/kentcdodds.com/issues
<!-- prettier-ignore-end -->
