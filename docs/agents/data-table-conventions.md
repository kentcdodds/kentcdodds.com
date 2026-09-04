# data-table conventions

Runtime DB access uses `@remix-run/data-table`. SQL migrations live in
`services/site/migrations/`. User/session helpers live in
`app/utils/user-data.server.ts`.

## D1 billing sharp edge: rows read

D1 bills **rows scanned**, not rows returned. A `GROUP BY` or
`COUNT(DISTINCT ...)` over `PostRead` (~1M rows) scans the whole table on every
execution. Request-path popularity / reader-count reads must **not** scan
`PostRead`:

- `PostReadSlugCount` (`postSlug` PK) is the source for `blog:post-read-counts`
  / `getTotalPostReads`. Increment it in `addPostRead`; never
  `GROUP BY "PostRead"."postSlug"` on a request path (including MCP
  `get_most_popular_posts`).
- `PostReadReader` (`u:{userId}` / `c:{clientId}`) is the source for
  `total-reader-count`. Increment with `INSERT OR IGNORE` on new reads;
  reassign client → user in `migrateClientPostReadsToUser` (login / signup /
  password reset). Do not `COUNT(DISTINCT userId/clientId)` over `PostRead`.
- Team rankings still join `PostRead` ↔ `User` on cache miss / SWR, but only
  as **two** grouped queries (`teamReadStatsSql` + `activeMembersByTeamSql`),
  not 9 per-team scans. `/action/mark-as-read` increments the cached ranking
  objects (`recentReads`, `activeMembers`, `totalReads`) instead of
  `forceFresh`. Fallback `forceFresh` is only for pre-increment cache entries
  that lack those fields.
- `lruCache` (`app/utils/cache.server.ts`) is **per-isolate memory**. Isolates
  churn constantly (deploys, eviction, the warmup cron), so an `lruCache`-only
  cachified value re-runs its `getFreshValue` on every new isolate regardless
  of TTL. In Aug 2026 this made two full-table `PostRead` aggregates
  (`blog:post-read-counts`, `total-reader-count` in `app/utils/blog.server.ts`)
  run ~53k times/week ≈ 51B rows read/week ≈ a $195/month D1 line item.
- `cache` (KV-backed via `CACHE_RPC`) is shared across isolates. Any cachified
  value whose `getFreshValue` used to scan a large table MUST use `cache`,
  not `lruCache`. Reserve `lruCache` for values that are cheap to recompute.
- Also avoid `forceFresh: true` on request paths (e.g. actions) unless the
  underlying data actually changed; it bypasses the shared cache and re-runs
  the aggregate queries.
- To verify what is burning reads, query GraphQL
  `d1QueriesAdaptiveGroups` ordered by `sum_rowsRead_DESC` (or
  `wrangler d1 insights`).

Do **not** import the `remix` umbrella package; use `@remix-run/data-table` and
`@remix-run/data-table-sqlite` directly.

## Runtime selection

`db.server.ts` exports a lazy `db` proxy:

1. **Dynamic worker** — when `D1_RPC` is present on runtime bindings, `db` uses
   `SqliteExecutorDataTableAdapter` over an RPC executor (parent worker hits D1).
2. **Local dev worker** — when `APP_DB` is a real `D1Database` binding (`.prepare`/`.batch`),
   `db` uses a direct-D1 executor (`createDirectD1Executor`).
3. **Node unit tests** — otherwise a `node:sqlite` (`DatabaseSync`) executor
   against `DATABASE_URL`. No native module: Node's built-in SQLite avoids
   NODE_MODULE_VERSION rebuild churn across Node upgrades.

## Executor / adapter design

```ts
type D1SqlExecutor = {
  query(sql, params?): Promise<{ results, meta? }>
  run(sql, params?): Promise<{ results?, meta? }>
  exec(sql): Promise<void>
}

type D1RpcBinding = D1SqlExecutor & {
  batch(statements[]): Promise<D1StatementResult[]>
}
```

- **Direct D1** (`createDirectD1Executor(APP_DB)`) — parent worker scheduled
  cleanup + `D1Rpc` implementation.
- **RPC** (`createRpcD1Executor(D1_RPC)`) — dynamic app worker isolate.

`SqliteExecutorDataTableAdapter` implements `DatabaseAdapter` for both executors.

### RPC row serialization

Structured clone does **not** reliably round-trip `Date` values. RPC boundaries
use explicit serialization in `row-serialization.server.ts`:

| Type                    | On the wire   | After read                             |
| ----------------------- | ------------- | -------------------------------------- |
| `Date`                  | ISO string    | `Date` (when field matches ISO prefix) |
| `bigint`                | `number`      | `number`                               |
| `Uint8Array` / `Buffer` | `ArrayBuffer` | `Uint8Array` (`Passkey.publicKey`)     |

WebAuthn `counter` is stored as SQLite `BIGINT` but coerced to `number` at read
boundaries (counters are small).

## Schema module

All tables live in `app/utils/db/schema.server.ts` with **PascalCase** table
names and **camelCase** columns matching Prisma/SQLite (`"User"`, `"PostRead"`,
`userId`, …).

**Every relation must set explicit `foreignKey`** — data-table's default
`inferForeignKey` produces `User_id`-style names but our columns are `userId`.

Row types are exported as `User`, `Session`, `Call`, etc. (`TableRow<typeof …>`).

## Error mapping

| Prisma                   | data-table / SQLite                                                |
| ------------------------ | ------------------------------------------------------------------ |
| `P2002` unique violation | `isUniqueConstraintError(error)`                                   |
| `P2025` not found        | `isNotFoundError(error)`; `db.delete` returns `false` when missing |

Import from `#app/utils/db.server.ts`.

## Operation mapping (our patterns)

| Prisma                             | data-table                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------ |
| `findUnique({ where: { id } })`    | `db.find(table, id)` or `db.findOne(table, { where: { id } })`                       |
| `findUnique({ where: { email } })` | `db.findOne(table, { where: { email } })`                                            |
| `findFirst({ where, select })`     | `db.findOne(table, { where })` or `db.query(table).where(...).select({...}).first()` |
| `findMany({ where, include })`     | `db.findMany(table, { where, with: { relation } })`                                  |
| `create({ data })`                 | `db.create(table, data)` or `{ returnRow: true }`                                    |
| `update({ where: { id }, data })`  | `db.update(table, id, data)`                                                         |
| `updateMany({ where, data })`      | `db.updateMany(table, data, { where })`                                              |
| `delete` / `deleteMany`            | `db.delete(table, id)` / `db.deleteMany(table, { where })`                           |
| `upsert` (single field unique)     | `db.query(table).upsert(values, { conflictTarget: ['email'], update })`              |
| `upsert` (composite unique)        | `db.query(table).upsert(values, { conflictTarget: [...], update, touch: true })`     |

### Upsert bind-order caveat

`SqliteExecutorDataTableAdapter.compileUpsertStatement` must push INSERT
bound values before ON CONFLICT UPDATE values. SQL placeholder order is
`INSERT ... VALUES (?, ...) ON CONFLICT DO UPDATE SET col = ?`; if update
params are pushed first, columns get the wrong bindings (e.g. Password
`userId` receiving the hash → FK failure / 500 on password set/reset).
| `count` | `db.count(table, { where })` |
| `groupBy` | `db.query(table).groupBy('col').select({...})` **or** `db.exec(sql\`...\`)`|
|`$queryRaw` / `$executeRaw`|`db.exec(sql\`...\`)`or`db.exec({ text, values })`|
|`lt`/`gt`in`where`|`import { lt, gt } from '@remix-run/data-table'` |
