# data-table migration (COMPLETED)

Phase C finished the Prisma → `@remix-run/data-table` migration. The app no
longer imports `@prisma/client` at runtime; Prisma remains only for schema
management (`prisma/schema.prisma`, migrations, `prisma migrate` / `prisma
migrate reset`).

## Final architecture

| Runtime | DB access |
| --- | --- |
| Node dev + Fly | `db` → `createSqliteDatabaseAdapter(better-sqlite3)` on `DATABASE_URL` |
| Cloudflare dynamic worker | `db` → `SqliteExecutorDataTableAdapter` over `D1_RPC` |
| Cloudflare parent worker | Direct D1 executor (`APP_DB`) for scheduled cleanup |

`D1Rpc` in `services/site-worker/src/rpc/d1-rpc.ts` is the SQL-level RPC
boundary (replaces the former `PrismaRpc`). The dynamic worker env exposes
`D1_RPC` only — no `PRISMA_RPC`.

User/session helpers live in `app/utils/user-data.server.ts` (formerly
`prisma.server.ts`).

## Packages (locked)

| Package | Version | Role |
| --- | --- | --- |
| `@remix-run/data-table` | `0.3.0` | Schema (`table`/`column`), query API, `createDatabase` |
| `@remix-run/data-table-sqlite` | `0.3.0` | Node/better-sqlite3 adapter |

Do **not** import the `remix` umbrella package; use the standalone packages above.

## Runtime selection

`db.server.ts` exports a lazy `db` proxy:

1. **Dynamic worker** — when `D1_RPC` is present on runtime bindings, `db` uses
   `SqliteExecutorDataTableAdapter` over an RPC executor (parent worker hits D1).
2. **Node dev + Fly** — otherwise `createSqliteDatabaseAdapter(better-sqlite3)`
   against `DATABASE_URL`.

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

`SqliteExecutorDataTableAdapter` (adapted from
[epicflare `d1-data-table-adapter.ts`](https://github.com/epicweb-dev/epicflare/blob/main/worker/d1-data-table-adapter.ts))
implements `DatabaseAdapter` for both executors.

### RPC row serialization

Structured clone does **not** reliably round-trip `Date` values. RPC boundaries
use explicit serialization in `row-serialization.server.ts`:

| Type | On the wire | After read |
| --- | --- | --- |
| `Date` | ISO string | `Date` (when field matches ISO prefix) |
| `bigint` | `number` | `number` |
| `Uint8Array` / `Buffer` | `ArrayBuffer` | `Uint8Array` (`Passkey.publicKey`) |

WebAuthn `counter` is stored as SQLite `BIGINT` but coerced to `number` at read
boundaries (counters are small).

## Schema module

All tables live in `app/utils/db/schema.server.ts` with **PascalCase** table
names and **camelCase** columns matching Prisma/SQLite (`"User"`, `"PostRead"`,
`userId`, …).

**Every relation must set explicit `foreignKey`** — data-table's default
`inferForeignKey` produces `User_id`-style names but our columns are `userId`.

Row types are exported as `User`, `Session`, `Call`, etc. (`TableRow<typeof …>`).

### Client-side defaults (Prisma parity)

SQLite migrations do **not** define DB defaults for UUID primary keys. Phase A
implements Prisma client semantics via:

- `timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }` on tables
  with both columns.
- `injectUuidOnCreate()` `beforeWrite` on UUID `id` tables.
- `injectCreatedAtOnCreate()` for tables with only `createdAt` (`Session`,
  `PostRead`, `Verification`).
- `createDatabase(adapter, { now: () => new Date() })` for `@updatedAt` touch.

Prefer `db.create(table, partialRow)` and let hooks fill `id`/`createdAt`/`updatedAt`.

### Nested writes

data-table has no Prisma-style nested `create`/`upsert`. Use explicit
multi-statement flows in transactions when needed.

## Error mapping

| Prisma | data-table / SQLite |
| --- | --- |
| `P2002` unique violation | `isUniqueConstraintError(error)` |
| `P2025` not found | `isNotFoundError(error)`; `db.delete` returns `false` when missing |

Import from `#app/utils/db.server.ts`.

## Operation mapping (our patterns)

| Prisma | data-table |
| --- | --- |
| `findUnique({ where: { id } })` | `db.find(table, id)` or `db.findOne(table, { where: { id } })` |
| `findUnique({ where: { email } })` | `db.findOne(table, { where: { email } })` |
| `findFirst({ where, select })` | `db.findOne(table, { where })` or `db.query(table).where(...).select({...}).first()` |
| `findMany({ where, include })` | `db.findMany(table, { where, with: { relation } })` |
| `create({ data })` | `db.create(table, data)` or `{ returnRow: true }` |
| `update({ where: { id }, data })` | `db.update(table, id, data)` |
| `updateMany({ where, data })` | `db.updateMany(table, data, { where })` |
| `delete` / `deleteMany` | `db.delete(table, id)` / `db.deleteMany(table, { where })` |
| `upsert` (single field unique) | `db.query(table).upsert(values, { conflictTarget: ['email'], update })` |
| `upsert` (composite unique) | `db.query(table).upsert(values, { conflictTarget: [...], update, touch: true })` |
| `count` | `db.count(table, { where })` |
| `groupBy` | `db.query(table).groupBy('col').select({...})` **or** `db.exec(sql\`...\`)` |
| `$queryRaw` / `$executeRaw` | `db.exec(sql\`...\`)` or `db.exec({ text, values })` |
| `lt` / `gt` in `where` | `import { lt, gt } from '@remix-run/data-table'` |

## Before / after examples

### Session resolution — `find` + relation `with`

`app/utils/user-data.server.ts`:

```ts
const session = await db.find(sessionTable, sessionId, {
  with: { user: sessionUser },
})
const user = session.user
```

### Favorites — composite lookup

```ts
await db.findOne(favoriteTable, {
  where: { userId, contentType, contentId },
})
```

## Tests

- Unit tests use `createMigratedMemoryDatabase()` to apply all Prisma SQL
  migrations to an in-memory better-sqlite3 DB (`test-helpers.server.ts`).
- Adapter tests use `SqliteExecutorDataTableAdapter` over a local executor to
  mirror the D1 code path without Cloudflare.
- `services/site-worker/src/rpc/d1-rpc.test.ts` verifies ArrayBuffer/COUNT
  round-trip through `D1Rpc`.
