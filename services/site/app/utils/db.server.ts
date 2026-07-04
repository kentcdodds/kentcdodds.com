import { remember } from '@epic-web/remember'
import BetterSqlite3 from 'better-sqlite3'
import {
	createDatabase,
	type Database,
	type DatabaseAdapter,
	type DataManipulationRequest,
	type DataManipulationResult,
} from '@remix-run/data-table'
import { createSqliteDatabaseAdapter } from '@remix-run/data-table-sqlite'
import chalk from 'chalk'
import { getEnv } from '#app/utils/env.server.ts'
import { createSqliteExecutorDataTableAdapter } from './db/d1-data-table-adapter.server.ts'
import { getD1RpcBinding } from './db/d1-rpc-client.server.ts'
import {
	createRpcD1Executor,
	type D1SqlExecutor,
} from './db/d1-sql-executor.server.ts'

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

function compatSqliteAdapter(database: BetterSqlite3.Database): DatabaseAdapter {
	const adapter = createSqliteDatabaseAdapter(database)
	return new Proxy(adapter, {
		get(target, prop, receiver) {
			if (prop === 'executeScript') {
				return async (sql: string) => {
					database.exec(sql)
				}
			}
			const value = Reflect.get(target, prop, receiver)
			return typeof value === 'function' ? value.bind(target) : value
		},
	}) as unknown as DatabaseAdapter
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
		const sqlite = new BetterSqlite3(getSqliteFilePath(databaseUrl))
		sqlite.pragma('foreign_keys = ON')
		return sqlite
	})
}

function createNodeDatabase(): Database {
	const adapter = createLoggingAdapter(
		compatSqliteAdapter(getNodeSqliteDatabase()),
	)
	return createDatabase(adapter, { now: databaseNow })
}

function createRpcDatabase(executor: D1SqlExecutor): Database {
	const adapter = createSqliteExecutorDataTableAdapter(executor)
	return createDatabase(adapter, { now: databaseNow })
}

function getDatabaseClient(): Database {
	const rpc = getD1RpcBinding()
	if (rpc) {
		return remember('data-table-rpc', () =>
			createRpcDatabase(createRpcD1Executor(rpc)),
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
