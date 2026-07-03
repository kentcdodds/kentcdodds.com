#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const workerDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function usage() {
	console.error(
		'Usage: node scripts/publish-artifacts.mjs <bundle.json> [--config path/to/wrangler.jsonc]',
	)
	process.exit(1)
}

function getArgValue(flag) {
	const index = process.argv.indexOf(flag)
	if (index === -1) return undefined
	return process.argv[index + 1]
}

function runWrangler(args) {
	const result = spawnSync('npm', ['exec', 'wrangler', '--', ...args], {
		cwd: workerDir,
		encoding: 'utf8',
		env: process.env,
	})

	if (result.status !== 0) {
		throw new Error(
			`wrangler ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`,
		)
	}

	return `${result.stdout}\n${result.stderr}`.trim()
}

function stripJsoncComments(source) {
	return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

async function readConfig(configPath) {
	const raw = await fs.readFile(configPath, 'utf8')
	return JSON.parse(stripJsoncComments(raw))
}

async function main() {
	const bundlePath = process.argv[2]
	if (!bundlePath) usage()

	const configPath =
		getArgValue('--config') ??
		path.join(workerDir, '.wrangler/generated-wrangler.jsonc')

	const bundleRaw = await fs.readFile(bundlePath, 'utf8')
	const bundle = JSON.parse(bundleRaw)
	if (!bundle.version || typeof bundle.version !== 'string') {
		throw new Error('Bundle JSON must include a string "version" field')
	}

	const r2Key = `mdx-artifacts/${bundle.version}.json`
	const config = await readConfig(configPath)
	const contentKv = config.kv_namespaces?.find(
		(entry) => entry.binding === 'CONTENT_KV',
	)
	if (!contentKv?.id) {
		throw new Error('CONTENT_KV namespace id missing from wrangler config')
	}

	const bucketName =
		config.r2_buckets?.find((entry) => entry.binding === 'MDX_ARTIFACTS')
			?.bucket_name ?? 'kcd-site-cf-preview-artifacts'

	runWrangler([
		'r2',
		'object',
		'put',
		`${bucketName}/${r2Key}`,
		'--file',
		bundlePath,
		'--config',
		configPath,
		'--remote',
	])

	const manifest = JSON.stringify({
		version: bundle.version,
		r2Key,
	})

	runWrangler([
		'kv',
		'key',
		'put',
		'mdx-manifest:current',
		manifest,
		'--namespace-id',
		contentKv.id,
		'--remote',
	])

	console.log(`Published ${r2Key} and updated mdx-manifest:current`)
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
