import { createDatabase, query } from '@remix-run/data-table'
import { expect, test } from 'vitest'
import { createSqliteExecutorDataTableAdapter } from '../d1-data-table-adapter.server.ts'
import { passwordTable, userTable } from '../schema.server.ts'
import {
	createMigratedMemoryDatabase,
	createNodeSqliteExecutor,
} from '../test-helpers.server.ts'

test('upsert binds insert values before on-conflict update values', () => {
	const adapter = createSqliteExecutorDataTableAdapter(
		createNodeSqliteExecutor(createMigratedMemoryDatabase()),
	)
	const compiled = adapter.compileSql({
		kind: 'upsert',
		table: passwordTable,
		values: {
			userId: '784535d3-6727-4062-94ef-ede66a7c8c63',
			hash: 'hash-insert',
			createdAt: new Date('2026-07-21T12:00:00.000Z'),
			updatedAt: new Date('2026-07-21T12:00:00.000Z'),
		},
		conflictTarget: ['userId'],
		update: {
			hash: 'hash-update',
			updatedAt: new Date('2026-07-21T13:00:00.000Z'),
		},
	})

	expect(compiled).toHaveLength(1)
	expect(compiled[0]?.text).toBe(
		'insert into "Password" ("userId", "hash", "createdAt", "updatedAt") values (?, ?, ?, ?) on conflict ("userId") do update set "hash" = ?, "updatedAt" = ?',
	)
	expect(compiled[0]?.values).toEqual([
		'784535d3-6727-4062-94ef-ede66a7c8c63',
		'hash-insert',
		new Date('2026-07-21T12:00:00.000Z'),
		new Date('2026-07-21T12:00:00.000Z'),
		'hash-update',
		new Date('2026-07-21T13:00:00.000Z'),
	])
})

test('password upsert inserts a Password row for users without one', async () => {
	const sqlite = createMigratedMemoryDatabase()
	const db = createDatabase(
		createSqliteExecutorDataTableAdapter(createNodeSqliteExecutor(sqlite)),
		{ now: () => new Date('2026-07-21T12:00:00.000Z') },
	)

	const user = await db.create(
		userTable,
		{
			email: 'password-upsert@example.com',
			firstName: 'Damien',
			team: 'BLUE',
			role: 'MEMBER',
		},
		{ returnRow: true },
	)

	await db.exec(
		query(passwordTable).upsert(
			{ userId: user.id, hash: 'hash-1' },
			{
				conflictTarget: ['userId'],
				update: { hash: 'hash-1' },
				touch: true,
			},
		),
	)

	const row = await db.find(passwordTable, user.id)
	expect(row?.hash).toBe('hash-1')
	expect(row?.createdAt).toBeInstanceOf(Date)
	expect(row?.updatedAt).toBeInstanceOf(Date)
})

test('password upsert updates an existing Password row', async () => {
	const sqlite = createMigratedMemoryDatabase()
	const db = createDatabase(
		createSqliteExecutorDataTableAdapter(createNodeSqliteExecutor(sqlite)),
		{ now: () => new Date('2026-07-21T12:00:00.000Z') },
	)

	const user = await db.create(
		userTable,
		{
			email: 'password-update@example.com',
			firstName: 'Pat',
			team: 'RED',
			role: 'MEMBER',
		},
		{ returnRow: true },
	)
	await db.create(passwordTable, { userId: user.id, hash: 'old-hash' })

	await db.exec(
		query(passwordTable).upsert(
			{ userId: user.id, hash: 'new-hash' },
			{
				conflictTarget: ['userId'],
				update: { hash: 'new-hash' },
				touch: true,
			},
		),
	)

	expect(await db.find(passwordTable, user.id)).toMatchObject({
		hash: 'new-hash',
	})
})
