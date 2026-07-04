import BetterSqlite3 from 'better-sqlite3'
import { expect, test } from 'vitest'
import { createSqliteExecutorDataTableAdapter } from '../d1-data-table-adapter.server.ts'
import {
	createDirectD1Executor,
	createRpcD1Executor,
	type D1RpcBinding,
} from '../d1-sql-executor.server.ts'
import { createBetterSqliteExecutor } from '../test-helpers.server.ts'

test('D1 executors disable SQL transactions in the data-table adapter', async () => {
	const directAdapter = createSqliteExecutorDataTableAdapter(
		createDirectD1Executor({
			prepare: () => {
				throw new Error('prepare should not be called')
			},
			exec: async () => {},
			batch: async () => [],
		}),
	)
	const directToken = await directAdapter.beginTransaction()
	await directAdapter.commitTransaction(directToken)

	const rpcAdapter = createSqliteExecutorDataTableAdapter(
		createRpcD1Executor({
			sessionQuery: async () => ({ results: [] }),
			sessionRun: async () => ({ results: [] }),
			sessionBatch: async () => [],
		} satisfies D1RpcBinding),
	)
	const rpcToken = await rpcAdapter.beginTransaction()
	await rpcAdapter.commitTransaction(rpcToken)
})

test('better-sqlite3 executor keeps real SQL transactions', async () => {
	const sqlite = new BetterSqlite3(':memory:')
	sqlite.exec('create table items (id integer primary key, value text)')
	const adapter = createSqliteExecutorDataTableAdapter(
		createBetterSqliteExecutor(sqlite),
	)
	const token = await adapter.beginTransaction()
	sqlite.prepare('insert into items (value) values (?)').run('inside-tx')
	await adapter.rollbackTransaction(token)
	const count = sqlite.prepare('select count(*) as count from items').get() as {
		count: number
	}
	expect(count.count).toBe(0)
})
