#!/usr/bin/env node
import { constants } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'

const workerDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const port = Number(process.env.SITE_WORKER_DEV_PORT ?? 8792)
const configPath = path.join(workerDir, 'wrangler.jsonc')
const bundlePath = path.join(workerDir, '.wrangler/local-e2e-bundle.json')

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

async function waitForHealthcheck() {
	const url = `http://127.0.0.1:${port}/healthcheck`
	for (let attempt = 0; attempt < 60; attempt += 1) {
		try {
			const response = await fetch(url)
			if (response.ok && (await response.text()) === 'OK') return
		} catch {
			// retry
		}
		await new Promise((resolve) => setTimeout(resolve, 500))
	}
	throw new Error(`Timed out waiting for ${url}`)
}

async function seedLocalArtifacts() {
	const bundle = {
		schemaVersion: 1,
		version: 'local-e2e',
		generatedAt: new Date().toISOString(),
		documents: {
			'blog/e2e-post': {
				contentDir: 'blog',
				slug: 'e2e-post',
				code: 'export default function Post() { return null }',
				esm: 'export default function Post() { return null }',
				frontmatter: { title: 'E2E Post' },
			},
		},
		blogList: [],
		dirLists: { blog: [], pages: [] },
		dataFiles: {},
	}

	await fs.mkdir(path.dirname(bundlePath), { recursive: true })
	await fs.writeFile(bundlePath, JSON.stringify(bundle))

	const r2Key = `mdx-artifacts/${bundle.version}.json`
	const manifest = JSON.stringify({
		version: bundle.version,
		r2Key,
	})

	run('npm', [
		'exec',
		'wrangler',
		'--',
		'r2',
		'object',
		'put',
		`kcd-site-cf-preview-artifacts/${r2Key}`,
		'--file',
		bundlePath,
		'--config',
		configPath,
		'--local',
	])

	run('npm', [
		'exec',
		'wrangler',
		'--',
		'kv',
		'key',
		'put',
		'mdx-manifest:current',
		manifest,
		'--binding',
		'CONTENT_KV',
		'--config',
		configPath,
		'--local',
	])
}

async function writeDevVars(secrets) {
	const lines = Object.entries(secrets).map(
		([key, value]) => `${key}=${JSON.stringify(value)}`,
	)
	await fs.writeFile(path.join(workerDir, '.dev.vars'), `${lines.join('\n')}\n`)
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
	PORT: '8792',
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

async function main() {
	run('npm', ['run', 'd1:migrations:apply:local', '--workspace', 'site-worker'])
	await ensureAssetsDirectory()
	await writeDevVars(localDevSecrets)
	await seedLocalArtifacts()

	const devProcess = spawn(
		'npm',
		[
			'exec',
			'wrangler',
			'--',
			'dev',
			'--config',
			configPath,
			'--port',
			String(port),
		],
		{
			cwd: workerDir,
			stdio: ['ignore', 'pipe', 'pipe'],
		},
	)

	let output = ''
	devProcess.stdout.on('data', (chunk) => {
		output += chunk.toString()
	})
	devProcess.stderr.on('data', (chunk) => {
		output += chunk.toString()
	})

	try {
		await waitForHealthcheck()

		const response = await fetch(`http://127.0.0.1:${port}/`)
		const body = await response.json()

		console.log(JSON.stringify(body, null, 2))

		if (!response.ok) {
			throw new Error(`Expected 200 from /, got ${response.status}`)
		}
		if (body.marker !== 'site-worker-placeholder-app') {
			throw new Error(`Unexpected marker: ${body.marker}`)
		}
		if (!body.prisma?.ok) {
			throw new Error(`PrismaRpc round-trip failed: ${JSON.stringify(body.prisma)}`)
		}
		if (!body.cache?.value?.marker) {
			throw new Error(`CacheRpc round-trip failed: ${JSON.stringify(body.cache)}`)
		}

		console.log('Local e2e passed')
	} finally {
		devProcess.kill('SIGTERM')
		if (/worker_loaders/i.test(output) && /unsupported|not supported/i.test(output)) {
			console.warn(
				'worker_loaders may be unsupported in local wrangler dev; verify loader path on deployed preview',
			)
		}
	}
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
