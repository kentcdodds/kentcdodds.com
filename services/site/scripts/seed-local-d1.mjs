#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
	localD1PersistPath,
	siteDir,
	wranglerDevConfigPath,
} from './local-d1-state.mjs'

const workerDir = path.resolve(siteDir, '../site-worker')

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
	run('node', [
		path.join(workerDir, 'scripts/seed-preview-d1.mjs'),
		'--local',
		'--config',
		wranglerDevConfigPath,
		'--persist-to',
		localD1PersistPath,
	], { stdio: 'inherit' })
}

main()
