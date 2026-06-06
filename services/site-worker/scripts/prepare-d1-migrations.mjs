import { constants } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const workerDir = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'..',
)
const prismaMigrationsDir = path.resolve(
	workerDir,
	'../site/prisma/migrations',
)
const d1MigrationsDir = path.resolve(
	workerDir,
	'.wrangler/site-prisma-migrations',
)

async function pathExists(filePath) {
	try {
		await fs.access(filePath, constants.F_OK)
		return true
	} catch {
		return false
	}
}

async function getPrismaMigrationDirs() {
	const entries = await fs.readdir(prismaMigrationsDir, { withFileTypes: true })

	return entries
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.toSorted()
}

function prepareSqlForD1(sql) {
	// D1 rejects TEMP tables in migrations; the guard table is dropped in the
	// same migration, so a regular table preserves the check without persisting.
	return sql.replaceAll('CREATE TEMP TABLE ', 'CREATE TABLE ')
}

await fs.rm(d1MigrationsDir, { recursive: true, force: true })
await fs.mkdir(d1MigrationsDir, { recursive: true })

const migrationDirs = await getPrismaMigrationDirs()

if (migrationDirs.length === 0) {
	throw new Error(`No Prisma migration directories found in ${prismaMigrationsDir}`)
}

for (const migrationDir of migrationDirs) {
	const source = path.join(prismaMigrationsDir, migrationDir, 'migration.sql')
	const target = path.join(d1MigrationsDir, `${migrationDir}.sql`)

	if (!(await pathExists(source))) {
		throw new Error(`Missing Prisma migration SQL file: ${source}`)
	}

	const sql = prepareSqlForD1(await fs.readFile(source, 'utf8'))

	if (!sql.trim()) {
		throw new Error(`Prisma migration SQL file is empty: ${source}`)
	}

	await fs.writeFile(target, sql)
}

console.log(
	`Prepared ${migrationDirs.length} D1 migration files in ${path.relative(
		workerDir,
		d1MigrationsDir,
	)}`,
)
