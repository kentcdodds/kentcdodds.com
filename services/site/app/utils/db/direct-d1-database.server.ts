import { createDatabase, type Database } from '@remix-run/data-table'
import { createSqliteExecutorDataTableAdapter } from './d1-data-table-adapter.server.ts'
import {
	createDirectD1Executor,
	type D1DatabaseLike,
} from './d1-sql-executor.server.ts'

export function createDirectD1Database(database: D1DatabaseLike): Database {
	return createDatabase(
		createSqliteExecutorDataTableAdapter(createDirectD1Executor(database)),
		{ now: () => new Date() },
	)
}
