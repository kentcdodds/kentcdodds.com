#!/usr/bin/env node
import { constants } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const workerDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const baseConfigPath = path.join(workerDir, 'wrangler.jsonc')
const generatedConfigPath = path.join(workerDir, 'generated-wrangler.jsonc')

const STAGING_RESOURCES = {
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

const PRODUCTION_RESOURCES = {
	d1: {
		name: 'kentcdodds-com-db',
		binding: 'APP_DB',
	},
	kv: [
		{ title: 'kentcdodds-com-cache', binding: 'SITE_CACHE_KV' },
		{ title: 'kentcdodds-com-content', binding: 'CONTENT_KV' },
	],
	r2: {
		name: 'kentcdodds-com-artifacts',
		binding: 'MDX_ARTIFACTS',
	},
}

function parseTarget() {
	const targetArg = process.argv.find((arg) => arg.startsWith('--target='))
	const target = targetArg?.split('=')[1] ?? 'staging'
	if (target !== 'staging' && target !== 'production') {
		throw new Error(`Invalid --target=${target}; expected staging or production`)
	}
	return target
}

function getResourcesForTarget(target) {
	return target === 'production' ? PRODUCTION_RESOURCES : STAGING_RESOURCES
}

// Use the Cloudflare REST API directly rather than parsing wrangler CLI
// output, which changes shape between wrangler versions.
async function cfApi(pathname, { method = 'GET', body } = {}) {
	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
	const response = await fetch(
		`https://api.cloudflare.com/client/v4/accounts/${accountId}${pathname}`,
		{
			method,
			headers: {
				authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
				'content-type': 'application/json',
			},
			body: body === undefined ? undefined : JSON.stringify(body),
		},
	)
	const payload = await response.json()
	if (!payload.success) {
		throw new Error(
			`Cloudflare API ${method} ${pathname} failed: ${JSON.stringify(payload.errors)}`,
		)
	}
	return payload.result
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
	// Only strip line comments. Block-comment regex must not run on this config:
	// globs like "**/*.wasm" contain `/*` and would be corrupted.
	return source.replace(/^\s*\/\/.*$/gm, '')
}

async function readBaseConfig() {
	const raw = await fs.readFile(baseConfigPath, 'utf8')
	return JSON.parse(stripJsoncComments(raw))
}

function isPlaceholderId(id) {
	return !id || String(id).startsWith('00000000-0000-0000')
}

function resolveTargetConfig(baseConfig, target) {
	if (target === 'production') {
		const production = baseConfig.env?.production
		if (!production) {
			throw new Error('Missing env.production block in wrangler.jsonc')
		}
		const { env: _env, ...shared } = baseConfig
		return { ...shared, ...production }
	}

	const { env: _env, ...staging } = baseConfig
	return staging
}

function resourcesProvisioned(config, resources) {
	const d1 = config.d1_databases?.find(
		(entry) => entry.binding === resources.d1.binding,
	)
	const siteCache = config.kv_namespaces?.find(
		(entry) => entry.binding === 'SITE_CACHE_KV',
	)
	const contentKv = config.kv_namespaces?.find(
		(entry) => entry.binding === 'CONTENT_KV',
	)

	return (
		d1?.database_id &&
		!isPlaceholderId(d1.database_id) &&
		siteCache?.id &&
		!isPlaceholderId(siteCache.id) &&
		contentKv?.id &&
		!isPlaceholderId(contentKv.id)
	)
}

async function ensureD1Database(databaseName) {
	const databases = await cfApi('/d1/database?per_page=100')
	const existing = databases.find((entry) => entry.name === databaseName)
	if (existing) {
		const databaseId = existing.uuid ?? existing.id
		console.log(`D1 database exists: ${databaseName} (${databaseId})`)
		return databaseId
	}

	const created = await cfApi('/d1/database', {
		method: 'POST',
		body: { name: databaseName },
	})
	const databaseId = created.uuid ?? created.id
	if (!databaseId) {
		throw new Error(`Could not determine D1 database id for ${databaseName}`)
	}
	console.log(`Created D1 database: ${databaseName} (${databaseId})`)
	return databaseId
}

async function ensureKvNamespace(title) {
	const namespaces = await cfApi('/storage/kv/namespaces?per_page=100')
	const existing = namespaces.find((entry) => entry.title === title)
	if (existing?.id) {
		console.log(`KV namespace exists: ${title} (${existing.id})`)
		return existing.id
	}

	const created = await cfApi('/storage/kv/namespaces', {
		method: 'POST',
		body: { title },
	})
	if (!created.id) {
		throw new Error(`Could not determine KV namespace id for ${title}`)
	}
	console.log(`Created KV namespace: ${title} (${created.id})`)
	return created.id
}

async function ensureR2Bucket(bucketName) {
	const listed = await cfApi('/r2/buckets')
	const buckets = listed.buckets ?? []
	if (buckets.some((entry) => entry.name === bucketName)) {
		console.log(`R2 bucket exists: ${bucketName}`)
		return
	}

	await cfApi('/r2/buckets', { method: 'POST', body: { name: bucketName } })
	console.log(`Created R2 bucket: ${bucketName}`)
}

async function writeGeneratedConfig({ config, buildSha, target }) {
	const output = {
		...config,
		vars: {
			...config.vars,
			BUILD_SHA: buildSha,
		},
	}

	await fs.mkdir(path.dirname(generatedConfigPath), { recursive: true })
	await fs.writeFile(
		generatedConfigPath,
		`${JSON.stringify(output, null, '\t')}\n`,
	)
	console.log(
		`Wrote ${path.relative(workerDir, generatedConfigPath)} (target=${target})`,
	)
}

async function main() {
	const target = parseTarget()
	const resources = getResourcesForTarget(target)
	const forceEnsure = process.argv.includes('--force-ensure')
	const buildSha =
		process.env.BUILD_SHA ??
		process.env.GITHUB_SHA?.slice(0, 12) ??
		'preview-local'

	if (!(await pathExists(baseConfigPath))) {
		throw new Error(`Missing base wrangler config at ${baseConfigPath}`)
	}

	const baseConfig = await readBaseConfig()
	const targetConfig = resolveTargetConfig(baseConfig, target)

	if (!forceEnsure && resourcesProvisioned(targetConfig, resources)) {
		const d1 = targetConfig.d1_databases.find(
			(entry) => entry.binding === resources.d1.binding,
		)
		const kvIds = Object.fromEntries(
			targetConfig.kv_namespaces.map((entry) => [entry.binding, entry.id]),
		)
		console.log(
			`${target} resources already provisioned in wrangler.jsonc; skipping Cloudflare API calls`,
		)
		await writeGeneratedConfig({
			config: targetConfig,
			buildSha,
			target,
		})
		return
	}

	if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) {
		throw new Error(
			'CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required for provisioning (or commit resource ids to wrangler.jsonc)',
		)
	}

	const databaseId = await ensureD1Database(resources.d1.name)
	const kvIds = {}
	for (const namespace of resources.kv) {
		kvIds[namespace.binding] = await ensureKvNamespace(namespace.title)
	}
	await ensureR2Bucket(resources.r2.name)

	const provisionedConfig = {
		...targetConfig,
		d1_databases: targetConfig.d1_databases.map((entry) =>
			entry.binding === resources.d1.binding
				? { ...entry, database_id: databaseId }
				: entry,
		),
		kv_namespaces: targetConfig.kv_namespaces.map((entry) => ({
			...entry,
			id: kvIds[entry.binding] ?? entry.id,
		})),
	}

	await writeGeneratedConfig({
		config: provisionedConfig,
		buildSha,
		target,
	})
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
