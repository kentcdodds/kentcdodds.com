# data-table conventions

Runtime DB access uses `@remix-run/data-table`. SQL migrations live in
`services/site/migrations/`. User/session helpers live in
`app/utils/user-data.server.ts`.

Do **not** import the `remix` umbrella package; use `@remix-run/data-table` and
`@remix-run/data-table-sqlite` directly.

## Runtime selection

`db.server.ts` exports a lazy `db` proxy:

1. **Dynamic worker** — when `D1_RPC` is present on runtime bindings, `db` uses
   `SqliteExecutorDataTableAdapter` over an RPC executor (parent worker hits D1).
2. **Local dev worker** — when `APP_DB` is a real `D1Database` binding (`.prepare`/`.batch`),
   `db` uses a direct-D1 executor (`createDirectD1Executor`).
3. **Node unit tests** — otherwise `createSqliteDatabaseAdapter(better-sqlite3)`
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

`SqliteExecutorDataTableAdapter` implements `DatabaseAdapter` for both executors.

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
