# SQL migrations

Committed flat SQL files for the site database schema. Wrangler D1 applies these
in filename order and records each applied filename in the `d1_migrations`
table.

## Naming convention

`YYYYMMDDHHMMSS_snake-name.sql` — the timestamp prefix must sort
chronologically. Example: `20260401162552_homework_completions.sql`.

**Never rename a migration file after it has been applied** in production or any
shared local D1 state. Wrangler journals by filename; a rename looks like a new
migration and can break deploys.

## Creating a migration

```sh
npm run db:migration:new --workspace kentcdodds.com -- add_my_column
```

Edit the generated `.sql` file, then reset local dev state:

```sh
npm run db:reset --workspace kentcdodds.com
```

CI applies migrations via `wrangler d1 migrations apply` (see
`services/site-worker` scripts).

## D1 constraints

Cloudflare D1 does not support interactive transactions. Follow a
**widen-then-narrow** rollout for breaking changes:

1. **Widen** — add nullable columns, new tables, or relaxed constraints in one
   deploy.
2. **Narrow** — drop columns, tighten constraints, or remove tables in a later
   deploy after the app no longer depends on the old shape.

Avoid `CREATE TEMP TABLE` in migrations (D1 rejects temporary tables). Use a
regular table for preflight guards and drop it in the same migration when
needed.

## Runtime schema source of truth

Table and column definitions live in `app/utils/db/schema.server.ts`
(`@remix-run/data-table`). The schema drift test in
`app/utils/db/__tests__/schema-drift.server.test.ts` asserts migrations match
that module.
