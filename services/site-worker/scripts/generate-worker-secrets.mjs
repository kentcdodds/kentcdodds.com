#!/usr/bin/env node
import { createHmac } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const workerDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function parseTarget() {
	const targetArg = process.argv.find((arg) => arg.startsWith('--target='))
	const target = targetArg?.split('=')[1] ?? 'staging'
	if (target !== 'staging' && target !== 'production') {
		throw new Error(`Invalid --target=${target}; expected staging or production`)
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

async function main() {
	const target = parseTarget()
	const derivedFallbacks = []

	const refreshCacheSecret = process.env.REFRESH_CACHE_SECRET
	if (!refreshCacheSecret) {
		throw new Error('REFRESH_CACHE_SECRET is required to derive worker secrets')
	}

	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? 'preview-account'
	const secretPrefix = `${target}:`
	const secrets = {
		NODE_ENV: 'production',
		PORT: '8788',
		MOCKS: 'false',
		DATABASE_URL: 'file:./preview.db',
		GITHUB_REF: process.env.GITHUB_REF ?? 'refs/heads/main',
		R2_BUCKET: deriveOrEnv(
			'R2_BUCKET',
			`${secretPrefix}R2_BUCKET`,
			refreshCacheSecret,
			derivedFallbacks,
		),
		R2_ENDPOINT: `https://${accountId}.r2.cloudflarestorage.com`,
		CALL_KENT_R2_BUCKET: deriveOrEnv(
			'CALL_KENT_R2_BUCKET',
			`${secretPrefix}CALL_KENT_R2_BUCKET`,
			refreshCacheSecret,
			derivedFallbacks,
		),
		CALL_KENT_AUDIO_CF_QUEUE_ID: deriveOrEnv(
			'CALL_KENT_AUDIO_CF_QUEUE_ID',
			`${secretPrefix}CALL_KENT_AUDIO_CF_QUEUE_ID`,
			refreshCacheSecret,
			derivedFallbacks,
		),
		SESSION_SECRET: deriveSecret(
			`${secretPrefix}SESSION_SECRET`,
			refreshCacheSecret,
		),
		CF_INTERNAL_SECRET: deriveSecret(
			`${secretPrefix}CF_INTERNAL_SECRET`,
			refreshCacheSecret,
		),
		DISCORD_ADMIN_USER_ID: deriveSecret(
			`${secretPrefix}DISCORD_ADMIN_USER_ID`,
			refreshCacheSecret,
		),
		DISCORD_BLUE_CHANNEL: deriveSecret(
			`${secretPrefix}DISCORD_BLUE_CHANNEL`,
			refreshCacheSecret,
		),
		DISCORD_BLUE_ROLE: deriveSecret(
			`${secretPrefix}DISCORD_BLUE_ROLE`,
			refreshCacheSecret,
		),
		DISCORD_BOT_TOKEN: deriveSecret(
			`${secretPrefix}DISCORD_BOT_TOKEN`,
			refreshCacheSecret,
		),
		DISCORD_CALL_KENT_CHANNEL: deriveSecret(
			`${secretPrefix}DISCORD_CALL_KENT_CHANNEL`,
			refreshCacheSecret,
		),
		DISCORD_CLIENT_ID: deriveSecret(
			`${secretPrefix}DISCORD_CLIENT_ID`,
			refreshCacheSecret,
		),
		DISCORD_CLIENT_SECRET: deriveSecret(
			`${secretPrefix}DISCORD_CLIENT_SECRET`,
			refreshCacheSecret,
		),
		DISCORD_GUILD_ID: deriveSecret(
			`${secretPrefix}DISCORD_GUILD_ID`,
			refreshCacheSecret,
		),
		DISCORD_LEADERBOARD_CHANNEL: deriveSecret(
			`${secretPrefix}DISCORD_LEADERBOARD_CHANNEL`,
			refreshCacheSecret,
		),
		DISCORD_MEMBER_ROLE: deriveSecret(
			`${secretPrefix}DISCORD_MEMBER_ROLE`,
			refreshCacheSecret,
		),
		DISCORD_PRIVATE_BOT_CHANNEL: deriveSecret(
			`${secretPrefix}DISCORD_PRIVATE_BOT_CHANNEL`,
			refreshCacheSecret,
		),
		DISCORD_RED_CHANNEL: deriveSecret(
			`${secretPrefix}DISCORD_RED_CHANNEL`,
			refreshCacheSecret,
		),
		DISCORD_RED_ROLE: deriveSecret(
			`${secretPrefix}DISCORD_RED_ROLE`,
			refreshCacheSecret,
		),
		DISCORD_SCOPES: 'identify email',
		DISCORD_YELLOW_CHANNEL: deriveSecret(
			`${secretPrefix}DISCORD_YELLOW_CHANNEL`,
			refreshCacheSecret,
		),
		DISCORD_YELLOW_ROLE: deriveSecret(
			`${secretPrefix}DISCORD_YELLOW_ROLE`,
			refreshCacheSecret,
		),
		MAILGUN_DOMAIN: 'preview.example.com',
		MAILGUN_SENDING_KEY: deriveSecret(
			`${secretPrefix}MAILGUN_SENDING_KEY`,
			refreshCacheSecret,
		),
		KIT_API_KEY: deriveSecret(
			`${secretPrefix}KIT_API_KEY`,
			refreshCacheSecret,
		),
		KIT_API_SECRET: deriveSecret(
			`${secretPrefix}KIT_API_SECRET`,
			refreshCacheSecret,
		),
		TWITTER_BEARER_TOKEN: deriveSecret(
			`${secretPrefix}TWITTER_BEARER_TOKEN`,
			refreshCacheSecret,
		),
		VERIFIER_API_KEY: deriveSecret(
			`${secretPrefix}VERIFIER_API_KEY`,
			refreshCacheSecret,
		),
		REFRESH_CACHE_SECRET: refreshCacheSecret,
		OG_IMAGE_SECRET: deriveSecret(
			`${secretPrefix}OG_IMAGE_SECRET`,
			refreshCacheSecret,
		),
		BOT_GITHUB_TOKEN: deriveOrEnv(
			'BOT_GITHUB_TOKEN',
			`${secretPrefix}BOT_GITHUB_TOKEN`,
			refreshCacheSecret,
			derivedFallbacks,
		),
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
		CALL_KENT_AUDIO_PROCESSOR_CALLBACK_SECRET: deriveOrEnv(
			'CALL_KENT_AUDIO_PROCESSOR_CALLBACK_SECRET',
			`${secretPrefix}CALL_KENT_AUDIO_PROCESSOR_CALLBACK_SECRET`,
			refreshCacheSecret,
			derivedFallbacks,
		),
	}

	const defaultOutputName =
		target === 'production' ? 'production-secrets.json' : 'preview-secrets.json'
	const outputPath =
		process.argv.find((arg) => !arg.startsWith('--') && arg.endsWith('.json')) ??
		path.join(workerDir, '.wrangler', defaultOutputName)
	await fs.mkdir(path.dirname(outputPath), { recursive: true })
	await fs.writeFile(outputPath, `${JSON.stringify(secrets, null, 2)}\n`)
	console.log(`Wrote ${outputPath}`)

	if (derivedFallbacks.length > 0) {
		const banner = [
			'',
			'⚠️  CUTOVER BLOCKER: the following secrets used derived fallbacks',
			`(target=${target}). Set real GitHub/production secrets before cutover:`,
			...derivedFallbacks.map((key) => `  - ${key}`),
			'',
		].join('\n')
		console.warn(banner)
		if (process.env.GITHUB_ACTIONS === 'true') {
			console.warn(`::warning title=Derived worker secrets::${derivedFallbacks.join(', ')}`)
		}
	}
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
