import { type SqlStatement, sql } from '@remix-run/data-table'
import { recordD1QueryMeta } from './d1-request-stats.server.ts'
import {
	getRequestD1Bookmark,
	getRequestD1Session,
	setRequestD1Bookmark,
} from './d1-session-request.server.ts'
import { getD1RpcBinding } from './d1-rpc-client.server.ts'

type RawSqlInput = SqlStatement | { sql: string; params?: readonly unknown[] }

function normalizeRawSqlInput(statement: RawSqlInput) {
	if (typeof statement === 'object' && statement !== null && 'text' in statement) {
		return {
			sql: statement.text,
			params: [...statement.values],
		}
	}
	return {
		sql: statement.sql,
		params: statement.params ? [...statement.params] : [],
	}
}

export type RawSqlBatchResult = {
	rows?: Array<Record<string, unknown>>
}

export async function batchExecRawSql(
	statements: ReadonlyArray<RawSqlInput>,
): Promise<Array<RawSqlBatchResult>> {
	const normalized = statements.map(normalizeRawSqlInput)
	const session = getRequestD1Session()
	if (session?.batch) {
		const results = await session.batch(normalized)
		for (const result of results) {
			recordD1QueryMeta(result.meta)
		}
		return results.map((result) => ({
			rows: result.results ?? [],
		}))
	}

	const rpc = getD1RpcBinding()
	if (rpc) {
		const bookmark = getRequestD1Bookmark()
		const results =
			bookmark && typeof rpc.sessionBatch === 'function'
				? await rpc.sessionBatch(bookmark, normalized)
				: await rpc.batch(normalized)
		const lastBookmark = results.at(-1)?.bookmark
		if (lastBookmark) setRequestD1Bookmark(lastBookmark)
		for (const result of results) {
			recordD1QueryMeta(result.meta)
		}
		return results.map((result) => ({
			rows: result.results ?? [],
		}))
	}

	const results: Array<RawSqlBatchResult> = []
	for (const statement of normalized) {
		throw new Error('batchExecRawSql requires a D1 session or RPC binding')
	}
	return results
}

export { sql }
