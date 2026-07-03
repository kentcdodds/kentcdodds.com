#!/usr/bin/env node
import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import bcrypt from 'bcryptjs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const workerDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function getConfigPath() {
	const index = process.argv.indexOf('--config')
	if (index === -1) {
		return path.join(workerDir, 'generated-wrangler.jsonc')
	}
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
	if (local) args.push('--local')
	else args.push('--remote')

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
	const checkSql = `SELECT id FROM User WHERE email = ${sqlString(adminEmail)} LIMIT 1;`
	const checkOutput = runWranglerExecute(checkSql, { local })

	if (checkOutput.includes(adminEmail) || /"id"/.test(checkOutput)) {
		console.log('Seed admin already exists; skipping')
		return
	}

	const passwordHash = await bcrypt.hash('iliketwix', 10)
	const kentId = randomUUID()
	const hannahId = randomUUID()
	const kodyId = randomUUID()
	const peterId = randomUUID()
	const now = new Date().toISOString()

	const statements = [
		`INSERT INTO User (id, createdAt, updatedAt, email, firstName, team, role) VALUES (${sqlString(kentId)}, ${sqlString(now)}, ${sqlString(now)}, ${sqlString(adminEmail)}, 'Kent', 'BLUE', 'ADMIN');`,
		`INSERT INTO Password (hash, createdAt, updatedAt, userId) VALUES (${sqlString(passwordHash)}, ${sqlString(now)}, ${sqlString(now)}, ${sqlString(kentId)});`,
		`INSERT INTO User (id, createdAt, updatedAt, email, firstName, team, role) VALUES (${sqlString(hannahId)}, ${sqlString(now)}, ${sqlString(now)}, 'me+hannah@kentcdodds.com', 'Hannah', 'RED', 'MEMBER');`,
		`INSERT INTO User (id, createdAt, updatedAt, email, firstName, team, role) VALUES (${sqlString(kodyId)}, ${sqlString(now)}, ${sqlString(now)}, 'me+kody@kentcdodds.com', 'Kody', 'YELLOW', 'MEMBER');`,
		`INSERT INTO User (id, createdAt, updatedAt, email, firstName, team, role) VALUES (${sqlString(peterId)}, ${sqlString(now)}, ${sqlString(now)}, 'me+peter@kentcdodds.com', 'Peter', 'YELLOW', 'MEMBER');`,
	]

	for (const sql of statements) {
		runWranglerExecute(sql, { local })
	}

	console.log('Seeded preview D1 admin user and sample users')
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
