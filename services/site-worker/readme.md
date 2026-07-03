This Worker is a staging Cloudflare Worker shell for the main `kentcdodds.com`
site.

It intentionally does not route production traffic or replace the Fly deploy.
For now it is only configured for the default `workers.dev` route and exposes a
minimal health endpoint:

- `GET /health` -> `{ "ok": true }`

## Local development

- Run `npm run dev --workspace site-worker`
- Run checks with:
  - `npm run lint --workspace site-worker`
  - `npm run typecheck --workspace site-worker`
  - `npm run test --workspace site-worker`
- Validate the Worker bundle with:
  - `cd services/site-worker && npm exec wrangler -- deploy --dry-run`
