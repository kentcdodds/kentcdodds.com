import { createHash } from 'node:crypto'

/** App tables in FK-safe insert order (excludes _prisma_migrations, sqlite_*). */
export const MIGRATION_TABLES = [
	'User',
	'Password',
	'Passkey',
	'Session',
	'Verification',
	'Call',
	'CallKentEpisodeDraft',
	'CallKentCallerEpisode',
	'PostRead',
	'Favorite',
	'HomeworkCompletion',
]

/** Tables whose rows may change after initial snapshot (backfill uses updatedAt). */
export const TABLES_WITH_UPDATED_AT = new Set([
	'User',
	'Password',
	'Passkey',
	'Call',
	'CallKentEpisodeDraft',
	'CallKentCallerEpisode',
	'Favorite',
	'HomeworkCompletion',
])

export const DEFAULT_ROWS_PER_STATEMENT = 500
export const DEFAULT_STATEMENTS_PER_FILE = 50
/** D1 enforces a 100 KiB max per SQL statement; stay well under. */
export const MAX_STATEMENT_BYTES = 90_000

const EXCLUDED_TABLE_PREFIXES = ['sqlite_', '_prisma_']

export function isAppTable(tableName) {
	if (EXCLUDED_TABLE_PREFIXES.some((prefix) => tableName.startsWith(prefix))) {
		return false
	}
	return MIGRATION_TABLES.includes(tableName)
}

/**
 * Escape a JavaScript value for SQLite/D1 INSERT literals.
 * BLOB columns use X'hex'; strings are single-quoted with doubled apostrophes.
 */
export function formatSqlLiteral(value, { columnName, columnType } = {}) {
	if (value === null || value === undefined) return 'NULL'

	const normalizedType = String(columnType ?? '').toUpperCase()

	if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
		const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value)
		return `X'${bytes.toString('hex')}'`
	}

	if (typeof value === 'bigint') {
		return String(value)
	}

	if (typeof value === 'number') {
		if (!Number.isFinite(value)) {
			throw new Error(`Non-finite number in column ${columnName ?? 'unknown'}`)
		}
		return Number.isInteger(value) ? String(value) : String(value)
	}

	if (typeof value === 'boolean') {
		return value ? '1' : '0'
	}

	if (normalizedType.includes('BLOB') && typeof value === 'string') {
		return `X'${Buffer.from(value, 'binary').toString('hex')}'`
	}

	const stringValue = String(value)
	return `'${stringValue.replaceAll("'", "''")}'`
}

export function quoteIdentifier(identifier) {
	return `"${String(identifier).replaceAll('"', '""')}"`
}

/** Primary / unique conflict target per table for idempotent upserts. */
export const TABLE_CONFLICT_TARGET = {
	User: ['id'],
	Password: ['userId'],
	Passkey: ['id'],
	Session: ['id'],
	Verification: ['id'],
	Call: ['id'],
	CallKentEpisodeDraft: ['id'],
	CallKentCallerEpisode: ['id'],
	PostRead: ['id'],
	Favorite: ['id'],
	HomeworkCompletion: ['id'],
}

export function buildUpsertStatement(tableName, columns, rows) {
	if (rows.length === 0) return null

	const conflictTarget = TABLE_CONFLICT_TARGET[tableName]
	if (!conflictTarget) {
		throw new Error(`No conflict target configured for table ${tableName}`)
	}

	const quotedColumns = columns.map((column) => quoteIdentifier(column.name)).join(', ')
	const conflictColumns = conflictTarget.map(quoteIdentifier).join(', ')
	const updateColumns = columns
		.filter((column) => !conflictTarget.includes(column.name))
		.map(
			(column) =>
				`${quoteIdentifier(column.name)} = excluded.${quoteIdentifier(column.name)}`,
		)
		.join(', ')

	const valueGroups = rows.map((row) => {
		const literals = columns.map((column, index) =>
			formatSqlLiteral(row[index], {
				columnName: column.name,
				columnType: column.type,
			}),
		)
		return `(${literals.join(', ')})`
	})

	const insertPart = `INSERT INTO ${quoteIdentifier(tableName)} (${quotedColumns}) VALUES ${valueGroups.join(', ')}`

	if (!updateColumns) {
		return `${insertPart} ON CONFLICT(${conflictColumns}) DO NOTHING;`
	}

	return `${insertPart} ON CONFLICT(${conflictColumns}) DO UPDATE SET ${updateColumns};`
}

/** @deprecated Use buildUpsertStatement — kept as alias for tests. */
export function buildInsertStatement(tableName, columns, rows) {
	return buildUpsertStatement(tableName, columns, rows)
}

export function estimateStatementBytes(statement) {
	return Buffer.byteLength(statement, 'utf8')
}

/**
 * Split rows into INSERT batches respecting row count and byte limits.
 */
export function chunkRowsForInsert(
	rows,
	columns,
	tableName,
	{
		rowsPerStatement = DEFAULT_ROWS_PER_STATEMENT,
		maxStatementBytes = MAX_STATEMENT_BYTES,
	} = {},
) {
	if (rows.length === 0) return []

	const chunks = []
	let index = 0

	while (index < rows.length) {
		let batchSize = Math.min(rowsPerStatement, rows.length - index)
		let statement = buildInsertStatement(
			tableName,
			columns,
			rows.slice(index, index + batchSize),
		)

		while (
			statement &&
			estimateStatementBytes(statement) > maxStatementBytes &&
			batchSize > 1
		) {
			batchSize = Math.max(1, Math.floor(batchSize / 2))
			statement = buildInsertStatement(
				tableName,
				columns,
				rows.slice(index, index + batchSize),
			)
		}

		if (!statement || estimateStatementBytes(statement) > maxStatementBytes) {
			throw new Error(
				`Single row in ${tableName} exceeds max statement size (${maxStatementBytes} bytes)`,
			)
		}

		chunks.push({
			rows: rows.slice(index, index + batchSize),
			statement,
		})
		index += batchSize
	}

	return chunks
}

export function groupStatementsIntoFiles(
	statements,
	{ statementsPerFile = DEFAULT_STATEMENTS_PER_FILE } = {},
) {
	const files = []
	for (let index = 0; index < statements.length; index += statementsPerFile) {
		const chunk = statements.slice(index, index + statementsPerFile)
		const body = ['PRAGMA defer_foreign_keys = ON;', ...chunk].join('\n')
		files.push(body)
	}
	return files
}

export function buildSinceWhereClause(sinceIso, tableName, extraWhere) {
	const parts = []
	const sinceLiteral = formatSqlLiteral(sinceIso)

	if (TABLES_WITH_UPDATED_AT.has(tableName)) {
		parts.push(
			`("createdAt" > ${sinceLiteral} OR "updatedAt" > ${sinceLiteral})`,
		)
	} else {
		parts.push(`"createdAt" > ${sinceLiteral}`)
	}

	if (extraWhere?.trim()) {
		parts.push(`(${extraWhere.trim()})`)
	}

	return parts.join(' AND ')
}

export function buildSelectSql(tableName, sinceIso, extraWhere) {
	const where =
		sinceIso != null
			? ` WHERE ${buildSinceWhereClause(sinceIso, tableName, extraWhere)}`
			: extraWhere?.trim()
				? ` WHERE ${extraWhere.trim()}`
				: ''

	return `SELECT * FROM ${quoteIdentifier(tableName)}${where}`
}

export function hashEmail(email) {
	return createHash('sha256').update(String(email)).digest('hex').slice(0, 12)
}

export function parseWranglerJsonOutput(output) {
	const jsonStart = output.indexOf('[')
	if (jsonStart === -1) {
		const objectStart = output.indexOf('{')
		if (objectStart === -1) return null
		try {
			return JSON.parse(output.slice(objectStart))
		} catch {
			return null
		}
	}

	try {
		return JSON.parse(output.slice(jsonStart))
	} catch {
		return null
	}
}

export function extractScalarFromWranglerOutput(output, columnName) {
	const parsed = parseWranglerJsonOutput(output)
	if (Array.isArray(parsed) && parsed[0]?.results?.length) {
		const row = parsed[0].results[0]
		if (columnName in row) return row[columnName]
		const firstKey = Object.keys(row)[0]
		return row[firstKey]
	}

	const regex = new RegExp(`"${columnName}"\\s*:\\s*("([^"]*)"|([0-9]+))`)
	const match = output.match(regex)
	if (!match) return null
	if (match[2] !== undefined) return match[2]
	return Number(match[3])
}

export function getTableColumns(db, tableName) {
	return db
		.prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`)
		.all()
		.map((column) => ({
			name: column.name,
			type: column.type,
			cid: column.cid,
		}))
}

export function readTableRows(db, tableName, { sinceIso, where } = {}) {
	const sql = buildSelectSql(tableName, sinceIso, where)
	const statement = db.prepare(sql)
	const columns = getTableColumns(db, tableName)
	// node:sqlite has no raw() array mode; project object rows into
	// column-ordered arrays to keep the row/values contract.
	const rows = statement
		.all()
		.map((row) => columns.map((column) => row[column.name]))
	return { columns, rows }
}

export function rowToValues(row, columns) {
	return columns.map((_, index) => row[index])
}
