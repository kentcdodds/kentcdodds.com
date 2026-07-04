import {
	deserializeSqlRow,
	deserializeSqlRows,
	serializeSqlParams,
} from './row-serialization.server.ts'
import {
	getRequestD1Bookmark,
	getRequestD1Session,
	setRequestD1Bookmark,
} from './d1-session-request.server.ts'

export type D1Meta = {
	changes?: number
	last_row_id?: number
	duration?: number
	served_by_region?: string
	served_by_colo?: string
	served_by_primary?: boolean
}

export type D1StatementResult = {
	results?: Array<Record<string, unknown>>
	meta?: D1Meta
	bookmark?: string | null
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
	withSession?(
		constraintOrBookmark?: string,
	): D1DatabaseSessionLike
}

export type D1DatabaseSessionLike = {
	prepare(query: string): D1PreparedStatement
	batch(statements: D1PreparedStatement[]): Promise<D1StatementResult[]>
	getBookmark(): string | null
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

export type D1RpcSessionBinding = {
	query(
		sql: string,
		params?: readonly unknown[],
	): Promise<D1StatementResult>
	run(sql: string, params?: readonly unknown[]): Promise<D1StatementResult>
	batch(
		statements: ReadonlyArray<{ sql: string; params?: readonly unknown[] }>,
	): Promise<D1StatementResult[]>
	getBookmark(): string | null | Promise<string | null>
}

export type D1RpcBinding = {
	sessionQuery(
		bookmark: string,
		sql: string,
		params?: readonly unknown[],
	): Promise<D1StatementResult>
	sessionRun(
		bookmark: string,
		sql: string,
		params?: readonly unknown[],
	): Promise<D1StatementResult>
	sessionBatch(
		bookmark: string,
		statements: ReadonlyArray<{ sql: string; params?: readonly unknown[] }>,
	): Promise<D1StatementResult[]>
}

function mapStatementResult(result: {
	results?: Array<Record<string, unknown>>
	meta?: D1Meta
}): D1StatementResult {
	return {
		results: deserializeSqlRows(result.results ?? []),
		meta: result.meta,
	}
}

export function createDirectSessionBinding(
	session: D1DatabaseSessionLike,
): D1RpcSessionBinding {
	return {
		async query(sql, params = []) {
			const bound = session.prepare(sql).bind(...serializeSqlParams(params))
			const result = await bound.all<Record<string, unknown>>()
			return mapStatementResult(result)
		},
		async run(sql, params = []) {
			const bound = session.prepare(sql).bind(...serializeSqlParams(params))
			const result = await bound.run<Record<string, unknown>>()
			return mapStatementResult(result)
		},
		async batch(statements) {
			const prepared = statements.map((statement) =>
				session.prepare(statement.sql).bind(
					...serializeSqlParams(statement.params ?? []),
				),
			)
			const results = await session.batch(prepared)
			return results.map((result) =>
				mapStatementResult({
					results: (result.results ?? []) as Array<Record<string, unknown>>,
					meta: result.meta,
				}),
			)
		},
		getBookmark() {
			return session.getBookmark()
		},
	}
}

export function createDirectD1Executor(database: D1DatabaseLike): D1SqlExecutor {
	return {
		supportsSqlTransactions: false,
		async query(sql, params = []) {
			const bound = database.prepare(sql).bind(...serializeSqlParams(params))
			const result = await bound.all<Record<string, unknown>>()
			return mapStatementResult(result)
		},
		async run(sql, params = []) {
			const bound = database.prepare(sql).bind(...serializeSqlParams(params))
			const result = await bound.run<Record<string, unknown>>()
			return mapStatementResult(result)
		},
		async exec(sql) {
			await database.exec(sql)
		},
	}
}

export function createSessionD1Executor(
	session: D1RpcSessionBinding,
): D1SqlExecutor {
	return {
		supportsSqlTransactions: false,
		async query(sql, params = []) {
			const result = await session.query(sql, serializeSqlParams(params))
			return {
				results: deserializeSqlRows(result.results ?? []),
				meta: result.meta,
			}
		},
		async run(sql, params = []) {
			const result = await session.run(sql, serializeSqlParams(params))
			return {
				results: deserializeSqlRows(result.results ?? []),
				meta: result.meta,
			}
		},
		async exec(sql) {
			await session.run(sql)
		},
	}
}

export function createRpcD1Executor(
	rpc: D1RpcBinding,
	resolveSession?: () => D1RpcSessionBinding | undefined,
): D1SqlExecutor {
	return {
		supportsSqlTransactions: false,
		async query(sql, params = []) {
			const session = resolveSession?.() ?? getRequestD1Session()
			if (session) {
				const result = await session.query(sql, serializeSqlParams(params))
				if (result.bookmark) setRequestD1Bookmark(result.bookmark)
				return {
					results: deserializeSqlRows(result.results ?? []),
					meta: result.meta,
				}
			}
			const bookmark = getRequestD1Bookmark() ?? 'first-unconstrained'
			const result = await rpc.sessionQuery(
				bookmark,
				sql,
				serializeSqlParams(params),
			)
			if (result.bookmark) setRequestD1Bookmark(result.bookmark)
			return {
				results: deserializeSqlRows(result.results ?? []),
				meta: result.meta,
			}
		},
		async run(sql, params = []) {
			const session = resolveSession?.() ?? getRequestD1Session()
			if (session) {
				const result = await session.run(sql, serializeSqlParams(params))
				if (result.bookmark) setRequestD1Bookmark(result.bookmark)
				return {
					results: deserializeSqlRows(result.results ?? []),
					meta: result.meta,
				}
			}
			const bookmark = getRequestD1Bookmark() ?? 'first-unconstrained'
			const result = await rpc.sessionRun(
				bookmark,
				sql,
				serializeSqlParams(params),
			)
			if (result.bookmark) setRequestD1Bookmark(result.bookmark)
			return {
				results: deserializeSqlRows(result.results ?? []),
				meta: result.meta,
			}
		},
		async exec(sql) {
			const session = resolveSession?.() ?? getRequestD1Session()
			if (session) {
				await session.run(sql)
				return
			}
			const bookmark = getRequestD1Bookmark() ?? 'first-unconstrained'
			const result = await rpc.sessionRun(bookmark, sql)
			if (result.bookmark) setRequestD1Bookmark(result.bookmark)
		},
	}
}

export function deserializeRpcRow(row: Record<string, unknown>) {
	return deserializeSqlRow(row)
}
