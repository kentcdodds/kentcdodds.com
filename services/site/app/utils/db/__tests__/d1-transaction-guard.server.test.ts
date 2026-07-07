import { DatabaseSync } from 'node:sqlite'
import { expect, test } from 'vitest'
import { createSqliteExecutorDataTableAdapter } from '../d1-data-table-adapter.server.ts'
import {
	createDirectD1Executor,
	createRpcD1Executor,
	type D1RpcBinding,
} from '../d1-sql-executor.server.ts'
import { createNodeSqliteExecutor } from '../test-helpers.server.ts'

test('D1 executors reject SQL transactions in the data-table adapter', async () => {
	// A silent no-op transaction would lose atomicity (rollback does nothing
	// on D1), so beginTransaction must fail loudly instead.
	const directAdapter = createSqliteExecutorDataTableAdapter(
		createDirectD1Executor({
			prepare: () => {
				throw new Error('prepare should not be called')
			},
			exec: async () => {},
			batch: async () => [],
		}),
	)
	await expect(directAdapter.beginTransaction()).rejects.toThrow(
		/db\.transaction is not supported on D1/,
	)

	const rpcAdapter = createSqliteExecutorDataTableAdapter(
		createRpcD1Executor({
			sessionQuery: async () => ({ results: [] }),
			sessionRun: async () => ({ results: [] }),
			sessionBatch: async () => [],
		} satisfies D1RpcBinding),
	)
	await expect(rpcAdapter.beginTransaction()).rejects.toThrow(
		/db\.transaction is not supported on D1/,
	)
})

test('node:sqlite executor keeps real SQL transactions', async () => {
	const sqlite = new DatabaseSync(':memory:')
	sqlite.exec('create table items (id integer primary key, value text)')
	const adapter = createSqliteExecutorDataTableAdapter(
		createNodeSqliteExecutor(sqlite),
	)
	const token = await adapter.beginTransaction()
	sqlite.prepare('insert into items (value) values (?)').run('inside-tx')
	await adapter.rollbackTransaction(token)
	const count = sqlite.prepare('select count(*) as count from items').get() as {
		count: number
	}
	expect(count.count).toBe(0)
})
