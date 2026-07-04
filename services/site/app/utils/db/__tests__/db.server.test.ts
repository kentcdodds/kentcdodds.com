import BetterSqlite3 from 'better-sqlite3'
import { createDatabase } from '@remix-run/data-table'
import { afterEach, expect, test } from 'vitest'
import { getDatabaseClient } from '../../db.server.ts'
import { createSqliteExecutorDataTableAdapter } from '../d1-data-table-adapter.server.ts'
import { createBetterSqliteExecutor } from '../test-helpers.server.ts'
import { passkeyTable, userTable } from '../schema.server.ts'
import { createMigratedMemoryDatabase } from '../test-helpers.server.ts'
import { clearRuntimeBindingSource } from '../../runtime-bindings.server.ts'

afterEach(() => {
	clearRuntimeBindingSource()
})

test('getDatabaseClient uses better-sqlite3 when no D1 RPC binding is present', () => {
	const client = getDatabaseClient()
	expect(client.adapter.dialect).toBe('sqlite')
})

test('schema supports blob publicKey columns on migrated sqlite', async () => {
	const sqlite = createMigratedMemoryDatabase(BetterSqlite3)
	const db = createDatabase(
		createSqliteExecutorDataTableAdapter(createBetterSqliteExecutor(sqlite)),
		{
			now: () => new Date(),
		},
	)

	const user = await db.create(
		userTable,
		{
			email: 'passkey@example.com',
			firstName: 'Pass',
			team: 'BLUE',
			role: 'MEMBER',
		},
		{ returnRow: true },
	)

	const publicKey = new Uint8Array([1, 2, 3, 4])
	await db.create(passkeyTable, {
		id: 'passkey-test-id',
		aaguid: '00000000-0000-0000-0000-000000000000',
		publicKey,
		userId: user.id,
		webauthnUserId: 'webauthn-user',
		counter: 1,
		deviceType: 'singleDevice',
		backedUp: false,
	})

	const saved = await db.find(passkeyTable, 'passkey-test-id')
	expect(saved?.publicKey).toBeInstanceOf(Uint8Array)
	expect(saved?.counter).toBe(1)
})
