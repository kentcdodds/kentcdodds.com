# Storybook for KCD

This is a subdirectory of the whole app with its own package.json so we don't
have to worry about installing storybook (and everything it carries with it) in
the regular directory.

Storybook is configured in `.storybook/main.js` to treat `@kcd` as a prefix to
`../app` making it easy to import anything you need from the app directory.

You can import global CSS files in `.storybook/preview.js`, however I want to
just import _built_ css rather than running our CSS through the different
versions of tools in storybook from what we have in the main app. It just
simplifies things for us. So that means we probably should't have to add any
other css imports because all our global css will be in the files that are
already imported.

## Up and running

To get things built:

```sh
# in the root of the repo:
npm install
npm run build:css
cd storybook
npm install
npm run build
```

That should get your storybook built for the first time. Of course, to
`npm install` in the root of the repo, you'll need `REMIX_TOKEN` set in your
environment variables.

## Development

Because we're using tailwind JIT, we need postcss running in watch mode to
update the `tailwind.css` file for us as we add/remove class names. I put
together a pm2 config to run postcss in watch mode along with storybook which
you can get running with either of the following:

```sh
# in the root of the repo:
npm run dev:storybook

# alternatively, in the ./storybook directory
npm run dev
```

That should be enough to get you going during development.
