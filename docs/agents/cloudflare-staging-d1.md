# Cloudflare staging D1

This is Phase 2 staging infrastructure for `services/site-worker`. Production
deploys to `kentcdodds-com` on `main`; this doc covers the staging preview only.

**Canonical architecture:** see
[cloudflare-worker-architecture.md](./cloudflare-worker-architecture.md) for
the full worker topology, bindings, crons, and preview runbooks.

## Bindings

`services/site-worker/wrangler.jsonc` declares the staging preview stack:

- `APP_DB` — staging D1 database (`kentcdodds-com-staging-app-db`)
- `SITE_CACHE_KV`, `CONTENT_KV` — KV namespaces for cachified + MDX manifest
- `MDX_ARTIFACTS` — R2 bucket (`kcd-site-cf-preview-artifacts`)
- `LOADER` — Worker Loader for the dynamic app isolate
- `ASSETS` — static client build from `services/site/build/client`
- `OAUTH_WORKER`, `SEARCH_WORKER` — service bindings to production workers

The worker serves the **full React Router app** (not a health-only shell).
Resource IDs are committed in `wrangler.jsonc`; `npm run provision:preview
--workspace site-worker` stamps `generated-wrangler.jsonc` without Cloudflare
API calls when IDs are already present.

## Apply existing site migrations

The site-worker migration scripts generate Wrangler-compatible flat SQL files in
`services/site-worker/.wrangler/site-prisma-migrations` from the committed
`services/site/prisma/migrations/*/migration.sql` files before running
`wrangler d1 migrations`. Do not commit or hand-edit the generated files, and do
not duplicate the migration SQL into the worker workspace.

The generated copy normalizes `CREATE TEMP TABLE` to `CREATE TABLE` because D1
rejects temporary tables in migrations. The affected guard table is dropped in
the same migration, so this keeps the safety check without changing the
committed Prisma migration.

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

After local migrations are applied, start the staging worker:

```sh
npm run dev --workspace site-worker
```

The worker listens on `http://127.0.0.1:8792` and exposes `GET /healthcheck`
(plain text `OK`) plus the full site routes through the dynamic app worker.

## CI validation

`Validate Site Worker` runs:

- lint, typecheck, and tests for `services/site-worker`
- local D1 migration application against Miniflare
- `wrangler deploy --dry-run` to validate the worker bundle and Wrangler config

This validation intentionally avoids remote staging deploys and production Fly
deploys. Remote preview deploys run from `.github/workflows/cf-preview-deploy.yml`
on the migration branch only.
