#!/usr/bin/env node
import { createHmac } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const workerDir = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'..',
)

function parseTarget() {
	const targetArg = process.argv.find((arg) => arg.startsWith('--target='))
	const target = targetArg?.split('=')[1] ?? 'production'
	if (target !== 'production') {
		throw new Error(`Invalid --target=${target}; only production is supported`)
	}
	return target
}

function deriveSecret(label, refreshCacheSecret) {
	return createHmac('sha256', refreshCacheSecret).update(label).digest('hex')
}

function deriveOrEnv(key, label, refreshCacheSecret, derivedFallbacks) {
	const fromEnv = process.env[key]
	if (typeof fromEnv === 'string' && fromEnv.trim()) return fromEnv.trim()
	derivedFallbacks.push(key)
	return deriveSecret(label, refreshCacheSecret)
}

/**
 * Real-integration secrets are set directly on the worker. We never emit a
 * derived fallback because `wrangler secret bulk` would clobber the real value.
 */
function integrationSecret({ key, omittedForProduction }) {
	omittedForProduction.push(key)
	return undefined
}

/**
 * Secrets that must hold real Fly-parity integration values in production.
 * `SESSION_SECRET` in particular must match Fly's value so sessions survive
 * the cutover.
 */
const INTEGRATION_SECRET_KEYS = [
	'SESSION_SECRET',
	'CF_INTERNAL_SECRET',
	'DISCORD_ADMIN_USER_ID',
	'DISCORD_BLUE_CHANNEL',
	'DISCORD_BLUE_ROLE',
	'DISCORD_BOT_TOKEN',
	'DISCORD_CALL_KENT_CHANNEL',
	'DISCORD_CLIENT_ID',
	'DISCORD_CLIENT_SECRET',
	'DISCORD_GUILD_ID',
	'DISCORD_LEADERBOARD_CHANNEL',
	'DISCORD_MEMBER_ROLE',
	'DISCORD_PRIVATE_BOT_CHANNEL',
	'DISCORD_RED_CHANNEL',
	'DISCORD_RED_ROLE',
	'DISCORD_YELLOW_CHANNEL',
	'DISCORD_YELLOW_ROLE',
	'KIT_API_KEY',
	'KIT_API_SECRET',
	'TWITTER_BEARER_TOKEN',
	'VERIFIER_API_KEY',
	'OG_IMAGE_SECRET',
	// Config values CI does not have as GitHub secrets: copied from Fly during
	// cutover, so production bulk uploads must never overwrite them.
	'R2_BUCKET',
	'CALL_KENT_R2_BUCKET',
	'CALL_KENT_AUDIO_CF_QUEUE_ID',
	// Must match the secret set manually on kcd-call-kent-audio-worker; the
	// production value was synced from Fly and may not equal the GitHub copy.
	'CALL_KENT_AUDIO_PROCESSOR_CALLBACK_SECRET',
]

async function main() {
	const target = parseTarget()
	const derivedFallbacks = []
	const omittedForProduction = []

	const refreshCacheSecret = process.env.REFRESH_CACHE_SECRET
	if (!refreshCacheSecret) {
		throw new Error('REFRESH_CACHE_SECRET is required to derive worker secrets')
	}

	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? 'production-account'
	const secretPrefix = `${target}:`
	const integrationSecrets = {}
	for (const key of INTEGRATION_SECRET_KEYS) {
		const value = integrationSecret({
			key,
			omittedForProduction,
		})
		if (value !== undefined) integrationSecrets[key] = value
	}

	const secrets = {
		...integrationSecrets,
		NODE_ENV: 'production',
		MOCKS: 'false',
		DATABASE_URL: 'file:./production.db',
		R2_ENDPOINT: `https://${accountId}.r2.cloudflarestorage.com`,
		DISCORD_SCOPES: 'identify email',
		REFRESH_CACHE_SECRET: refreshCacheSecret,
		CLOUDFLARE_ACCOUNT_ID: accountId,
		CLOUDFLARE_API_TOKEN: deriveOrEnv(
			'CLOUDFLARE_API_TOKEN',
			`${secretPrefix}CLOUDFLARE_API_TOKEN`,
			refreshCacheSecret,
			derivedFallbacks,
		),
		CLOUDFLARE_AI_GATEWAY_ID: deriveOrEnv(
			'CLOUDFLARE_AI_GATEWAY_ID',
			`${secretPrefix}CLOUDFLARE_AI_GATEWAY_ID`,
			refreshCacheSecret,
			derivedFallbacks,
		),
		CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN: deriveOrEnv(
			'CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN',
			`${secretPrefix}CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN`,
			refreshCacheSecret,
			derivedFallbacks,
		),
		CLOUDFLARE_VECTORIZE_INDEX: deriveOrEnv(
			'CLOUDFLARE_VECTORIZE_INDEX',
			`${secretPrefix}CLOUDFLARE_VECTORIZE_INDEX`,
			refreshCacheSecret,
			derivedFallbacks,
		),
		SEARCH_WORKER_URL:
			process.env.SEARCH_WORKER_URL ??
			'https://kcd-search-worker.kentcdodds.workers.dev',
		SEARCH_WORKER_TOKEN: deriveOrEnv(
			'SEARCH_WORKER_TOKEN',
			`${secretPrefix}SEARCH_WORKER_TOKEN`,
			refreshCacheSecret,
			derivedFallbacks,
		),
		SIMPLECAST_KEY: deriveOrEnv(
			'SIMPLECAST_KEY',
			`${secretPrefix}SIMPLECAST_KEY`,
			refreshCacheSecret,
			derivedFallbacks,
		),
		TRANSISTOR_API_SECRET: deriveOrEnv(
			'TRANSISTOR_API_SECRET',
			`${secretPrefix}TRANSISTOR_API_SECRET`,
			refreshCacheSecret,
			derivedFallbacks,
		),
		CALL_KENT_PODCAST_ID: deriveOrEnv(
			'CALL_KENT_PODCAST_ID',
			`${secretPrefix}CALL_KENT_PODCAST_ID`,
			refreshCacheSecret,
			derivedFallbacks,
		),
		CHATS_WITH_KENT_PODCAST_ID: deriveOrEnv(
			'CHATS_WITH_KENT_PODCAST_ID',
			`${secretPrefix}CHATS_WITH_KENT_PODCAST_ID`,
			refreshCacheSecret,
			derivedFallbacks,
		),
		R2_ACCESS_KEY_ID: deriveOrEnv(
			'R2_ACCESS_KEY_ID',
			`${secretPrefix}R2_ACCESS_KEY_ID`,
			refreshCacheSecret,
			derivedFallbacks,
		),
		R2_SECRET_ACCESS_KEY: deriveOrEnv(
			'R2_SECRET_ACCESS_KEY',
			`${secretPrefix}R2_SECRET_ACCESS_KEY`,
			refreshCacheSecret,
			derivedFallbacks,
		),
	}

	if (derivedFallbacks.length > 0) {
		const banner = [
			'',
			'⚠️  PRODUCTION SECRET CONFIGURATION ERROR: the following secrets used derived fallbacks',
			`(target=${target}). Set real GitHub/production secrets before deploy:`,
			...derivedFallbacks.map((key) => `  - ${key}`),
			'',
		].join('\n')
		console.warn(banner)
		if (process.env.GITHUB_ACTIONS === 'true') {
			console.warn(
				`::warning title=Derived worker secrets::${derivedFallbacks.join(', ')}`,
			)
		}
		if (target === 'production') {
			// A derived placeholder uploaded via `wrangler secret bulk` would
			// overwrite a real production value. Refuse rather than clobber.
			console.error(
				'Refusing to emit derived fallbacks for production secrets.',
			)
			process.exit(1)
		}
	}

	const defaultOutputName = 'production-secrets.json'
	const outputPath =
		process.argv.find(
			(arg) => !arg.startsWith('--') && arg.endsWith('.json'),
		) ?? path.join(workerDir, '.wrangler', defaultOutputName)
	await fs.mkdir(path.dirname(outputPath), { recursive: true })
	await fs.writeFile(outputPath, `${JSON.stringify(secrets, null, 2)}\n`)
	console.log(`Wrote ${outputPath}`)

	if (omittedForProduction.length > 0) {
		console.log(
			[
				'',
				'The following integration secrets are not in the CI env and were',
				'omitted from the bulk upload (existing values on the worker are',
				'preserved; see docs/agents/cloudflare-worker-architecture.md):',
				...omittedForProduction.map((key) => `  - ${key}`),
				'',
			].join('\n'),
		)
	}
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
