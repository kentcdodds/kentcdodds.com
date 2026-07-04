import { WorkerEntrypoint } from 'cloudflare:workers'
import {
	deserializeSqlRows,
	serializeSqlParams,
} from '../../../site/app/utils/db/row-serialization.server.ts'
import type { D1StatementResult } from '../../../site/app/utils/db/d1-sql-executor.server.ts'
import type { ParentWorkerEnv } from './types.ts'

export class D1Rpc extends WorkerEntrypoint<ParentWorkerEnv> {
	async query(sql: string, params: readonly unknown[] = []) {
		const result = await this.env.APP_DB.prepare(sql)
			.bind(...serializeSqlParams(params))
			.all<Record<string, unknown>>()
		return {
			results: deserializeSqlRows(result.results ?? []),
			meta: result.meta,
		} satisfies D1StatementResult
	}

	async run(sql: string, params: readonly unknown[] = []) {
		const result = await this.env.APP_DB.prepare(sql)
			.bind(...serializeSqlParams(params))
			.run<Record<string, unknown>>()
		return {
			results: deserializeSqlRows(result.results ?? []),
			meta: result.meta,
		} satisfies D1StatementResult
	}

	async batch(
		statements: ReadonlyArray<{ sql: string; params?: readonly unknown[] }>,
	) {
		const prepared = statements.map((statement) =>
			this.env.APP_DB.prepare(statement.sql).bind(
				...serializeSqlParams(statement.params ?? []),
			),
		)
		const results = await this.env.APP_DB.batch(prepared)
		return results.map((result) => ({
			results: deserializeSqlRows(
				(result.results ?? []) as Array<Record<string, unknown>>,
			),
			meta: result.meta,
		}))
	}
}
