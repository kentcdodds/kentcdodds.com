import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

function getWranglerEnv() {
	return {
		...process.env,
		WRANGLER_LOG_PATH:
			process.env.WRANGLER_LOG_PATH ?? path.join('other', 'wrangler-logs'),
	}
}

function ensureLogDir() {
	const p = getWranglerEnv().WRANGLER_LOG_PATH
	if (!p) return
	// If it's a file path we won't try to mkdir it.
	if (p.endsWith('.log')) return
	try {
		fs.mkdirSync(p, { recursive: true })
	} catch {
		// ignore
	}
}

function wranglerR2ObjectPath(bucket: string, key: string) {
	return `${bucket}/${key}`
}

function getWranglerNpxPackage() {
	// Pin by default for reproducibility in GitHub Actions.
	return process.env.WRANGLER_NPX_PACKAGE ?? 'wrangler@4.66.0'
}

function getObjectViaWrangler(bucket: string, key: string) {
	ensureLogDir()
	const objectPath = wranglerR2ObjectPath(bucket, key)
	return execFileSync(
		'npx',
		[
			getWranglerNpxPackage(),
			'r2',
			'object',
			'get',
			objectPath,
			'--remote',
			'--pipe',
		],
		{
			env: getWranglerEnv(),
			stdio: ['ignore', 'pipe', 'pipe'],
		},
	).toString('utf8')
}

function putObjectViaWrangler(bucket: string, key: string, body: string) {
	ensureLogDir()
	const objectPath = wranglerR2ObjectPath(bucket, key)
	const tmpFile = path.join(os.tmpdir(), `r2-manifest-${Date.now()}.json`)
	fs.writeFileSync(tmpFile, body, 'utf8')
	try {
		execFileSync(
			'npx',
			[
				getWranglerNpxPackage(),
				'r2',
				'object',
				'put',
				objectPath,
				'--remote',
				'--file',
				tmpFile,
				'--content-type',
				'application/json',
			],
			{
				env: getWranglerEnv(),
				stdio: ['ignore', 'pipe', 'pipe'],
			},
		)
	} finally {
		try {
			fs.unlinkSync(tmpFile)
		} catch {
			// ignore
		}
	}
}

export async function getJsonObject<T>({
	bucket,
	key,
}: {
	bucket: string
	key: string
}): Promise<T | null> {
	try {
		const text = getObjectViaWrangler(bucket, key)
		return JSON.parse(text) as T
	} catch (e: any) {
		// Missing key is normal on first run. Wrangler exits non-zero.
		const message = e instanceof Error ? e.message : String(e)
		if (/NoSuchKey|404|not found/i.test(message)) return null
		throw e
	}
}

export async function putJsonObject({
	bucket,
	key,
	value,
}: {
	bucket: string
	key: string
	value: unknown
}) {
	const body = JSON.stringify(value, null, 2)
	putObjectViaWrangler(bucket, key, body)
}

