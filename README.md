# Kent C. Dodds blog (rewritten with Remix)

[![Build Status][build-badge]][build]
[![GPL 3.0 License][license-badge]][license]

More info coming soon...

## Contributing

### TL;DR:

First, fork the repo, then do this:

```sh
git clone <your-fork>
cd ./remix-kentcdodds

# copy the .env.example to .env
#   everything's mocked out during development so you shouldn't need to
#   change any of these values unless you want to hit real environments.
cp .env.example .env

# make sure you have a REMIX_TOKEN environment variable set
npm install

# make sure you have docker installed
# The `-d` tells docker to run this in the background
docker compose up -d

# get the postgres DB initialized to match our prisma schema.
npx prisma migrate reset --force

# build the app for the first time
npm run build
```

If that all worked without trouble, you should be able to start development
with:

```sh
npm run dev
```

And open up `http://localhost:3000` and rock!

### Running automated tests

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

### Running static tests (Formatting/Linting/Typing)

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

### Styles

We use Tailwind for our styles. That's all configured in the
`tailwind.config.js` file. We use the jit feature. The source files are in
`styles` and they build to the `app/styles` directory where our app picks them
up from there.

<!-- prettier-ignore-start -->
[build-badge]: https://img.shields.io/github/workflow/status/kentcdodds/elaborate/validate/main?logo=github&style=flat-square
[build]: https://github.com/kentcdodds/elaborate/actions?query=workflow%3Avalidate
[license-badge]: https://img.shields.io/badge/license-GPL%203.0%20License-blue.svg?style=flat-square
[license]: https://github.com/kentcdodds/react-fundamentals/blob/main/LICENSE
<!-- prettier-ignore-end -->
