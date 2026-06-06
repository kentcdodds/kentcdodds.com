# Cloudflare staging D1

This is Phase 2 staging infrastructure for `services/site-worker`. It does not
replace the production Fly deploy, cut over DNS, or change production secrets.
Production stays on the current single-machine Fly app with direct SQLite until
the cutover phase is planned separately.

## Binding

`services/site-worker/wrangler.jsonc` declares:

- `APP_DB`: staging D1 database for the future React Router Worker runtime.

The Worker does not wire the React Router request handler yet. Do not add
production routes or production secrets while validating this database setup.

An `ASSETS` binding is intentionally not configured yet because the site-worker
does not build or serve the React Router client bundle. When the RR handler is
wired, add the asset binding to the actual client build output in the same PR
that serves those assets.

## Create the staging D1 database

Use a non-production Cloudflare account/environment:

```sh
npm exec --workspace site-worker wrangler -- d1 create kentcdodds-com-staging-app-db
```

Copy the returned `database_id` into the `APP_DB` binding in
`services/site-worker/wrangler.jsonc`.

## Apply existing site migrations

The site-worker migration scripts generate Wrangler-compatible flat SQL files in
`services/site-worker/.wrangler/site-prisma-migrations` from the committed
`services/site/prisma/migrations/*/migration.sql` files before running
`wrangler d1 migrations`. Do not commit or hand-edit the generated files, and do
not duplicate the migration SQL into the worker workspace.

Validate and apply migrations to the local Miniflare D1 database:

```sh
npm run d1:migrations:apply:local --workspace site-worker
```

Apply the same migrations to remote staging D1:

```sh
npm run d1:migrations:apply:staging --workspace site-worker
```

To inspect pending migrations without applying them:

```sh
npm run d1:migrations:list:local --workspace site-worker
npm run d1:migrations:list:staging --workspace site-worker
```

To regenerate the ignored D1 migration files without contacting D1:

```sh
npm run d1:migrations:prepare --workspace site-worker
```

## Local worker development

After local migrations are applied, start the staging worker shell:

```sh
npm run dev --workspace site-worker
```

The worker listens on `http://127.0.0.1:8788` and currently exposes only
`GET /health`. Future RR wiring can read the D1 binding as `env.APP_DB`.

## CI validation

`Validate Site Worker` runs:

- lint, typecheck, and tests for `services/site-worker`
- local D1 migration application against Miniflare
- `wrangler deploy --dry-run` to validate the worker bundle and Wrangler config

This validation intentionally avoids remote staging deploys and production Fly
deploys.
