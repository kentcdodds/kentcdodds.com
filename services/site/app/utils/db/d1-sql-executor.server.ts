import {
	deserializeSqlRow,
	deserializeSqlRows,
	serializeSqlParams,
} from './row-serialization.server.ts'

export type D1Meta = {
	changes?: number
	last_row_id?: number
	duration?: number
}

export type D1StatementResult = {
	results?: Array<Record<string, unknown>>
	meta?: D1Meta
}

export type D1PreparedStatement = {
	bind(...values: unknown[]): D1PreparedStatement
	all<T = Record<string, unknown>>(): Promise<{
		results?: Array<T>
		meta?: D1Meta
	}>
	run<T = Record<string, unknown>>(): Promise<{
		results?: Array<T>
		meta?: D1Meta
	}>
}

export type D1DatabaseLike = {
	prepare(query: string): D1PreparedStatement
	exec(query: string): Promise<unknown>
	batch(statements: D1PreparedStatement[]): Promise<D1StatementResult[]>
}

/**
 * Minimal SQL executor used by the sqlite/D1 data-table adapter.
 * Implemented by direct D1 access (parent worker) and by D1_RPC (dynamic worker).
 */
export type D1SqlExecutor = {
	query(sql: string, params?: readonly unknown[]): Promise<D1StatementResult>
	run(sql: string, params?: readonly unknown[]): Promise<D1StatementResult>
	exec(sql: string): Promise<void>
	/**
	 * D1 forbids SQL `BEGIN`/`COMMIT`. When false, the data-table adapter runs
	 * statements immediately without wrapping them in SQL transactions.
	 */
	supportsSqlTransactions?: boolean
}

export type D1RpcBinding = {
	query(
		sql: string,
		params?: readonly unknown[],
	): Promise<D1StatementResult>
	run(sql: string, params?: readonly unknown[]): Promise<D1StatementResult>
	batch(
		statements: ReadonlyArray<{ sql: string; params?: readonly unknown[] }>,
	): Promise<D1StatementResult[]>
}

export function createDirectD1Executor(database: D1DatabaseLike): D1SqlExecutor {
	return {
		supportsSqlTransactions: false,
		async query(sql, params = []) {
			const bound = database.prepare(sql).bind(...serializeSqlParams(params))
			const result = await bound.all<Record<string, unknown>>()
			return {
				results: deserializeSqlRows(result.results ?? []),
				meta: result.meta,
			}
		},
		async run(sql, params = []) {
			const bound = database.prepare(sql).bind(...serializeSqlParams(params))
			const result = await bound.run<Record<string, unknown>>()
			return {
				results: deserializeSqlRows(result.results ?? []),
				meta: result.meta,
			}
		},
		async exec(sql) {
			await database.exec(sql)
		},
	}
}

export function createRpcD1Executor(rpc: D1RpcBinding): D1SqlExecutor {
	return {
		supportsSqlTransactions: false,
		async query(sql, params = []) {
			const result = await rpc.query(sql, serializeSqlParams(params))
			return {
				results: deserializeSqlRows(result.results ?? []),
				meta: result.meta,
			}
		},
		async run(sql, params = []) {
			const result = await rpc.run(sql, serializeSqlParams(params))
			return {
				results: deserializeSqlRows(result.results ?? []),
				meta: result.meta,
			}
		},
		async exec(sql) {
			await rpc.run(sql)
		},
	}
}

export function deserializeRpcRow(row: Record<string, unknown>) {
	return deserializeSqlRow(row)
}
