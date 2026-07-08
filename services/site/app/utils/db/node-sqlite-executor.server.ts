import { type DatabaseSync, type SQLInputValue } from 'node:sqlite'
import { type D1SqlExecutor } from './d1-sql-executor.server.ts'
import { serializeSqlParams } from './row-serialization.server.ts'

function bindParams(params: readonly unknown[]) {
	return serializeSqlParams(params) as SQLInputValue[]
}

export function createNodeSqliteExecutor(
	database: DatabaseSync,
): D1SqlExecutor {
	return {
		supportsSqlTransactions: true,
		async query(sql, params = []) {
			const results = database
				.prepare(sql)
				.all(...bindParams(params)) as Array<Record<string, unknown>>
			return { results }
		},
		async run(sql, params = []) {
			const result = database.prepare(sql).run(...bindParams(params))
			return {
				meta: {
					changes: Number(result.changes),
					last_row_id: Number(result.lastInsertRowid),
				},
			}
		},
		async exec(sql) {
			database.exec(sql)
		},
	}
}
