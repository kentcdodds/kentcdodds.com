#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
	localD1PersistPath,
	siteDir,
	wranglerDevConfigPath,
} from './local-d1-state.mjs'

const repoRoot = path.resolve(siteDir, '../..')

function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		cwd: options.cwd ?? siteDir,
		encoding: 'utf8',
		env: process.env,
		stdio: options.stdio ?? 'pipe',
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
		cwd: repoRoot,
	})
	run('npm', [
		'exec',
		'wrangler',
		'--',
		'd1',
		'migrations',
		'apply',
		'APP_DB',
		'--local',
		'--config',
		wranglerDevConfigPath,
		'--persist-to',
		localD1PersistPath,
	])
	console.log(`Applied local D1 migrations at ${localD1PersistPath}`)
}

main()
