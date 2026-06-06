import type { ServerBuild } from 'react-router'
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
	clearRuntimeEnvSource,
	getEnv,
} from '../../site/app/utils/env.server.ts'
import {
	clearRuntimeBindingSource,
	getRuntimeBinding,
} from '../../site/app/utils/runtime-bindings.server.ts'
import { handleRequest } from './index'

afterEach(() => {
	clearRuntimeBindingSource()
	clearRuntimeEnvSource()
})

describe('site worker', () => {
	test('returns ok from GET /health', async () => {
		const response = await handleRequest(
			new Request('https://example.com/health'),
		)

		await expect(response.json()).resolves.toEqual({ ok: true })
		expect(response.status).toBe(200)
	})

	test('rejects non-GET /health requests', async () => {
		const response = await handleRequest(
			new Request('https://example.com/health', { method: 'POST' }),
		)

		await expect(response.json()).resolves.toEqual({
			ok: false,
			error: 'Method not allowed',
		})
		expect(response.status).toBe(405)
		expect(response.headers.get('Allow')).toBe('GET')
	})

	test('serves static assets from the ASSETS binding before React Router', async () => {
		const assetFetch = vi.fn(async () => {
			return new Response('asset body', {
				headers: { 'content-type': 'text/plain' },
			})
		})
		const getServerBuild = vi.fn<() => Promise<ServerBuild>>()
		const response = await handleRequest(
			new Request('https://example.com/build/app.js'),
			{ ASSETS: { fetch: assetFetch } },
			undefined,
			{ getServerBuild },
		)

		expect(assetFetch).toHaveBeenCalledOnce()
		expect(getServerBuild).not.toHaveBeenCalled()
		await expect(response.text()).resolves.toBe('asset body')
		expect(response.headers.get('content-type')).toBe('text/plain')
	})

	test('falls through missing assets to the React Router handler', async () => {
		const appDb = { prepare: vi.fn() }
		const response = await handleRequest(
			new Request('https://example.com/missing.js'),
			createWorkerEnv({
				APP_DB: appDb,
				ASSETS: {
					fetch: async () => new Response('missing', { status: 404 }),
				},
			}),
			undefined,
			{
				createCspNonce: () => 'test-nonce',
				getServerBuild: async () => createTestBuild(appDb),
			},
		)

		await expect(response.json()).resolves.toEqual({
			appDbBindingAvailable: true,
			cspNonce: 'test-nonce',
			searchWorkerToken: 'worker-search-token',
		})
	})

	test('bootstraps runtime env and bindings before React Router handles the request', async () => {
		const appDb = { prepare: vi.fn() }
		const response = await handleRequest(
			new Request('https://example.com/'),
			createWorkerEnv({
				APP_DB: appDb,
				SEARCH_WORKER_TOKEN: 'from-worker-env',
			}),
			undefined,
			{
				createCspNonce: () => 'test-nonce',
				getServerBuild: async () => createTestBuild(appDb),
			},
		)

		await expect(response.json()).resolves.toEqual({
			appDbBindingAvailable: true,
			cspNonce: 'test-nonce',
			searchWorkerToken: 'from-worker-env',
		})
	})
})

function createTestBuild(appDb: unknown): ServerBuild {
	return {
		assets: {
			entry: { imports: [], module: '/entry.js' },
			routes: {
				root: {
					id: 'root',
					path: '',
					module: '/root.js',
					hasAction: false,
					hasLoader: false,
					hasClientAction: false,
					hasClientLoader: false,
					hasClientMiddleware: false,
					hasErrorBoundary: false,
					clientActionModule: undefined,
					clientLoaderModule: undefined,
					clientMiddlewareModule: undefined,
					hydrateFallbackModule: undefined,
				},
			},
			url: '/build/manifest.js',
			version: 'test',
		},
		entry: {
			module: {
				default(
					_request,
					responseStatusCode,
					responseHeaders,
					_context,
					loadContext,
				) {
					return Response.json(
						{
							appDbBindingAvailable: getRuntimeBinding('APP_DB') === appDb,
							cspNonce: String(loadContext.cspNonce),
							searchWorkerToken: getEnv().SEARCH_WORKER_TOKEN,
						},
						{ headers: responseHeaders, status: responseStatusCode },
					)
				},
			},
		},
		routes: {
			root: {
				id: 'root',
				path: '',
				module: {
					default: function RootRoute() {
						return null
					},
				},
			},
		},
		publicPath: '/build/',
		assetsBuildDirectory: 'build',
		future: {
			unstable_subResourceIntegrity: false,
			unstable_trailingSlashAwareDataRequests: false,
			v8_middleware: false,
		},
		ssr: true,
		isSpaMode: false,
		prerender: [],
		routeDiscovery: { mode: 'lazy', manifestPath: '/__manifest' },
	}
}

function createWorkerEnv(overrides: Record<string, unknown> = {}) {
	return {
		NODE_ENV: 'production',
		PORT: '8788',
		MOCKS: 'true',
		FLY_APP_NAME: 'kcd-staging-worker',
		FLY_REGION: 'local',
		FLY_MACHINE_ID: 'worker',
		LITEFS_DIR: './prisma',
		DATABASE_URL: 'file:./prisma/sqlite.db',
		CACHE_DATABASE_PATH: 'other/cache.db',
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
		...overrides,
	}
}
