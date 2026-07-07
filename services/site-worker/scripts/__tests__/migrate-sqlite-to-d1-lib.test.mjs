import { describe, expect, it } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import {
	buildInsertStatement,
	buildSinceWhereClause,
	chunkRowsForInsert,
	formatSqlLiteral,
	groupStatementsIntoFiles,
	hashEmail,
	MIGRATION_TABLES,
	readTableRows,
	TABLES_WITH_UPDATED_AT,
} from '../migrate-sqlite-to-d1-lib.mjs'

describe('formatSqlLiteral', () => {
	it('escapes single quotes and newlines in strings', () => {
		expect(formatSqlLiteral("O'Reilly\nline2")).toBe("'O''Reilly\nline2'")
	})

	it('formats NULL', () => {
		expect(formatSqlLiteral(null)).toBe('NULL')
		expect(formatSqlLiteral(undefined)).toBe('NULL')
	})

	it('formats BLOB as hex literal', () => {
		const blob = Buffer.from([0xde, 0xad, 0xbe, 0xef])
		expect(formatSqlLiteral(blob, { columnType: 'BLOB' })).toBe(
			"X'deadbeef'",
		)
	})

	it('formats bigint counter as integer', () => {
		expect(formatSqlLiteral(42n, { columnName: 'counter' })).toBe('42')
	})

	it('formats booleans as 0/1', () => {
		expect(formatSqlLiteral(true)).toBe('1')
		expect(formatSqlLiteral(false)).toBe('0')
	})
})

describe('buildInsertStatement', () => {
	const columns = [
		{ name: 'id', type: 'TEXT' },
		{ name: 'note', type: 'TEXT' },
	]

	it('builds multi-row upsert with ON CONFLICT DO UPDATE', () => {
		const sql = buildInsertStatement('User', columns, [
			['a', "it's"],
			['b', 'plain'],
		])
		expect(sql).toContain('INSERT INTO "User"')
		expect(sql).toContain('ON CONFLICT("id") DO UPDATE SET')
		expect(sql).toContain("('a', 'it''s')")
		expect(sql).toContain("('b', 'plain')")
		expect(sql).not.toContain('INSERT OR REPLACE')
	})
})

describe('chunkRowsForInsert', () => {
	const columns = [{ name: 'id', type: 'TEXT' }]

	it('respects rowsPerStatement', () => {
		const rows = Array.from({ length: 5 }, (_, index) => [`id-${index}`])
		const chunks = chunkRowsForInsert(rows, columns, 'User', {
			rowsPerStatement: 2,
			maxStatementBytes: 1_000_000,
		})
		expect(chunks).toHaveLength(3)
		expect(chunks[0].rows).toHaveLength(2)
		expect(chunks[2].rows).toHaveLength(1)
	})

	it('shrinks batch when statement exceeds byte limit', () => {
		const rows = Array.from({ length: 4 }, () => ['x'.repeat(500)])
		const chunks = chunkRowsForInsert(rows, columns, 'User', {
			rowsPerStatement: 4,
			maxStatementBytes: 800,
		})
		expect(chunks.length).toBeGreaterThan(1)
		for (const chunk of chunks) {
			expect(Buffer.byteLength(chunk.statement, 'utf8')).toBeLessThanOrEqual(800)
		}
	})
})

describe('groupStatementsIntoFiles', () => {
	it('prepends PRAGMA defer_foreign_keys and groups by count', () => {
		const files = groupStatementsIntoFiles(['INSERT 1;', 'INSERT 2;', 'INSERT 3;'], {
			statementsPerFile: 2,
		})
		expect(files).toHaveLength(2)
		expect(files[0]).toContain('PRAGMA defer_foreign_keys = ON;')
		expect(files[0]).toContain('INSERT 1;')
		expect(files[1]).toContain('INSERT 3;')
	})
})

describe('buildSinceWhereClause', () => {
	it('uses createdAt only for tables without updatedAt', () => {
		const clause = buildSinceWhereClause('2026-07-04T00:00:00.000Z', 'Session')
		expect(clause).toContain('"createdAt" >')
		expect(clause).not.toContain('updatedAt')
	})

	it('includes updatedAt for mutable tables', () => {
		for (const table of TABLES_WITH_UPDATED_AT) {
			const clause = buildSinceWhereClause('2026-07-04T00:00:00.000Z', table)
			expect(clause).toContain('"updatedAt" >')
		}
	})

	it('ANDs extra where clause', () => {
		const clause = buildSinceWhereClause(
			'2026-07-04T00:00:00.000Z',
			'User',
			"role = 'ADMIN'",
		)
		expect(clause).toContain("role = 'ADMIN'")
	})
})

describe('readTableRows --since filtering', () => {
	const db = new DatabaseSync(':memory:')
	db.exec(`
		CREATE TABLE "User" (
			id TEXT PRIMARY KEY,
			createdAt TEXT NOT NULL,
			updatedAt TEXT NOT NULL,
			email TEXT NOT NULL
		);
		INSERT INTO "User" VALUES
			('1', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 'old@example.com'),
			('2', '2026-06-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z', 'new@example.com'),
			('3', '2026-01-02T00:00:00.000Z', '2026-07-01T00:00:00.000Z', 'updated@example.com');
	`)

	it('selects rows created or updated after since', () => {
		const { rows } = readTableRows(db, 'User', {
			sinceIso: '2026-05-01T00:00:00.000Z',
		})
		const ids = rows.map((row) => row[0])
		expect(ids).toContain('2')
		expect(ids).toContain('3')
		expect(ids).not.toContain('1')
	})
})

describe('hashEmail', () => {
	it('returns stable truncated sha256', () => {
		const a = hashEmail('me@kentcdodds.com')
		const b = hashEmail('me@kentcdodds.com')
		expect(a).toBe(b)
		expect(a).toHaveLength(12)
	})
})

describe('MIGRATION_TABLES', () => {
	it('lists all 11 app tables in FK order', () => {
		expect(MIGRATION_TABLES).toHaveLength(11)
		expect(MIGRATION_TABLES[0]).toBe('User')
		expect(MIGRATION_TABLES.at(-1)).toBe('HomeworkCompletion')
	})

	it('covers every table created by the SQL migrations', async () => {
		// Drift guard: a table added to the migrations but not to
		// MIGRATION_TABLES would be silently skipped during cutover import.
		const { applySqlMigrations } = await import(
			'../../../site/scripts/lib/apply-sql-migrations.mjs'
		)
		const db = new DatabaseSync(':memory:')
		applySqlMigrations(db)
		const migratedTables = db
			.prepare(
				`SELECT name FROM sqlite_master WHERE type = 'table'
				 AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '\\_%' ESCAPE '\\'`,
			)
			.all()
			.map((row) => row.name)
			.sort()
		expect([...MIGRATION_TABLES].sort()).toEqual(migratedTables)
	})
})
