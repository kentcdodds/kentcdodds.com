import type BetterSqlite3 from 'better-sqlite3'
import { applySqlMigrations as applyMigrationsFromDisk } from '../../../scripts/lib/apply-sql-migrations.mjs'
import { createBetterSqliteExecutor } from './better-sqlite-executor.server.ts'

export { createBetterSqliteExecutor }

export function applySqlMigrations(database: BetterSqlite3.Database) {
	applyMigrationsFromDisk(database)
}

export function createMigratedMemoryDatabase(
	BetterSqlite3Constructor: typeof BetterSqlite3,
) {
	const database = new BetterSqlite3Constructor(':memory:')
	database.pragma('foreign_keys = ON')
	applySqlMigrations(database)
	return database
}
