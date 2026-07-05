import BetterSqlite3 from 'better-sqlite3'
import { createDatabase } from '@remix-run/data-table'
import { expect, test } from 'vitest'
import { createSqliteExecutorDataTableAdapter } from '../d1-data-table-adapter.server.ts'
import { userTable } from '../schema.server.ts'
import { createMigratedMemoryDatabase, createBetterSqliteExecutor } from '../test-helpers.server.ts'

test('sqlite executor adapter reads and writes against real sql migrations', async () => {
	const sqlite = createMigratedMemoryDatabase(BetterSqlite3)
	const db = createDatabase(
		createSqliteExecutorDataTableAdapter(createBetterSqliteExecutor(sqlite)),
		{ now: () => new Date('2026-07-04T00:00:00.000Z') },
	)

	const created = await db.create(
		userTable,
		{
			email: 'adapter-test@example.com',
			firstName: 'Adapter',
			team: 'BLUE',
			role: 'MEMBER',
		},
		{ returnRow: true },
	)

	expect(created.id).toMatch(
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
	)
	expect(created.createdAt).toBeInstanceOf(Date)

	const found = await db.findOne(userTable, {
		where: { email: 'adapter-test@example.com' },
	})
	expect(found?.firstName).toBe('Adapter')
})
