import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { afterEach, expect, test } from 'vitest'
import { getPrismaAdapter } from '../prisma-adapter.server.ts'
import { clearRuntimeBindingSource } from '../runtime-bindings.server.ts'

afterEach(() => {
	clearRuntimeBindingSource()
})

test('uses file SQLite when no Prisma RPC binding is present', () => {
	const adapter = getPrismaAdapter({
		databaseUrl: 'file:./prisma/sqlite.db',
	})

	expect(adapter).toBeInstanceOf(PrismaBetterSqlite3)
})
