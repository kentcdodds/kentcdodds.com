import { createDatabase } from '@remix-run/data-table'
import { expect, test, vi } from 'vitest'
import { createSqliteExecutorDataTableAdapter } from '../db/d1-data-table-adapter.server.ts'
import { postReadTable, userTable } from '../db/schema.server.ts'
import {
	createMigratedMemoryDatabase,
	createNodeSqliteExecutor,
} from '../db/test-helpers.server.ts'

const harness = vi.hoisted(() => ({
	db: undefined as unknown,
}))

vi.mock('#app/utils/db.server.ts', () => ({
	get db() {
		return harness.db
	},
}))

import {
	migrateClientPostReadsToUser,
	postReadReaderId,
} from '../post-read-aggregates.server.ts'

function setupDb() {
	const sqlite = createMigratedMemoryDatabase()
	const db = createDatabase(
		createSqliteExecutorDataTableAdapter(createNodeSqliteExecutor(sqlite)),
		{ now: () => new Date('2026-09-04T00:00:00.000Z') },
	)
	harness.db = db
	return { sqlite, db }
}

test('login migrate does not insert a user reader when the client has no PostRead rows', async () => {
	const { sqlite, db } = setupDb()
	const user = await db.create(
		userTable,
		{
			email: 'new@example.com',
			firstName: 'New',
			team: 'BLUE',
			role: 'MEMBER',
		},
		{ returnRow: true },
	)

	await migrateClientPostReadsToUser({
		userId: user.id,
		clientId: 'anon-client',
	})

	const readerCount = sqlite
		.prepare(`SELECT COUNT(*) as count FROM "PostReadReader"`)
		.get() as { count: number }
	expect(readerCount.count).toBe(0)
	sqlite.close()
})

test('login migrate converts a client reader into a user reader when PostRead rows move', async () => {
	const { sqlite, db } = setupDb()
	const user = await db.create(
		userTable,
		{
			email: 'reader@example.com',
			firstName: 'Reader',
			team: 'RED',
			role: 'MEMBER',
		},
		{ returnRow: true },
	)
	await db.create(postReadTable, {
		clientId: 'anon-client',
		postSlug: 'popular-post',
	})
	sqlite
		.prepare(`INSERT INTO "PostReadReader" ("id", "kind") VALUES (?, ?)`)
		.run(postReadReaderId('client', 'anon-client'), 'client')

	await migrateClientPostReadsToUser({
		userId: user.id,
		clientId: 'anon-client',
	})

	const readers = sqlite
		.prepare(`SELECT "id", "kind" FROM "PostReadReader" ORDER BY "id"`)
		.all() as Array<{ id: string; kind: string }>
	const assigned = sqlite
		.prepare(`SELECT "userId", "clientId" FROM "PostRead" WHERE "postSlug" = ?`)
		.get('popular-post') as { userId: string | null; clientId: string | null }

	expect(readers).toEqual([
		{ id: postReadReaderId('user', user.id), kind: 'user' },
	])
	expect(assigned).toEqual({ userId: user.id, clientId: null })
	sqlite.close()
})
