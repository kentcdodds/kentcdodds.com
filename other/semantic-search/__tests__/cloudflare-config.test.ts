import { expect, test } from 'vitest'
import { getCloudflareConfig } from '../cloudflare.ts'

async function withEnv(
	overrides: Record<string, string | undefined>,
	callback: () => Promise<void> | void,
) {
	const previous = new Map<string, string | undefined>()

	for (const [key, value] of Object.entries(overrides)) {
		previous.set(key, process.env[key])
		if (value === undefined) {
			delete process.env[key]
		} else {
			process.env[key] = value
		}
	}

	try {
		await callback()
	} finally {
		for (const [key, value] of previous.entries()) {
			if (value === undefined) {
				delete process.env[key]
			} else {
				process.env[key] = value
			}
		}
	}
}

test('getCloudflareConfig prefers embedding gateway for indexing when configured', async () => {
	await withEnv(
		{
			CLOUDFLARE_ACCOUNT_ID: 'cf-account',
			CLOUDFLARE_API_TOKEN: 'cf-token',
			CLOUDFLARE_AI_GATEWAY_ID: 'runtime-gateway',
			CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID: 'indexing-gateway',
			CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN: 'gateway-auth-token',
			CLOUDFLARE_VECTORIZE_INDEX: 'vector-index',
		},
		() => {
			const config = getCloudflareConfig()
			expect(config.gatewayId).toBe('indexing-gateway')
		},
	)
})

test('getCloudflareConfig falls back to regular gateway when embedding override is unset', async () => {
	await withEnv(
		{
			CLOUDFLARE_ACCOUNT_ID: 'cf-account',
			CLOUDFLARE_API_TOKEN: 'cf-token',
			CLOUDFLARE_AI_GATEWAY_ID: 'runtime-gateway',
			CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID: undefined,
			CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN: 'gateway-auth-token',
			CLOUDFLARE_VECTORIZE_INDEX: 'vector-index',
		},
		() => {
			const config = getCloudflareConfig()
			expect(config.gatewayId).toBe('runtime-gateway')
		},
	)
})
