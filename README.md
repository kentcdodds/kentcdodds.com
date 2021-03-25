# Kent C. Dodds blog (rewritten with Remix)

[![Build Status][build-badge]][build]
[![GPL 3.0 License][license-badge]][license]

More info coming soon...

## Contributing

### Content

All content for the blog is hosted in
[a separate repo](https://github.com/kentcdodds/kentcdodds.com). Contributions
should be made there.

If you want to work on the content while running it locally in the app, then put
the files in `mocks/content` and it will be pulled from there.

### Code

#### You have a Remix license

You'll need to have your Remix key set to be able to install the dependencies.

There is an `.npmrc.example` file located in the root of this project. If you
have not set your Remix key in your main npm config (`~/.npmrc`), you might want
to rename this file to `.npmrc` and either replace `${REMIX_REGISTRY_TOKEN}`
with your key, or set the `REMIX_REGISTRY_TOKEN` env variable before running
`npm install`.

There is an `.env.example` file located in the root of this project. Rename it
to `.env`, and adjust the values before you start the app.

#### You do not have a Remix license

If you do not have a remix license, you will not be able to install dependencies
and run the project locally. However, you _can_ work on the frontend components
in the `storybook` directory. See `storybook/README.md` for more information.

<!-- prettier-ignore-start -->
[build-badge]: https://img.shields.io/github/workflow/status/kentcdodds/elaborate/validate/main?logo=github&style=flat-square
[build]: https://github.com/kentcdodds/elaborate/actions?query=workflow%3Avalidate
[license-badge]: https://img.shields.io/badge/license-GPL%203.0%20License-blue.svg?style=flat-square
[license]: https://github.com/kentcdodds/react-fundamentals/blob/main/LICENSE
<!-- prettier-ignore-end -->
