import { getTableColumns, getTableName } from '@remix-run/data-table'
import { expect, test } from 'vitest'
import {
	callKentCallerEpisodeTable,
	callKentEpisodeDraftTable,
	callTable,
	favoriteTable,
	homeworkCompletionTable,
	passkeyTable,
	passwordTable,
	postReadTable,
	sessionTable,
	userTable,
	verificationTable,
} from '../schema.server.ts'
import { createMigratedMemoryDatabase } from '../test-helpers.server.ts'

// Known limitation: this guard only checks table/column EXISTENCE, not
// column types, nullability, defaults, or indexes — weaker than the Prisma
// schema validation it replaced. Type/nullability drift between
// schema.server.ts and the SQL migrations will not be caught here; review
// both sides when changing either.
const appTables = [
	userTable,
	passwordTable,
	verificationTable,
	sessionTable,
	callTable,
	callKentEpisodeDraftTable,
	callKentCallerEpisodeTable,
	postReadTable,
	passkeyTable,
	favoriteTable,
	homeworkCompletionTable,
] as const

test('migrated sqlite schema matches data-table definitions', () => {
	const sqlite = createMigratedMemoryDatabase()

	for (const table of appTables) {
		const tableName = getTableName(table)
		const tableRow = sqlite
			.prepare(
				`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
			)
			.get(tableName) as { name: string } | undefined
		expect(tableRow, `missing table ${tableName}`).toBeTruthy()

		const columnNames = (
			sqlite
				.prepare(`PRAGMA table_info("${tableName}")`)
				.all() as Array<{ name: string }>
		).map((column) => column.name)

		for (const columnName of Object.keys(getTableColumns(table))) {
			expect(columnNames, `${tableName}.${columnName}`).toContain(columnName)
		}
	}

	sqlite.close()
})
