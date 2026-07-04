import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type BetterSqlite3 from 'better-sqlite3'
import { createBetterSqliteExecutor } from './better-sqlite-executor.server.ts'

export { createBetterSqliteExecutor }

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
