#!/usr/bin/env node
import { createHmac } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const workerDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function deriveSecret(label, refreshCacheSecret) {
	return createHmac('sha256', refreshCacheSecret).update(label).digest('hex')
}

function deriveOrEnv(key, label, refreshCacheSecret) {
	const fromEnv = process.env[key]
	if (typeof fromEnv === 'string' && fromEnv.trim()) return fromEnv.trim()
	return deriveSecret(label, refreshCacheSecret)
}

async function main() {
	const refreshCacheSecret = process.env.REFRESH_CACHE_SECRET
	if (!refreshCacheSecret) {
		throw new Error('REFRESH_CACHE_SECRET is required to derive preview secrets')
	}

	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? 'preview-account'
	const secrets = {
		NODE_ENV: 'production',
		PORT: '8788',
		MOCKS: 'false',
		FLY_APP_NAME: 'kentcdodds-com-staging',
		FLY_REGION: 'cf',
		FLY_MACHINE_ID: 'preview',
		DATABASE_URL: 'file:./preview.db',
		GITHUB_REF: process.env.GITHUB_REF ?? 'cursor/cloudflare-site-worker-2309',
		R2_BUCKET: deriveOrEnv('R2_BUCKET', 'preview:R2_BUCKET', refreshCacheSecret),
		R2_ENDPOINT: `https://${accountId}.r2.cloudflarestorage.com`,
		CALL_KENT_R2_BUCKET: deriveOrEnv(
			'CALL_KENT_R2_BUCKET',
			'preview:CALL_KENT_R2_BUCKET',
			refreshCacheSecret,
		),
		CALL_KENT_AUDIO_CF_QUEUE_ID: deriveOrEnv(
			'CALL_KENT_AUDIO_CF_QUEUE_ID',
			'preview:CALL_KENT_AUDIO_CF_QUEUE_ID',
			refreshCacheSecret,
		),
		SESSION_SECRET: deriveSecret('preview:SESSION_SECRET', refreshCacheSecret),
		MAGIC_LINK_SECRET: deriveSecret(
			'preview:MAGIC_LINK_SECRET',
			refreshCacheSecret,
		),
		INTERNAL_COMMAND_TOKEN: deriveSecret(
			'preview:INTERNAL_COMMAND_TOKEN',
			refreshCacheSecret,
		),
		CF_INTERNAL_SECRET: deriveSecret(
			'preview:CF_INTERNAL_SECRET',
			refreshCacheSecret,
		),
		DISCORD_ADMIN_USER_ID: deriveSecret(
			'preview:DISCORD_ADMIN_USER_ID',
			refreshCacheSecret,
		),
		DISCORD_BLUE_CHANNEL: deriveSecret(
			'preview:DISCORD_BLUE_CHANNEL',
			refreshCacheSecret,
		),
		DISCORD_BLUE_ROLE: deriveSecret('preview:DISCORD_BLUE_ROLE', refreshCacheSecret),
		DISCORD_BOT_TOKEN: deriveSecret('preview:DISCORD_BOT_TOKEN', refreshCacheSecret),
		DISCORD_CALL_KENT_CHANNEL: deriveSecret(
			'preview:DISCORD_CALL_KENT_CHANNEL',
			refreshCacheSecret,
		),
		DISCORD_CLIENT_ID: deriveSecret('preview:DISCORD_CLIENT_ID', refreshCacheSecret),
		DISCORD_CLIENT_SECRET: deriveSecret(
			'preview:DISCORD_CLIENT_SECRET',
			refreshCacheSecret,
		),
		DISCORD_GUILD_ID: deriveSecret('preview:DISCORD_GUILD_ID', refreshCacheSecret),
		DISCORD_LEADERBOARD_CHANNEL: deriveSecret(
			'preview:DISCORD_LEADERBOARD_CHANNEL',
			refreshCacheSecret,
		),
		DISCORD_MEMBER_ROLE: deriveSecret(
			'preview:DISCORD_MEMBER_ROLE',
			refreshCacheSecret,
		),
		DISCORD_PRIVATE_BOT_CHANNEL: deriveSecret(
			'preview:DISCORD_PRIVATE_BOT_CHANNEL',
			refreshCacheSecret,
		),
		DISCORD_RED_CHANNEL: deriveSecret(
			'preview:DISCORD_RED_CHANNEL',
			refreshCacheSecret,
		),
		DISCORD_RED_ROLE: deriveSecret('preview:DISCORD_RED_ROLE', refreshCacheSecret),
		DISCORD_SCOPES: 'identify email',
		DISCORD_YELLOW_CHANNEL: deriveSecret(
			'preview:DISCORD_YELLOW_CHANNEL',
			refreshCacheSecret,
		),
		DISCORD_YELLOW_ROLE: deriveSecret(
			'preview:DISCORD_YELLOW_ROLE',
			refreshCacheSecret,
		),
		MAILGUN_DOMAIN: 'preview.example.com',
		MAILGUN_SENDING_KEY: deriveSecret(
			'preview:MAILGUN_SENDING_KEY',
			refreshCacheSecret,
		),
		KIT_API_KEY: deriveSecret('preview:KIT_API_KEY', refreshCacheSecret),
		KIT_API_SECRET: deriveSecret('preview:KIT_API_SECRET', refreshCacheSecret),
		TWITTER_BEARER_TOKEN: deriveSecret(
			'preview:TWITTER_BEARER_TOKEN',
			refreshCacheSecret,
		),
		VERIFIER_API_KEY: deriveSecret(
			'preview:VERIFIER_API_KEY',
			refreshCacheSecret,
		),
		REFRESH_CACHE_SECRET: refreshCacheSecret,
		BOT_GITHUB_TOKEN: deriveOrEnv(
			'BOT_GITHUB_TOKEN',
			'preview:BOT_GITHUB_TOKEN',
			refreshCacheSecret,
		),
		CLOUDFLARE_ACCOUNT_ID: accountId,
		CLOUDFLARE_API_TOKEN: deriveOrEnv(
			'CLOUDFLARE_API_TOKEN',
			'preview:CLOUDFLARE_API_TOKEN',
			refreshCacheSecret,
		),
		CLOUDFLARE_AI_GATEWAY_ID: deriveOrEnv(
			'CLOUDFLARE_AI_GATEWAY_ID',
			'preview:CLOUDFLARE_AI_GATEWAY_ID',
			refreshCacheSecret,
		),
		CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN: deriveOrEnv(
			'CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN',
			'preview:CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN',
			refreshCacheSecret,
		),
		CLOUDFLARE_VECTORIZE_INDEX: deriveOrEnv(
			'CLOUDFLARE_VECTORIZE_INDEX',
			'preview:CLOUDFLARE_VECTORIZE_INDEX',
			refreshCacheSecret,
		),
		SEARCH_WORKER_URL:
			process.env.SEARCH_WORKER_URL ??
			'https://kcd-search-worker.kentcdodds.workers.dev',
		SEARCH_WORKER_TOKEN: deriveOrEnv(
			'SEARCH_WORKER_TOKEN',
			'preview:SEARCH_WORKER_TOKEN',
			refreshCacheSecret,
		),
		SIMPLECAST_KEY: deriveOrEnv(
			'SIMPLECAST_KEY',
			'preview:SIMPLECAST_KEY',
			refreshCacheSecret,
		),
		TRANSISTOR_API_SECRET: deriveOrEnv(
			'TRANSISTOR_API_SECRET',
			'preview:TRANSISTOR_API_SECRET',
			refreshCacheSecret,
		),
		CALL_KENT_PODCAST_ID: deriveOrEnv(
			'CALL_KENT_PODCAST_ID',
			'preview:CALL_KENT_PODCAST_ID',
			refreshCacheSecret,
		),
		CHATS_WITH_KENT_PODCAST_ID: deriveOrEnv(
			'CHATS_WITH_KENT_PODCAST_ID',
			'preview:CHATS_WITH_KENT_PODCAST_ID',
			refreshCacheSecret,
		),
		R2_ACCESS_KEY_ID: deriveOrEnv(
			'R2_ACCESS_KEY_ID',
			'preview:R2_ACCESS_KEY_ID',
			refreshCacheSecret,
		),
		R2_SECRET_ACCESS_KEY: deriveOrEnv(
			'R2_SECRET_ACCESS_KEY',
			'preview:R2_SECRET_ACCESS_KEY',
			refreshCacheSecret,
		),
		CALL_KENT_AUDIO_PROCESSOR_CALLBACK_SECRET: deriveOrEnv(
			'CALL_KENT_AUDIO_PROCESSOR_CALLBACK_SECRET',
			'preview:CALL_KENT_AUDIO_PROCESSOR_CALLBACK_SECRET',
			refreshCacheSecret,
		),
	}

	const outputPath =
		process.argv[2] ?? path.join(workerDir, '.wrangler/preview-secrets.json')
	await fs.mkdir(path.dirname(outputPath), { recursive: true })
	await fs.writeFile(outputPath, `${JSON.stringify(secrets, null, 2)}\n`)
	console.log(`Wrote ${outputPath}`)
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
