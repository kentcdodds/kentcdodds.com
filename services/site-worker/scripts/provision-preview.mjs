#!/usr/bin/env node
import { constants } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const workerDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const baseConfigPath = path.join(workerDir, 'wrangler.jsonc')
const generatedConfigPath = path.join(workerDir, '.wrangler/generated-wrangler.jsonc')

const RESOURCES = {
	d1: {
		name: 'kentcdodds-com-staging-app-db',
		binding: 'APP_DB',
	},
	kv: [
		{ title: 'kcd-site-cf-preview-cache', binding: 'SITE_CACHE_KV' },
		{ title: 'kcd-site-cf-preview-content', binding: 'CONTENT_KV' },
	],
	r2: {
		name: 'kcd-site-cf-preview-artifacts',
		binding: 'MDX_ARTIFACTS',
	},
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

function parseJsonOutput(output) {
	const start = output.indexOf('{')
	const arrayStart = output.indexOf('[')
	const jsonStart =
		start === -1
			? arrayStart
			: arrayStart === -1
				? start
				: Math.min(start, arrayStart)
	if (jsonStart === -1) {
		throw new Error(`Could not parse wrangler JSON output:\n${output}`)
	}
	return JSON.parse(output.slice(jsonStart))
}

async function pathExists(filePath) {
	try {
		await fs.access(filePath, constants.F_OK)
		return true
	} catch {
		return false
	}
}

function stripJsoncComments(source) {
	return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

async function readBaseConfig() {
	const raw = await fs.readFile(baseConfigPath, 'utf8')
	return JSON.parse(stripJsoncComments(raw))
}

function findD1Database(listOutput, databaseName) {
	const payload = parseJsonOutput(listOutput)
	const databases = Array.isArray(payload) ? payload : payload.result
	return databases?.find((entry) => entry.name === databaseName)
}

function findKvNamespace(listOutput, title) {
	const payload = parseJsonOutput(listOutput)
	const namespaces = Array.isArray(payload) ? payload : payload.result
	return namespaces?.find((entry) => entry.title === title)
}

async function ensureD1Database(databaseName) {
	const listed = runWrangler(['d1', 'list', '--json'])
	const existing = findD1Database(listed, databaseName)
	if (existing?.uuid) {
		console.log(`D1 database exists: ${databaseName} (${existing.uuid})`)
		return existing.uuid
	}

	const createdOutput = runWrangler(['d1', 'create', databaseName, '--json'])
	const created = parseJsonOutput(createdOutput)
	const databaseId = created.uuid ?? created.database_id ?? created.id
	if (!databaseId) {
		throw new Error(`Could not determine D1 database id for ${databaseName}`)
	}
	console.log(`Created D1 database: ${databaseName} (${databaseId})`)
	return databaseId
}

async function ensureKvNamespace(title) {
	const listed = runWrangler(['kv', 'namespace', 'list', '--json'])
	const existing = findKvNamespace(listed, title)
	if (existing?.id) {
		console.log(`KV namespace exists: ${title} (${existing.id})`)
		return existing.id
	}

	const createdOutput = runWrangler(['kv', 'namespace', 'create', title, '--json'])
	const created = parseJsonOutput(createdOutput)
	const namespaceId = created.id ?? created.namespace_id
	if (!namespaceId) {
		throw new Error(`Could not determine KV namespace id for ${title}`)
	}
	console.log(`Created KV namespace: ${title} (${namespaceId})`)
	return namespaceId
}

async function ensureR2Bucket(bucketName) {
	const listed = runWrangler(['r2', 'bucket', 'list', '--json'])
	const payload = parseJsonOutput(listed)
	const buckets = Array.isArray(payload) ? payload : payload.buckets ?? payload.result
	const existing = buckets?.find((entry) => entry.name === bucketName)
	if (existing) {
		console.log(`R2 bucket exists: ${bucketName}`)
		return
	}

	runWrangler(['r2', 'bucket', 'create', bucketName])
	console.log(`Created R2 bucket: ${bucketName}`)
}

async function writeGeneratedConfig({
	databaseId,
	kvIds,
	buildSha,
}) {
	const config = await readBaseConfig()

	config.d1_databases = config.d1_databases.map((entry) =>
		entry.binding === RESOURCES.d1.binding
			? { ...entry, database_id: databaseId }
			: entry,
	)

	config.kv_namespaces = config.kv_namespaces.map((entry) => ({
		...entry,
		id: kvIds[entry.binding] ?? entry.id,
	}))

	config.vars = {
		...config.vars,
		BUILD_SHA: buildSha,
	}

	await fs.mkdir(path.dirname(generatedConfigPath), { recursive: true })
	await fs.writeFile(
		generatedConfigPath,
		`${JSON.stringify(config, null, '\t')}\n`,
	)
	console.log(`Wrote ${path.relative(workerDir, generatedConfigPath)}`)
}

async function main() {
	if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) {
		throw new Error(
			'CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required for provisioning',
		)
	}

	const buildSha =
		process.env.BUILD_SHA ??
		process.env.GITHUB_SHA?.slice(0, 12) ??
		'preview-local'

	const databaseId = await ensureD1Database(RESOURCES.d1.name)
	const kvIds = {}
	for (const namespace of RESOURCES.kv) {
		kvIds[namespace.binding] = await ensureKvNamespace(namespace.title)
	}
	await ensureR2Bucket(RESOURCES.r2.name)

	if (!(await pathExists(baseConfigPath))) {
		throw new Error(`Missing base wrangler config at ${baseConfigPath}`)
	}

	await writeGeneratedConfig({ databaseId, kvIds, buildSha })
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
