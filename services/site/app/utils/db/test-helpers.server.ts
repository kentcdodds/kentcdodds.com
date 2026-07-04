import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type BetterSqlite3 from 'better-sqlite3'
import { serializeSqlParams } from './row-serialization.server.ts'

const migrationsDir = path.resolve(
	fileURLToPath(new URL('../../../prisma/migrations', import.meta.url)),
)

export function applyPrismaMigrations(database: BetterSqlite3.Database) {
	const migrationDirs = fs
		.readdirSync(migrationsDir)
		.filter((entry) => fs.statSync(path.join(migrationsDir, entry)).isDirectory())
		.sort()

	for (const migrationDir of migrationDirs) {
		const sqlPath = path.join(migrationsDir, migrationDir, 'migration.sql')
		const sql = fs.readFileSync(sqlPath, 'utf8')
		database.exec(sql)
	}
}

export function createMigratedMemoryDatabase(
	BetterSqlite3Constructor: typeof BetterSqlite3,
) {
	const database = new BetterSqlite3Constructor(':memory:')
	database.pragma('foreign_keys = ON')
	applyPrismaMigrations(database)
	return database
}

export function createBetterSqliteExecutor(
	database: BetterSqlite3.Database,
) {
	return {
		async query(sql: string, params: readonly unknown[] = []) {
			const results = database
				.prepare(sql)
				.all(...serializeSqlParams(params)) as Array<Record<string, unknown>>
			return { results }
		},
		async run(sql: string, params: readonly unknown[] = []) {
			const result = database.prepare(sql).run(...serializeSqlParams(params))
			return {
				meta: {
					changes: result.changes,
					last_row_id: Number(result.lastInsertRowid),
				},
			}
		},
		async exec(sql: string) {
			database.exec(sql)
		},
	}
}
