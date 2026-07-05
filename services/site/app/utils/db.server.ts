import { remember } from '@epic-web/remember'
import BetterSqlite3 from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import {
	createDatabase,
	type Database,
	type DatabaseAdapter,
	type DataManipulationRequest,
	type DataManipulationResult,
} from '@remix-run/data-table'
import chalk from 'chalk'
import { getEnv } from '#app/utils/env.server.ts'
import { createSqliteExecutorDataTableAdapter } from './db/d1-data-table-adapter.server.ts'
import { createBetterSqliteExecutor } from './db/better-sqlite-executor.server.ts'
import { recordD1QueryMeta } from './db/d1-request-stats.server.ts'
import { getD1RpcBinding } from './db/d1-rpc-client.server.ts'
import { getRequestD1Session } from './db/d1-session-request.server.ts'
import {
	createDirectD1Executor,
	createRpcD1Executor,
	createSessionD1Executor,
	type D1DatabaseLike,
	type D1SqlExecutor,
} from './db/d1-sql-executor.server.ts'
import { getRuntimeBinding } from './runtime-bindings.server.ts'

export {
	isNotFoundError,
	isUniqueConstraintError,
} from './db/errors.server.ts'

const logThreshold = 500

function databaseNow() {
	return new Date()
}

function createLoggingAdapter(adapter: DatabaseAdapter): DatabaseAdapter {
	return new Proxy(adapter, {
		get(target, prop, receiver) {
			if (prop === 'execute') {
				return async (request: DataManipulationRequest) => {
					const startedAt = performance.now()
					const result = await target.execute(request)
					const duration = performance.now() - startedAt
					if (duration >= logThreshold) {
						const statements = target.compileSql(request.operation)
						const sql = statements
							.map((statement) => statement.text)
							.join('; ')
						const color =
							duration < logThreshold * 1.1
								? 'green'
								: duration < logThreshold * 1.2
									? 'blue'
									: duration < logThreshold * 1.3
										? 'yellow'
										: duration < logThreshold * 1.4
											? 'redBright'
											: 'red'
						const dur = chalk[color](`${Math.round(duration)}ms`)
						console.info(`data-table:query - ${dur} - ${sql}`)
					}
					return result
				}
			}
			const value = Reflect.get(target, prop, receiver)
			return typeof value === 'function' ? value.bind(target) : value
		},
	}) as DatabaseAdapter
}

function createStatsRecordingExecutor(executor: D1SqlExecutor): D1SqlExecutor {
	return {
		supportsSqlTransactions: executor.supportsSqlTransactions,
		async query(sql, params = []) {
			const result = await executor.query(sql, params)
			recordD1QueryMeta(result.meta)
			return result
		},
		async run(sql, params = []) {
			const result = await executor.run(sql, params)
			recordD1QueryMeta(result.meta)
			return result
		},
		async exec(sql) {
			await executor.exec(sql)
		},
	}
}

function getSqliteFilePath(databaseUrl: string) {
	if (databaseUrl.startsWith('file:')) {
		return databaseUrl.slice('file:'.length)
	}
	return databaseUrl
}

function getNodeSqliteDatabase() {
	const databaseUrl = getEnv().DATABASE_URL
	return remember('better-sqlite3-db', () => {
		const filePath = getSqliteFilePath(databaseUrl)
		fs.mkdirSync(path.dirname(filePath), { recursive: true })
		const sqlite = new BetterSqlite3(filePath)
		sqlite.pragma('foreign_keys = ON')
		return sqlite
	})
}

function createNodeDatabase(): Database {
	const adapter = createLoggingAdapter(
		createSqliteExecutorDataTableAdapter(
			createBetterSqliteExecutor(getNodeSqliteDatabase()),
		),
	)
	return createDatabase(adapter, { now: databaseNow })
}

function createRpcDatabase(executor: D1SqlExecutor): Database {
	const adapter = createSqliteExecutorDataTableAdapter(
		createStatsRecordingExecutor(executor),
	)
	return createDatabase(adapter, { now: databaseNow })
}

function isDirectD1Database(value: unknown): value is D1DatabaseLike {
	if (!value || typeof value !== 'object') return false
	const database = value as Record<string, unknown>
	return (
		typeof database.prepare === 'function' &&
		typeof database.batch === 'function'
	)
}

function getDirectD1Binding(): D1DatabaseLike | undefined {
	const binding = getRuntimeBinding('APP_DB')
	return isDirectD1Database(binding) ? binding : undefined
}

function createDirectDatabase(executor: D1SqlExecutor): Database {
	const adapter = createLoggingAdapter(
		createSqliteExecutorDataTableAdapter(createStatsRecordingExecutor(executor)),
	)
	return createDatabase(adapter, { now: databaseNow })
}

function resolveRequestScopedExecutor(
	fallback: D1SqlExecutor,
): D1SqlExecutor {
	const session = getRequestD1Session()
	if (!session) return fallback
	return createSessionD1Executor(session)
}

function getDatabaseClient(): Database {
	const rpc = getD1RpcBinding()
	if (rpc) {
		return remember('data-table-rpc', () =>
			createRpcDatabase(
				createRpcD1Executor(rpc, () => getRequestD1Session()),
			),
		)
	}

	const directD1 = getDirectD1Binding()
	if (directD1) {
		const directExecutor = createDirectD1Executor(directD1)
		return remember('data-table-direct-d1', () =>
			createDirectDatabase(
				new Proxy(directExecutor, {
					get(target, prop, receiver) {
						const scoped = resolveRequestScopedExecutor(target)
						const value = Reflect.get(scoped, prop, receiver)
						return typeof value === 'function'
							? value.bind(scoped)
							: value
					},
				}),
			),
		)
	}

	return remember('data-table-node', createNodeDatabase)
}

const db = new Proxy({} as Database, {
	get(_target, prop, receiver) {
		const client = getDatabaseClient() as object
		const value = Reflect.get(client, prop, receiver)
		return typeof value === 'function' ? value.bind(client) : value
	},
})

export { db, getDatabaseClient }
