import { RpcTarget, WorkerEntrypoint } from 'cloudflare:workers'
import {
	deserializeSqlRows,
	serializeSqlParams,
} from '../../../site/app/utils/db/row-serialization.server.ts'
import type {
	D1DatabaseSessionLike,
	D1Meta,
	D1StatementResult,
} from '../../../site/app/utils/db/d1-sql-executor.server.ts'
import type { ParentWorkerEnv } from './types.ts'

function mapSessionResult(
	result: {
		results?: Array<Record<string, unknown>>
		meta?: D1Meta
	},
	session: D1DatabaseSessionLike,
): D1StatementResult {
	return {
		results: deserializeSqlRows(result.results ?? []),
		meta: result.meta,
		bookmark: session.getBookmark(),
	}
}

export class D1RpcSession extends RpcTarget {
	#session: D1DatabaseSessionLike

	constructor(session: D1DatabaseSessionLike) {
		super()
		this.#session = session
	}

	async query(sql: string, params: readonly unknown[] = []) {
		const result = await this.#session
			.prepare(sql)
			.bind(...serializeSqlParams(params))
			.all<Record<string, unknown>>()
		return mapSessionResult(result, this.#session)
	}

	async run(sql: string, params: readonly unknown[] = []) {
		const result = await this.#session
			.prepare(sql)
			.bind(...serializeSqlParams(params))
			.run<Record<string, unknown>>()
		return mapSessionResult(result, this.#session)
	}

	async batch(
		statements: ReadonlyArray<{ sql: string; params?: readonly unknown[] }>,
	) {
		const prepared = statements.map((statement) =>
			this.#session.prepare(statement.sql).bind(
				...serializeSqlParams(statement.params ?? []),
			),
		)
		const results = await this.#session.batch(prepared)
		const bookmark = this.#session.getBookmark()
		return results.map((result) => ({
			results: deserializeSqlRows(
				(result.results ?? []) as Array<Record<string, unknown>>,
			),
			meta: result.meta,
			bookmark,
		}))
	}

	getBookmark(): Promise<string | null> {
		return Promise.resolve(this.#session.getBookmark())
	}
}

export class D1Rpc extends WorkerEntrypoint<ParentWorkerEnv> {
	createSession(bookmark?: string) {
		const session = this.env.APP_DB.withSession(bookmark ?? 'first-unconstrained')
		return new D1RpcSession(session)
	}

	async query(sql: string, params: readonly unknown[] = []) {
		const result = await this.env.APP_DB.prepare(sql)
			.bind(...serializeSqlParams(params))
			.all<Record<string, unknown>>()
		return {
			results: deserializeSqlRows(result.results ?? []),
			meta: result.meta,
		} satisfies D1StatementResult
	}

	async sessionQuery(
		bookmark: string,
		sql: string,
		params: readonly unknown[] = [],
	) {
		const session = this.env.APP_DB.withSession(bookmark)
		const result = await session
			.prepare(sql)
			.bind(...serializeSqlParams(params))
			.all<Record<string, unknown>>()
		return mapSessionResult(result, session)
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

	async sessionRun(
		bookmark: string,
		sql: string,
		params: readonly unknown[] = [],
	) {
		const session = this.env.APP_DB.withSession(bookmark)
		const result = await session
			.prepare(sql)
			.bind(...serializeSqlParams(params))
			.run<Record<string, unknown>>()
		return mapSessionResult(result, session)
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

	async sessionBatch(
		bookmark: string,
		statements: ReadonlyArray<{ sql: string; params?: readonly unknown[] }>,
	) {
		const session = this.env.APP_DB.withSession(bookmark)
		const prepared = statements.map((statement) =>
			session.prepare(statement.sql).bind(
				...serializeSqlParams(statement.params ?? []),
			),
		)
		const results = await session.batch(prepared)
		const nextBookmark = session.getBookmark()
		return results.map((result) => ({
			results: deserializeSqlRows(
				(result.results ?? []) as Array<Record<string, unknown>>,
			),
			meta: result.meta,
			bookmark: nextBookmark,
		}))
	}
}
