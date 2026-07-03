#!/usr/bin/env node
import { constants } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const workerDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const baseConfigPath = path.join(workerDir, 'wrangler.jsonc')
const generatedConfigPath = path.join(workerDir, 'generated-wrangler.jsonc')

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
	return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

async function readBaseConfig() {
	const raw = await fs.readFile(baseConfigPath, 'utf8')
	return JSON.parse(stripJsoncComments(raw))
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
