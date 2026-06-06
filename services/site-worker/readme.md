This Worker is a staging Cloudflare Worker shell for the main `kentcdodds.com`
site.

It intentionally does not route production traffic or replace the Fly deploy. It
is only configured for the default `workers.dev` route.

- `GET /health` -> `{ "ok": true }`
- all other requests are handled by the React Router server build from
  `services/site/build/server/index.js`

The Worker bootstraps `setRuntimeEnvSource` and `setRuntimeBindingSource` from
the Cloudflare Worker env before handing requests to React Router.

Static assets are served through the `ASSETS` binding configured in
`wrangler.jsonc`, which points at `services/site/build/client`. If the binding
is not present in a custom local harness, asset requests fall through to the
React Router handler and may return the app's normal 404 response.

## Local development

- Run `npm run dev --workspace site-worker`
- Build only the site router bundle with:
  - `npm run build:site --workspace site-worker`
- Run checks with:
  - `npm run lint --workspace site-worker`
  - `npm run typecheck --workspace site-worker`
  - `npm run test --workspace site-worker`
- Validate the Worker bundle with:
  - `npm run dry-run --workspace site-worker`
