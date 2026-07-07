import { DatabaseSync } from 'node:sqlite'
import { applySqlMigrations as applyMigrationsFromDisk } from '../../../scripts/lib/apply-sql-migrations.mjs'
import { createNodeSqliteExecutor } from './node-sqlite-executor.server.ts'

export { createNodeSqliteExecutor }

export function applySqlMigrations(database: DatabaseSync) {
	applyMigrationsFromDisk(database)
}

export function createMigratedMemoryDatabase() {
	const database = new DatabaseSync(':memory:')
	database.exec('PRAGMA foreign_keys = ON')
	applySqlMigrations(database)
	return database
}
