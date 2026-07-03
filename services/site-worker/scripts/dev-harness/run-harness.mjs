#!/usr/bin/env node
/**
 * Starts prisma sidecar + wrangler harness dev + runs assertions.
 */
import { spawn } from 'node:child_process'
import { copyFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const harnessDir = __dirname
const siteWorkerRoot = path.resolve(harnessDir, '../..')
const siteRoot = path.resolve(siteWorkerRoot, '../site')
const repoRoot = path.resolve(siteWorkerRoot, '../..')

const nodePrefix =
	'source ~/.nvm/nvm.sh && nvm use 26 >/dev/null && export PATH="$(dirname "$(nvm which 26)"):$PATH"'

function run(command, cwd, label) {
	return new Promise((resolve, reject) => {
		const child = spawn('bash', ['-lc', command], {
			cwd,
			stdio: 'inherit',
			env: process.env,
		})
		child.on('exit', (code) => {
			if (code === 0) resolve()
			else reject(new Error(`${label} failed with code ${code}`))
		})
	})
}

function start(command, cwd, label) {
	const child = spawn('bash', ['-lc', command], {
		cwd,
		stdio: 'inherit',
		env: process.env,
	})
	child.on('exit', (code) => {
		if (code !== 0) {
			console.error(`${label} exited with code ${code}`)
			process.exit(code ?? 1)
		}
	})
	return child
}

async function waitForUrl(url, attempts = 60) {
	for (let i = 0; i < attempts; i++) {
		try {
			const response = await fetch(url)
			if (response.ok) return
		} catch {
			// retry
		}
		await new Promise((resolve) => setTimeout(resolve, 1000))
	}
	throw new Error(`Timed out waiting for ${url}`)
}

async function main() {
	await copyFile(
		path.join(siteRoot, '.env.example'),
		path.join(harnessDir, '.dev.vars'),
	)
	await copyFile(
		path.join(siteRoot, '.env.example'),
		path.join(siteRoot, '.env'),
	).catch(() => undefined)

	await run(
		`${nodePrefix} && npm run build:worker`,
		siteWorkerRoot,
		'build:worker',
	)
	await run(
		`${nodePrefix} && node ./scripts/dev-harness/compile-harness-artifacts.mjs`,
		siteWorkerRoot,
		'compile-harness-artifacts',
	)
	await run(
		`${nodePrefix} && node ./scripts/dev-harness/build-harness-modules.mjs`,
		siteWorkerRoot,
		'build-harness-modules',
	)

	await run(
		`${nodePrefix} && npm exec --workspace kentcdodds.com prisma migrate deploy --schema ./prisma/schema.prisma`,
		repoRoot,
		'prisma migrate deploy',
	)

	await run(
		`${nodePrefix} && npm exec --workspace kentcdodds.com prisma db seed --schema ./prisma/schema.prisma`,
		repoRoot,
		'prisma db seed',
	)

	const sidecar = start(
		`${nodePrefix} && node ./scripts/dev-harness/prisma-sidecar.mjs`,
		siteWorkerRoot,
		'prisma-sidecar',
	)
	await waitForUrl('http://127.0.0.1:3101/health')

	const wrangler = start(
		`${nodePrefix} && cd scripts/dev-harness && npm exec wrangler -- dev --config harness-wrangler.jsonc --port 8801`,
		siteWorkerRoot,
		'wrangler harness',
	)
	await waitForUrl('http://127.0.0.1:8801/')

	await run(
		`${nodePrefix} && node ./scripts/dev-harness/assert-harness.mjs`,
		siteWorkerRoot,
		'assert-harness',
	)

	sidecar.kill('SIGTERM')
	wrangler.kill('SIGTERM')
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
