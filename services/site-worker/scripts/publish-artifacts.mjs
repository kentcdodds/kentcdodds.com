#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { publishViaEndpoint } from './publish-artifacts-lib.mjs'

const workerDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function usage() {
	console.error(
		'Usage: node scripts/publish-artifacts.mjs <bundle.json> [--config path/to/wrangler.jsonc] [--local] [--via-endpoint <url>]',
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

async function publishViaWrangler(bundlePath, configPath, local) {
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

	const r2Args = [
		'r2',
		'object',
		'put',
		`${bucketName}/${r2Key}`,
		'--file',
		bundlePath,
		'--config',
		configPath,
	]
	if (local) r2Args.push('--local')
	else r2Args.push('--remote')
	runWrangler(r2Args)

	const manifest = JSON.stringify({
		version: bundle.version,
		r2Key,
	})

	const kvArgs = [
		'kv',
		'key',
		'put',
		'mdx-manifest:current',
		manifest,
		'--config',
		configPath,
	]
	if (local) {
		kvArgs.push('--binding', 'CONTENT_KV', '--local')
	} else {
		kvArgs.push('--namespace-id', contentKv.id, '--remote')
	}
	runWrangler(kvArgs)

	// Invalidate the anonymous page cache like the endpoint path does —
	// cached documents embed URLs/content from the previous artifact bundle.
	const generationArgs = [
		'kv',
		'key',
		'put',
		'page-cache:generation',
		Date.now().toString(),
		'--config',
		configPath,
	]
	if (local) {
		generationArgs.push('--binding', 'CONTENT_KV', '--local')
	} else {
		generationArgs.push('--namespace-id', contentKv.id, '--remote')
	}
	runWrangler(generationArgs)

	console.log(
		`Published ${r2Key} and updated mdx-manifest:current (${local ? 'local' : 'remote'})`,
	)
}

async function main() {
	const bundlePath = process.argv[2]
	if (!bundlePath) usage()

	const viaEndpoint = getArgValue('--via-endpoint')
	if (viaEndpoint) {
		const { version, payload } = await publishViaEndpoint(bundlePath, viaEndpoint)
		console.log(`Published via ${viaEndpoint} (version ${version})`, payload)
		return
	}

	const local = process.argv.includes('--local')
	const defaultConfig = local
		? path.join(workerDir, 'wrangler.jsonc')
		: path.join(workerDir, 'generated-wrangler.jsonc')
	const configPath = getArgValue('--config') ?? defaultConfig

	await publishViaWrangler(bundlePath, configPath, local)
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
