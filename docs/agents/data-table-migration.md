# data-table migration conventions (Phase B)

Phase A landed the shared data layer (`services/site/app/utils/db/` +
`services/site/app/utils/db.server.ts`). Phase B agents port route/service call
sites from `prisma` to `db` using these conventions.

## Packages (locked for this branch)

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

The legacy `prisma` proxy remains for unported call sites until Phase C.

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

**Phase B rule:** prefer `db.create(table, partialRow)` and let hooks fill
`id`/`createdAt`/`updatedAt`. Only pass timestamps when intentionally
overriding (seed data).

### Nested writes

data-table has no Prisma-style nested `create`/`upsert`. Use explicit
multi-statement flows in transactions when needed.

## Error mapping

| Prisma | data-table / SQLite |
| --- | --- |
| `P2002` unique violation | `isUniqueConstraintError(error)` — checks `DataTableConstraintError`, `SQLITE_CONSTRAINT_UNIQUE`, message |
| `P2025` not found | `isNotFoundError(error)` — checks code/message; `db.delete` returns `false` when missing |

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
| `groupBy` | `db.query(table).groupBy('col').select({...})` **or** `db.exec(sql\`...\`)` for Prisma `_count` shapes |
| `$queryRaw` / `$executeRaw` | `db.exec(sql\`...\`)` or `db.exec({ text, values })` |
| `lt` / `gt` in `where` | `import { lt, gt } from '@remix-run/data-table'` |

### API gaps & workarounds

| Gap | Workaround |
| --- | --- |
| No Prisma `groupBy` `_count` shape | `db.query(postRead).groupBy('postSlug').select(...)` or raw SQL template |
| No nested relation writes | Sequential `db.create` calls; use `db.transaction` when atomic |
| `groupBy` + relation filters | Prefer raw SQL or pre-query ids |
| Blob columns | `c.binary()` — use `Uint8Array`/`ArrayBuffer` at boundaries |
| `RETURNING` on D1 | Adapter sets `returning: true`; requires D1 support (enabled) |

## Before / after examples (this codebase)

### 1. Signup — `findUnique` by email

`app/routes/signup.tsx`:

```ts
// Before (Prisma)
const userExists = await prisma.user.findUnique({
  where: { email },
  select: { id: true },
})

// After (data-table)
const userExists = await db.findOne(userTable, {
  where: { email },
})
// use userExists?.id
```

### 2. Save call — `findUnique` with relations

`app/routes/resources/calls/save.tsx` (pattern):

```ts
// Before
const call = await prisma.call.findUnique({
  where: { id: callId },
  include: { episodeDraft: true, user: true },
})

// After
const call = await db.findOne(callTable, {
  where: { id: callId },
  with: { episodeDraft: callEpisodeDraft, user: callUser },
})
```

### 3. Blog recommendations — `groupBy`

`app/utils/blog.server.ts`:

```ts
// Before
prisma.postRead.groupBy({
  by: ['postSlug'],
  where: { user: { id: user.id }, postSlug: { notIn: exclude } },
})

// After (simplified; adjust filters with lt/gt/inList)
await db.query(postReadTable)
  .where({ userId: user.id })
  .groupBy('postSlug')
  .all()

// For _count popularity map, prefer raw SQL until a dedicated helper exists:
await db.exec(
  sql`select "postSlug", count(*) as count from "PostRead" group by "postSlug"`,
)
```

### 4. Favorites — composite `upsert`

`app/routes/resources/favorite.tsx`:

```ts
// Before
await prisma.favorite.upsert({
  where: { userId_contentType_contentId: where },
  create: where,
  update: {},
})

// After
await db.exec(
  db.query(favoriteTable).upsert(where, {
    conflictTarget: ['userId', 'contentType', 'contentId'],
    update: {},
  }),
)
```

### 5. Session resolution — `findUnique` + `update`

`app/utils/prisma.server.ts` (already ported in Phase A — copy pattern):

```ts
// Before
const session = await prisma.session.findUnique({ where: { id: sessionId } })
await prisma.session.update({
  data: { expirationDate: newExpirationDate },
  where: { id: sessionId },
})

// After
const session = await db.find(sessionTable, sessionId)
await db.update(sessionTable, sessionId, {
  expirationDate: newExpirationDate,
})
```

### 6. Homework completion — composite upsert + `P2002`

`app/utils/prisma.server.ts` / `homework-completion-migration.server.ts`:

```ts
// Before
await prisma.homeworkCompletion.upsert({
  where: {
    userId_seasonNumber_episodeNumber_itemIndex: {
      userId, seasonNumber, episodeNumber, itemIndex,
    },
  },
  create: { userId, seasonNumber, episodeNumber, itemIndex },
  update: { updatedAt: new Date() },
})

// After
await db.exec(
  db.query(homeworkCompletionTable).upsert(
    { userId, seasonNumber, episodeNumber, itemIndex },
    {
      conflictTarget: ['userId', 'seasonNumber', 'episodeNumber', 'itemIndex'],
      update: {},
      touch: true,
    },
  ),
)
// catch with isUniqueConstraintError(error) instead of error.code === 'P2002'
```

## Phase B checklist per file

1. Replace `import { prisma } from '#app/utils/prisma.server.ts'` with
   `import { db } from '#app/utils/db.server.ts'`.
2. Import tables from `#app/utils/db/schema.server.ts`.
3. Map operations using the table above.
4. Swap `P2002`/`P2025` checks for `isUniqueConstraintError` / `isNotFoundError`.
5. Run `npm run typecheck --workspace kentcdodds.com` + `npm run test:backend`.
6. Do **not** change Prisma migrations or remove `prisma` until Phase C.

## Tests

- Unit tests use `createMigratedMemoryDatabase()` to apply all Prisma SQL
  migrations to an in-memory better-sqlite3 DB (`test-helpers.server.ts`).
- Adapter tests use `SqliteExecutorDataTableAdapter` over a local executor to
  mirror the D1 code path without Cloudflare.
