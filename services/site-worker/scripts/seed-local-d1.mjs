#!/usr/bin/env node
import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import bcrypt from 'bcryptjs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const workerDir = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'..',
)

function getConfigPath() {
	const index = process.argv.indexOf('--config')
	if (index === -1) {
		return path.join(workerDir, 'generated-wrangler.jsonc')
	}
	return process.argv[index + 1]
}

function getPersistToPath() {
	const index = process.argv.indexOf('--persist-to')
	if (index === -1) return undefined
	return process.argv[index + 1]
}

function sqlString(value) {
	return `'${String(value).replaceAll("'", "''")}'`
}

function runWranglerExecute(sql, { local }) {
	const args = [
		'd1',
		'execute',
		'APP_DB',
		'--command',
		sql,
		'--config',
		getConfigPath(),
	]
	if (local) {
		args.push('--local')
		const persistTo = getPersistToPath()
		if (persistTo) args.push('--persist-to', persistTo)
	} else {
		args.push('--remote')
	}

	const result = spawnSync('npm', ['exec', 'wrangler', '--', ...args], {
		cwd: workerDir,
		encoding: 'utf8',
		env: process.env,
	})

	if (result.status !== 0) {
		throw new Error(
			`wrangler d1 execute failed:\n${result.stdout}\n${result.stderr}`,
		)
	}

	return `${result.stdout}\n${result.stderr}`
}

async function main() {
	const local = process.argv.includes('--local')
	const adminEmail = 'me@kentcdodds.com'
	// COUNT with an aliased column so the guard checks the actual row count
	// instead of pattern-matching column names in wrangler's output (which can
	// contain "id" even for empty result sets).
	const checkSql = `SELECT COUNT(*) AS admin_count FROM User WHERE email = ${sqlString(adminEmail)};`
	const checkOutput = runWranglerExecute(checkSql, { local })

	const countMatch = checkOutput.match(/"admin_count":\s*(\d+)/)
	const adminCount = countMatch
		? Number(countMatch[1])
		: (() => {
				// Table output fallback: a row like `│ 1 │` under the header.
				const tableMatch = checkOutput.match(/admin_count[\s\S]*?([0-9]+)/)
				return tableMatch ? Number(tableMatch[1]) : null
			})()

	if (adminCount === null) {
		throw new Error(
			`Could not determine existing admin count from wrangler output:\n${checkOutput}`,
		)
	}

	// Statements are individually idempotent (INSERT OR IGNORE keyed on unique
	// emails / userId) so a partially-failed earlier run is repaired on retry
	// instead of being skipped.
	const passwordHash = await bcrypt.hash('iliketwix', 10)
	const kentId = randomUUID()
	const hannahId = randomUUID()
	const kodyId = randomUUID()
	const peterId = randomUUID()
	const now = new Date().toISOString()

	const statements = [
		`INSERT OR IGNORE INTO User (id, createdAt, updatedAt, email, firstName, team, role) VALUES (${sqlString(kentId)}, ${sqlString(now)}, ${sqlString(now)}, ${sqlString(adminEmail)}, 'Kent', 'BLUE', 'ADMIN');`,
		`INSERT OR IGNORE INTO Password (hash, createdAt, updatedAt, userId) SELECT ${sqlString(passwordHash)}, ${sqlString(now)}, ${sqlString(now)}, id FROM User WHERE email = ${sqlString(adminEmail)};`,
		`INSERT OR IGNORE INTO User (id, createdAt, updatedAt, email, firstName, team, role) VALUES (${sqlString(hannahId)}, ${sqlString(now)}, ${sqlString(now)}, 'me+hannah@kentcdodds.com', 'Hannah', 'RED', 'MEMBER');`,
		`INSERT OR IGNORE INTO User (id, createdAt, updatedAt, email, firstName, team, role) VALUES (${sqlString(kodyId)}, ${sqlString(now)}, ${sqlString(now)}, 'me+kody@kentcdodds.com', 'Kody', 'YELLOW', 'MEMBER');`,
		`INSERT OR IGNORE INTO User (id, createdAt, updatedAt, email, firstName, team, role) VALUES (${sqlString(peterId)}, ${sqlString(now)}, ${sqlString(now)}, 'me+peter@kentcdodds.com', 'Peter', 'YELLOW', 'MEMBER');`,
	]

	for (const sql of statements) {
		runWranglerExecute(sql, { local })
	}

	console.log(
		adminCount > 0
			? 'Seed data verified/repaired (admin already existed)'
			: 'Seeded local D1 admin user and sample users',
	)
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
