import type BetterSqlite3 from 'better-sqlite3'
import { type D1SqlExecutor } from './d1-sql-executor.server.ts'
import { serializeSqlParams } from './row-serialization.server.ts'

export function createBetterSqliteExecutor(
	database: BetterSqlite3.Database,
): D1SqlExecutor {
	return {
		async query(sql, params = []) {
			const results = database
				.prepare(sql)
				.all(...serializeSqlParams(params)) as Array<Record<string, unknown>>
			return { results }
		},
		async run(sql, params = []) {
			const result = database.prepare(sql).run(...serializeSqlParams(params))
			return {
				meta: {
					changes: result.changes,
					last_row_id: Number(result.lastInsertRowid),
				},
			}
		},
		async exec(sql) {
			database.exec(sql)
		},
	}
}
