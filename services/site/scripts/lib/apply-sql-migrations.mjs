import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const migrationsDir = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'../../migrations',
)

export function listMigrationFiles() {
	return fs
		.readdirSync(migrationsDir)
		.filter((name) => name.endsWith('.sql'))
		.sort()
}

export function applySqlMigrations(database) {
	for (const filename of listMigrationFiles()) {
		const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf8')
		if (!sql.trim()) {
			throw new Error(`Migration SQL file is empty: ${filename}`)
		}
		database.exec(sql)
	}
}

export function getDefaultSqliteDbPath() {
	return path.join(path.dirname(migrationsDir), '.data', 'sqlite.db')
}
