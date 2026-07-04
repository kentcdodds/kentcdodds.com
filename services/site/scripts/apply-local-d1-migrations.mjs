#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const workerDir = path.resolve(siteDir, '../site-worker')
const configPath = path.join(siteDir, 'wrangler.dev.jsonc')

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
	run('npm', ['run', 'd1:migrations:prepare', '--workspace', 'site-worker'], {
		cwd: path.resolve(siteDir, '..'),
	})
	run('npm', ['exec', 'wrangler', '--', 'd1', 'migrations', 'apply', 'APP_DB', '--local', '--config', configPath])
	console.log('Applied local D1 migrations for dev worker')
}

main()
