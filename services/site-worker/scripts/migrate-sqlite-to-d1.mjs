#!/usr/bin/env node
import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import BetterSqlite3 from 'better-sqlite3'
import {
	chunkRowsForInsert,
	extractScalarFromWranglerOutput,
	groupStatementsIntoFiles,
	hashEmail,
	MIGRATION_TABLES,
	readTableRows,
	rowToValues,
} from './migrate-sqlite-to-d1-lib.mjs'

const workerDir = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'..',
)

function printUsage() {
	console.log(`Usage: migrate-sqlite-to-d1.mjs --source <sqlite.db> --database <d1-name> [options]

Options:
  --config <path>       Wrangler config (default: generated-wrangler.jsonc)
  --local               Target local Miniflare D1 instead of remote
  --since <ISO-8601>    Incremental backfill: rows created/updated after timestamp
  --reset               Delete ALL rows from the selected tables in D1 before
                        importing (FK-safe child-first order). Use for the
                        one-shot cutover so seeded/test data does not survive.
                        Refused together with --since.
  --tables <csv>        Comma-separated subset of tables (default: all 11 app tables)
  --where <sql>         Extra AND clause applied to every selected table
  --table-where <t=sql> Per-table extra WHERE (repeatable), e.g. --table-where User="role='ADMIN'"
  --verify              After import, compare row counts + spot checks
  --dry-run             Generate SQL chunks but do not execute against D1
  --keep-chunks         Preserve generated chunk files (implies --dry-run friendly)
  --rows-per-statement  Rows per INSERT (default: 500)
  --statements-per-file Statements per wrangler --file (default: 50)
  --help                Show this help
`)
}

function parseArgs(argv) {
	const options = {
		config: path.join(workerDir, 'generated-wrangler.jsonc'),
		local: false,
		verify: false,
		dryRun: false,
		keepChunks: false,
		tableWhere: new Map(),
	}

	for (let index = 2; index < argv.length; index += 1) {
		const arg = argv[index]
		switch (arg) {
			case '--source':
				options.source = argv[++index]
				break
			case '--database':
				options.database = argv[++index]
				break
			case '--config':
				options.config = argv[++index]
				break
			case '--since':
				options.since = argv[++index]
				break
			case '--tables':
				options.tables = argv[++index]
					.split(',')
					.map((value) => value.trim())
					.filter(Boolean)
				break
			case '--where':
				options.where = argv[++index]
				break
			case '--table-where': {
				const pair = argv[++index]
				const separator = pair.indexOf('=')
				if (separator === -1) {
					throw new Error(`Invalid --table-where value: ${pair}`)
				}
				const table = pair.slice(0, separator).trim()
				const clause = pair.slice(separator + 1).trim()
				options.tableWhere.set(table, clause)
				break
			}
			case '--reset':
				options.reset = true
				break
			case '--verify':
				options.verify = true
				break
			case '--dry-run':
				options.dryRun = true
				break
			case '--keep-chunks':
				options.keepChunks = true
				break
			case '--rows-per-statement':
				options.rowsPerStatement = Number(argv[++index])
				break
			case '--statements-per-file':
				options.statementsPerFile = Number(argv[++index])
				break
			case '--local':
				options.local = true
				break
			case '--help':
			case '-h':
				options.help = true
				break
			default:
				throw new Error(`Unknown argument: ${arg}`)
		}
	}

	return options
}

function runWrangler(args) {
	const result = spawnSync('npm', ['exec', 'wrangler', '--', ...args], {
		cwd: workerDir,
		encoding: 'utf8',
		env: process.env,
	})

	if (result.status !== 0) {
		throw new Error(
			`wrangler ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`,
		)
	}

	return `${result.stdout}\n${result.stderr}`
}

function runWranglerExecute(sql, { database, config, local, file }) {
	const args = ['d1', 'execute', database, '--config', config]
	if (local) args.push('--local')
	else args.push('--remote')

	if (file) {
		args.push('--file', file)
	} else {
		args.push('--command', sql)
	}

	return runWrangler(args)
}

function queryD1Count(database, config, local, tableName) {
	const sql = `SELECT COUNT(*) AS row_count FROM "${tableName.replaceAll('"', '""')}";`
	const output = runWranglerExecute(sql, {
		database,
		config,
		local,
	})
	const count = extractScalarFromWranglerOutput(output, 'row_count')
	if (count == null || Number.isNaN(Number(count))) {
		throw new Error(
			`Could not parse D1 count for ${tableName}:\n${output.slice(0, 500)}`,
		)
	}
	return Number(count)
}

function queryD1Scalar(database, config, local, sql, columnName) {
	const output = runWranglerExecute(sql, { database, config, local })
	const value = extractScalarFromWranglerOutput(output, columnName)
	return value
}

async function migrateTable({
	db,
	tableName,
	options,
	stats,
	chunkDir,
}) {
	const extraWhere = options.tableWhere.get(tableName) ?? options.where
	const { columns, rows } = readTableRows(db, tableName, {
		sinceIso: options.since,
		where: extraWhere,
	})

	if (rows.length === 0) {
		console.log(`  ${tableName}: 0 rows (skip)`)
		return
	}

	const valueRows = rows.map((row) => rowToValues(row, columns))
	const insertChunks = chunkRowsForInsert(valueRows, columns, tableName, {
		rowsPerStatement: options.rowsPerStatement,
	})
	const statements = insertChunks.map((chunk) => chunk.statement)
	const files = groupStatementsIntoFiles(statements, {
		statementsPerFile: options.statementsPerFile,
	})

	stats.tables[tableName] = {
		rows: rows.length,
		statements: statements.length,
		files: files.length,
	}
	stats.totalRows += rows.length
	stats.totalStatements += statements.length
	stats.totalFiles += files.length

	console.log(
		`  ${tableName}: ${rows.length} rows → ${statements.length} statements → ${files.length} files`,
	)

	if (options.dryRun) {
		for (const [fileIndex, body] of files.entries()) {
			const filePath = path.join(
				chunkDir,
				`${tableName}-${String(fileIndex).padStart(4, '0')}.sql`,
			)
			await writeFile(filePath, body, 'utf8')
		}
		return
	}

	for (const [fileIndex, body] of files.entries()) {
		const filePath = path.join(
			chunkDir,
			`${tableName}-${String(fileIndex).padStart(4, '0')}.sql`,
		)
		await writeFile(filePath, body, 'utf8')
		runWranglerExecute(null, {
			database: options.database,
			config: options.config,
			local: options.local,
			file: filePath,
		})
	}
}

async function verifyMigration({ db, options }) {
	console.log('\n=== Verification ===')
	let allMatch = true

	for (const tableName of options.tables) {
		const sourceCount = db
			.prepare(`SELECT COUNT(*) AS c FROM "${tableName}"`)
			.get().c
		const d1Count = queryD1Count(
			options.database,
			options.config,
			options.local,
			tableName,
		)
		const match = sourceCount === d1Count
		if (!match) allMatch = false
		console.log(
			`  ${tableName}: source=${sourceCount} d1=${d1Count} ${match ? 'OK' : 'MISMATCH'}`,
		)
	}

	console.log('\n--- max(createdAt) per table ---')
	for (const tableName of options.tables) {
		const sourceMax = db
			.prepare(`SELECT MAX("createdAt") AS m FROM "${tableName}"`)
			.get().m
		const d1Max = queryD1Scalar(
			options.database,
			options.config,
			options.local,
			`SELECT MAX("createdAt") AS max_created FROM "${tableName}";`,
			'max_created',
		)
		console.log(`  ${tableName}: source=${sourceMax ?? 'NULL'} d1=${d1Max ?? 'NULL'}`)
	}

	const sampleEmails = db
		.prepare(
			`SELECT email FROM "User" ORDER BY RANDOM() LIMIT 5`,
		)
		.all()
		.map((row) => row.email)

	console.log('\n--- spot check: 5 random User emails (hashed) ---')
	for (const email of sampleEmails) {
		const digest = hashEmail(email)
		const d1Email = queryD1Scalar(
			options.database,
			options.config,
			options.local,
			`SELECT email FROM "User" WHERE email = '${String(email).replaceAll("'", "''")}' LIMIT 1;`,
			'email',
		)
		const found = d1Email === email
		console.log(`  sha256:${digest} present=${found ? 'yes' : 'NO'}`)
		if (!found) allMatch = false
	}

	if (!allMatch) {
		throw new Error('Verification failed — counts or spot checks did not match')
	}

	console.log('\nVerification passed.')
}

async function main() {
	const options = parseArgs(process.argv)

	if (options.help) {
		printUsage()
		return
	}

	if (!options.source || !options.database) {
		printUsage()
		throw new Error('--source and --database are required')
	}

	options.tables ??= [...MIGRATION_TABLES]
	for (const table of options.tables) {
		if (!MIGRATION_TABLES.includes(table)) {
			throw new Error(`Unknown table: ${table}`)
		}
	}

	options.rowsPerStatement ??= 500
	options.statementsPerFile ??= 50

	if (options.reset && options.since) {
		throw new Error(
			'--reset and --since are mutually exclusive (a backfill must not wipe rows)',
		)
	}

	const sourcePath = path.resolve(options.source)
	const db = new BetterSqlite3(sourcePath, { readonly: true })

	const stats = {
		tables: {},
		totalRows: 0,
		totalStatements: 0,
		totalFiles: 0,
	}
	const startedAt = Date.now()
	const chunkDir = options.keepChunks
		? path.join(workerDir, `.migration-chunks-${randomUUID()}`)
		: await mkdtemp(path.join(os.tmpdir(), 'kcd-migrate-'))

	console.log(
		`Migrating ${sourcePath} → D1 ${options.database} (${options.local ? 'local' : 'remote'})${
			options.since ? ` since ${options.since}` : ' (full)'
		}`,
	)
	console.log(`Chunk dir: ${chunkDir}`)

	try {
		if (options.reset && !options.dryRun) {
			// Child-first (reverse FK-safe insert order) so deletes never trip
			// foreign keys; removes seeded/test rows so only source data remains.
			const deleteOrder = [...MIGRATION_TABLES]
				.reverse()
				.filter((tableName) => options.tables.includes(tableName))
			console.log(`\nResetting D1 tables: ${deleteOrder.join(', ')}`)
			const resetSql = deleteOrder
				.map((tableName) => `DELETE FROM "${tableName}";`)
				.join('\n')
			runWranglerExecute(resetSql, {
				database: options.database,
				config: options.config,
				local: options.local,
			})
		}

		for (const tableName of options.tables) {
			await migrateTable({ db, tableName, options, stats, chunkDir })
		}

		const elapsedMs = Date.now() - startedAt
		const rowsPerSec =
			stats.totalRows > 0 ? (stats.totalRows / (elapsedMs / 1000)).toFixed(1) : '0'

		console.log('\n=== Summary ===')
		console.log(`  Rows: ${stats.totalRows}`)
		console.log(`  Statements: ${stats.totalStatements}`)
		console.log(`  Files: ${stats.totalFiles}`)
		console.log(`  Wall time: ${(elapsedMs / 1000).toFixed(2)}s`)
		console.log(`  Throughput: ${rowsPerSec} rows/sec`)

		if (options.verify) {
			await verifyMigration({ db, options })
		}
	} finally {
		db.close()
		if (!options.keepChunks) {
			await rm(chunkDir, { recursive: true, force: true })
		}
	}
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
