#!/usr/bin/env node
/**
 * End-to-end migration pipeline test against a scratch remote D1 database.
 * Creates kcd-migration-test-db, runs full migrate + backfill, then deletes it.
 */
import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import BetterSqlite3 from 'better-sqlite3'

const workerDir = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'..',
)
const siteDir = path.resolve(workerDir, '../site')
const SCRATCH_DB_NAME = 'kcd-migration-test-db'
const BINDING = 'APP_DB'

async function cfApi(pathname, { method = 'GET', body } = {}) {
	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
	const response = await fetch(
		`https://api.cloudflare.com/client/v4/accounts/${accountId}${pathname}`,
		{
			method,
			headers: {
				authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
				'content-type': 'application/json',
			},
			body: body === undefined ? undefined : JSON.stringify(body),
		},
	)
	const payload = await response.json()
	if (!payload.success) {
		throw new Error(
			`Cloudflare API ${method} ${pathname} failed: ${JSON.stringify(payload.errors)}`,
		)
	}
	return payload.result
}

async function ensureScratchDatabase() {
	const databases = await cfApi('/d1/database?per_page=100')
	const existing = databases.find((entry) => entry.name === SCRATCH_DB_NAME)
	if (existing) {
		const id = existing.uuid ?? existing.id
		console.log(`Reusing scratch D1: ${SCRATCH_DB_NAME} (${id})`)
		return id
	}

	const created = await cfApi('/d1/database', {
		method: 'POST',
		body: { name: SCRATCH_DB_NAME },
	})
	const id = created.uuid ?? created.id
	console.log(`Created scratch D1: ${SCRATCH_DB_NAME} (${id})`)
	return id
}

async function deleteScratchDatabase() {
	const databases = await cfApi('/d1/database?per_page=100')
	const existing = databases.find((entry) => entry.name === SCRATCH_DB_NAME)
	if (!existing) {
		console.log('Scratch D1 already absent')
		return
	}
	const id = existing.uuid ?? existing.id
	await cfApi(`/d1/database/${id}`, { method: 'DELETE' })
	console.log(`Deleted scratch D1: ${SCRATCH_DB_NAME} (${id})`)
}

function run(command, args, { cwd = workerDir, env = process.env } = {}) {
	const result = spawnSync(command, args, {
		cwd,
		encoding: 'utf8',
		env,
		stdio: ['ignore', 'pipe', 'pipe'],
	})
	if (result.status !== 0) {
		throw new Error(
			`${command} ${args.join(' ')} failed (${result.status}):\n${result.stdout}\n${result.stderr}`,
		)
	}
	return `${result.stdout}\n${result.stderr}`
}

async function writeScratchWranglerConfig(databaseId, configPath) {
	const migrationsDir = path.join(workerDir, '.wrangler/site-prisma-migrations')
	const config = {
		$schema: path.join(workerDir, 'node_modules/wrangler/config-schema.json'),
		name: 'kcd-migration-test',
		main: path.join(workerDir, 'src/index.ts'),
		compatibility_date: '2026-03-17',
		d1_databases: [
			{
				binding: BINDING,
				database_name: SCRATCH_DB_NAME,
				database_id: databaseId,
				migrations_dir: migrationsDir,
			},
		],
	}
	await writeFile(configPath, JSON.stringify(config, null, 2))
}

function getTableCounts(db) {
	const tables = [
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
	const counts = {}
	for (const table of tables) {
		counts[table] = db.prepare(`SELECT COUNT(*) AS c FROM "${table}"`).get().c
	}
	return counts
}

function isoNow(offsetMs = 0) {
	return new Date(Date.now() + offsetMs).toISOString()
}

function simulateCutoverWindow(db, snapshotTime) {
	const userId = db.prepare('SELECT id FROM "User" LIMIT 1').get().id

	const newPostReads = []
	for (let index = 0; index < 80; index += 1) {
		newPostReads.push([
			randomUUID(),
			isoNow(1000 + index),
			userId,
			null,
			'cutover-window-slug',
		])
	}
	const insertPostRead = db.prepare(
		`INSERT INTO "PostRead" (id, createdAt, userId, clientId, postSlug) VALUES (?, ?, ?, ?, ?)`,
	)
	const tx = db.transaction((rows) => {
		for (const row of rows) insertPostRead.run(...row)
	})
	tx(newPostReads)

	for (let index = 0; index < 20; index += 1) {
		db.prepare(
			`INSERT INTO "Session" (id, createdAt, userId, expirationDate) VALUES (?, ?, ?, ?)`,
		).run(randomUUID(), isoNow(2000 + index), userId, isoNow(86_400_000))
	}

	db.prepare(
		`UPDATE "User" SET "updatedAt" = ?, firstName = ? WHERE id = ?`,
	).run(isoNow(3000), 'Kent-Updated-Cutover', userId)

	const call = db.prepare('SELECT id FROM "Call" LIMIT 1').get()
	if (call) {
		db.prepare(
			`UPDATE "Call" SET "updatedAt" = ?, title = ? WHERE id = ?`,
		).run(isoNow(4000), 'Updated during cutover', call.id)
	}

	console.log(
		`Simulated cutover window writes after ${snapshotTime}: +100 rows, 2 updates`,
	)
}

async function main() {
	if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) {
		throw new Error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required')
	}

	const sqlitePath = path.join(siteDir, 'prisma/sqlite.db')
	const configDir = await mkdtemp(path.join(os.tmpdir(), 'kcd-migrate-config-'))
	const configPath = path.join(configDir, 'wrangler.json')

	console.log('=== Step 1: Reset + seed local SQLite ===')
	run(
		'npx',
		['prisma', 'migrate', 'reset', '--force'],
		{
			cwd: siteDir,
			env: {
				...process.env,
				PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION:
					'Yes, run migration pipeline test even if it triggers prisma reset',
			},
		},
	)

	console.log('=== Step 2: Inflate fixture ===')
	run('node', ['./scripts/migrate-build-fixture.mjs', '--db', sqlitePath])

	const sourceDb = new BetterSqlite3(sqlitePath, { readonly: true })
	const beforeCounts = getTableCounts(sourceDb)
	console.log('Source counts before cutover simulation:', beforeCounts)
	sourceDb.close()

	const snapshotTime = isoNow()
	console.log(`Snapshot time (for --since): ${snapshotTime}`)

	console.log('=== Step 3: Create scratch D1 + apply migrations ===')
	const databaseId = await ensureScratchDatabase()
	await writeScratchWranglerConfig(databaseId, configPath)

	run('node', ['./scripts/prepare-d1-migrations.mjs'])
	run('npm', [
		'exec',
		'wrangler',
		'--',
		'd1',
		'migrations',
		'apply',
		BINDING,
		'--remote',
		'--config',
		configPath,
	])

	console.log('=== Step 4: Full migration with verify ===')
	const migrateOutput = run('node', [
		'./scripts/migrate-sqlite-to-d1.mjs',
		'--source',
		sqlitePath,
		'--database',
		BINDING,
		'--config',
		configPath,
		'--verify',
	])
	console.log(migrateOutput)

	console.log('=== Step 5: Simulate cutover window on source SQLite ===')
	const writableDb = new BetterSqlite3(sqlitePath)
	simulateCutoverWindow(writableDb, snapshotTime)
	const afterWindowCounts = getTableCounts(writableDb)
	console.log('Source counts after cutover simulation:', afterWindowCounts)
	writableDb.close()

	console.log('=== Step 6: Incremental backfill (--since) with verify ===')
	const backfillOutput = run('node', [
		'./scripts/migrate-sqlite-to-d1.mjs',
		'--source',
		sqlitePath,
		'--database',
		BINDING,
		'--config',
		configPath,
		'--since',
		snapshotTime,
		'--verify',
	])
	console.log(backfillOutput)

	console.log('=== Step 7: Delete scratch D1 ===')
	await deleteScratchDatabase()
	await rm(configDir, { recursive: true, force: true })

	console.log('\nPipeline test completed successfully.')
}

main().catch(async (error) => {
	console.error(error)
	try {
		await deleteScratchDatabase()
	} catch (cleanupError) {
		console.error('Cleanup failed:', cleanupError)
	}
	process.exit(1)
})
