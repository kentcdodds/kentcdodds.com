import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaD1 } from '@prisma/adapter-d1'
import { afterEach, expect, test, vi } from 'vitest'
import { getPrismaAdapter } from '../prisma-adapter.server.ts'
import {
	clearRuntimeBindingSource,
	setRuntimeBindingSource,
} from '../runtime-bindings.server.ts'

afterEach(() => {
	clearRuntimeBindingSource()
})

test('uses file SQLite when no D1 binding is present', () => {
	const adapter = getPrismaAdapter({
		appDbBinding: undefined,
		databaseUrl: 'file:./prisma/sqlite.db',
	})

	expect(adapter).toBeInstanceOf(PrismaBetterSqlite3)
})

test('uses D1 when APP_DB has the D1 binding shape', () => {
	const d1Binding = {
		prepare: vi.fn(),
		batch: vi.fn(),
		exec: vi.fn(),
		dump: vi.fn(),
		withSession: vi.fn(),
	}
	setRuntimeBindingSource({ APP_DB: d1Binding })

	const adapter = getPrismaAdapter()

	expect(adapter).toBeInstanceOf(PrismaD1)
})
