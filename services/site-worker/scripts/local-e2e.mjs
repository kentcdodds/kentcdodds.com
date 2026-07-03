#!/usr/bin/env node
import { constants } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const workerDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const port = Number(process.env.SITE_WORKER_DEV_PORT ?? 8792)
const configPath = path.join(workerDir, 'wrangler.jsonc')
const defaultBundlePath = '/tmp/bundle.json'

function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		cwd: workerDir,
		encoding: 'utf8',
		env: process.env,
		...options,
	})
	if (result.status !== 0) {
		throw new Error(
			`${command} ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`,
		)
	}
	return `${result.stdout}\n${result.stderr}`.trim()
}

async function ensureAssetsDirectory() {
	const assetsDir = path.join(workerDir, '../site/build/client')
	try {
		await fs.access(assetsDir, constants.F_OK)
	} catch {
		await fs.mkdir(assetsDir, { recursive: true })
		await fs.writeFile(
			path.join(assetsDir, 'healthcheck-assets-placeholder.txt'),
			'placeholder',
		)
	}
}

const localDevSecrets = {
	NODE_ENV: 'production',
	PORT: String(port),
	MOCKS: 'true',
	DATABASE_URL: 'file:./prisma/sqlite.db',
	BOT_GITHUB_TOKEN: 'token',
	CALL_KENT_PODCAST_ID: 'call-kent',
	CHATS_WITH_KENT_PODCAST_ID: 'chats-with-kent',
	KIT_API_KEY: 'kit-key',
	KIT_API_SECRET: 'kit-secret',
	DISCORD_ADMIN_USER_ID: 'discord-admin',
	DISCORD_BLUE_CHANNEL: 'discord-blue-channel',
	DISCORD_BLUE_ROLE: 'discord-blue-role',
	DISCORD_BOT_TOKEN: 'discord-bot-token',
	DISCORD_CALL_KENT_CHANNEL: 'discord-call-kent-channel',
	DISCORD_CLIENT_ID: 'discord-client-id',
	DISCORD_CLIENT_SECRET: 'discord-client-secret',
	DISCORD_GUILD_ID: 'discord-guild',
	DISCORD_LEADERBOARD_CHANNEL: 'discord-leaderboard',
	DISCORD_MEMBER_ROLE: 'discord-member-role',
	DISCORD_PRIVATE_BOT_CHANNEL: 'discord-private-channel',
	DISCORD_RED_CHANNEL: 'discord-red-channel',
	DISCORD_RED_ROLE: 'discord-red-role',
	DISCORD_SCOPES: 'identify email',
	DISCORD_YELLOW_CHANNEL: 'discord-yellow-channel',
	DISCORD_YELLOW_ROLE: 'discord-yellow-role',
	INTERNAL_COMMAND_TOKEN: 'internal-command-token',
	MAGIC_LINK_SECRET: 'magic-link-secret',
	MAILGUN_DOMAIN: 'example.com',
	MAILGUN_SENDING_KEY: 'mailgun-key',
	REFRESH_CACHE_SECRET: 'refresh-cache-secret',
	SESSION_SECRET: 'session-secret',
	SIMPLECAST_KEY: 'simplecast-key',
	TRANSISTOR_API_SECRET: 'transistor-secret',
	TWITTER_BEARER_TOKEN: 'twitter-token',
	VERIFIER_API_KEY: 'verifier-key',
	CF_INTERNAL_SECRET: 'cf-internal-secret',
	SEARCH_WORKER_URL: 'https://mock.search-worker.local',
	SEARCH_WORKER_TOKEN: 'worker-search-token',
	CLOUDFLARE_ACCOUNT_ID: 'cloudflare-account',
	CLOUDFLARE_API_TOKEN: 'cloudflare-api-token',
	CLOUDFLARE_AI_GATEWAY_ID: 'cloudflare-ai-gateway',
	CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN: 'cloudflare-ai-gateway-token',
	CLOUDFLARE_VECTORIZE_INDEX: 'cloudflare-vectorize-index',
	R2_BUCKET: 'r2-bucket',
	R2_ACCESS_KEY_ID: 'r2-access-key',
	R2_SECRET_ACCESS_KEY: 'r2-secret-key',
	CALL_KENT_R2_BUCKET: 'call-kent-r2-bucket',
	CALL_KENT_AUDIO_CF_QUEUE_ID: 'call-kent-audio-queue',
	CALL_KENT_AUDIO_PROCESSOR_CALLBACK_SECRET: 'call-kent-audio-secret',
}

async function writeDevVars(secrets) {
	const lines = Object.entries(secrets).map(
		([key, value]) => `${key}=${JSON.stringify(value)}`,
	)
	await fs.writeFile(path.join(workerDir, '.dev.vars'), `${lines.join('\n')}\n`)
}

async function main() {
	const bundlePath = process.argv[2] ?? defaultBundlePath
	try {
		await fs.access(bundlePath, constants.F_OK)
	} catch {
		throw new Error(`Bundle not found at ${bundlePath}`)
	}

	console.log('Applying D1 migrations locally...')
	run('npm', ['run', 'd1:migrations:apply:local', '--workspace', 'site-worker'])

	console.log('Seeding preview D1 locally...')
	run('node', [
		path.join(workerDir, 'scripts/seed-preview-d1.mjs'),
		'--local',
		'--config',
		configPath,
	])

	await ensureAssetsDirectory()
	await writeDevVars(localDevSecrets)

	console.log(`Publishing artifacts from ${bundlePath}...`)
	run('node', [
		path.join(workerDir, 'scripts/publish-artifacts.mjs'),
		bundlePath,
		'--config',
		configPath,
		'--local',
	])

	console.log('Local e2e setup complete.')
	console.log(
		`Start the parent worker with: npm run dev --workspace site-worker (port ${port})`,
	)
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
