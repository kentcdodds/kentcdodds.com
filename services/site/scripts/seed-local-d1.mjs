#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
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
	run('node', [
		path.join(siteDir, '../site-worker/scripts/seed-preview-d1.mjs'),
		'--local',
		'--config',
		configPath,
	])
}

main()
