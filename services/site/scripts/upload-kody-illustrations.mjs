#!/usr/bin/env node
/**
 * Uploads the Kody illustration masters in `other/kody-illustrations/` to the
 * media R2 bucket under `kentcdodds.com/illustrations/kody/<filename>` (the
 * key the `/media/*` endpoint resolves via `app/images.tsx` ids).
 *
 *   node ./scripts/upload-kody-illustrations.mjs --local    # dev Miniflare R2
 *   node ./scripts/upload-kody-illustrations.mjs --remote   # production R2
 *
 * `--remote` needs a Cloudflare API token with R2 write access (wrangler
 * login or CLOUDFLARE_API_TOKEN).
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { localD1PersistPath, siteDir } from './local-d1-state.mjs'

const mode = process.argv.includes('--remote')
	? 'remote'
	: process.argv.includes('--local')
		? 'local'
		: null
if (!mode) {
	console.error('Usage: upload-kody-illustrations.mjs --local | --remote')
	process.exit(1)
}

const bucket = mode === 'remote' ? 'kentcdodds-com' : 'kentcdodds-com-dev-media'
const illustrationsDir = path.resolve(siteDir, '../../other/kody-illustrations')
const files = fs
	.readdirSync(illustrationsDir)
	.filter((file) => file.endsWith('.png'))
	.sort()

if (files.length === 0) {
	console.error(`No .png files found in ${illustrationsDir}`)
	process.exit(1)
}

for (const file of files) {
	const key = `kentcdodds.com/illustrations/kody/${path.basename(file, '.png')}`
	const modeArgs =
		mode === 'remote'
			? ['--remote']
			: ['--local', '--persist-to', localD1PersistPath]
	execFileSync(
		'npm',
		[
			'exec',
			'wrangler',
			'--',
			'r2',
			'object',
			'put',
			`${bucket}/${key}`,
			'--file',
			path.join(illustrationsDir, file),
			'--content-type',
			'image/png',
			...modeArgs,
		],
		{ cwd: siteDir, stdio: 'inherit' },
	)
	console.log(`uploaded ${bucket}/${key}`)
}
