#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const workerDir = path.resolve(siteDir, '../site-worker')
const configPath = path.join(siteDir, 'wrangler.dev.jsonc')
const stateDir = path.join(siteDir, '.wrangler/state/v3/d1')

function findLocalD1SqliteFile() {
	if (!fs.existsSync(stateDir)) return null
	const stack = [stateDir]
	while (stack.length > 0) {
		const current = stack.pop()
		if (!current) continue
		for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
			const fullPath = path.join(current, entry.name)
			if (entry.isDirectory()) {
				stack.push(fullPath)
				continue
			}
			if (entry.isFile() && entry.name.endsWith('.sqlite')) {
				return fullPath
			}
		}
	}
	return null
}

function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		cwd: options.cwd ?? siteDir,
		encoding: 'utf8',
		env: process.env,
	})
	if (result.status !== 0) {
		throw new Error(
			`${command} ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`,
		)
	}
	return `${result.stdout}\n${result.stderr}`.trim()
}

function main() {
	const sqlitePath = findLocalD1SqliteFile()
	if (!sqlitePath) {
		console.error(
			`Could not find local D1 sqlite under ${stateDir}. Start the dev worker once or run db:migrations:apply.`,
		)
		process.exit(1)
	}
	console.log(sqlitePath)
}

main()
