#!/usr/bin/env node
/**
 * Reset a SQLite database by applying committed SQL migrations.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import BetterSqlite3 from 'better-sqlite3'
import {
	applySqlMigrations,
	getDefaultSqliteDbPath,
} from '../../site/scripts/lib/apply-sql-migrations.mjs'

export function resetSqliteDatabase(dbPath = getDefaultSqliteDbPath()) {
	fs.mkdirSync(path.dirname(dbPath), { recursive: true })
	if (fs.existsSync(dbPath)) {
		fs.unlinkSync(dbPath)
	}
	const db = new BetterSqlite3(dbPath)
	db.pragma('foreign_keys = ON')
	applySqlMigrations(db)
	db.close()
	return dbPath
}

function main() {
	const dbPath = process.argv[2]
		? path.resolve(process.argv[2])
		: getDefaultSqliteDbPath()
	const resolved = resetSqliteDatabase(dbPath)
	console.log(`Reset SQLite database at ${resolved}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main()
}
