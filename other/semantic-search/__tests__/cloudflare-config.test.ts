import { expect, test } from 'vitest'
import { setEnv } from '#tests/env-disposable.ts'
import { getCloudflareConfig } from '../cloudflare.ts'

test('getCloudflareConfig prefers embedding gateway for indexing when configured', () => {
	using _env = setEnv({
		CLOUDFLARE_ACCOUNT_ID: 'cf-account',
		CLOUDFLARE_API_TOKEN: 'cf-token',
		CLOUDFLARE_AI_GATEWAY_ID: 'runtime-gateway',
		CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID: 'indexing-gateway',
		CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN: 'gateway-auth-token',
		CLOUDFLARE_VECTORIZE_INDEX: 'vector-index',
	})

	const config = getCloudflareConfig()
	expect(config.gatewayId).toBe('indexing-gateway')
})

test('getCloudflareConfig falls back to regular gateway when embedding override is unset', () => {
	using _env = setEnv({
		CLOUDFLARE_ACCOUNT_ID: 'cf-account',
		CLOUDFLARE_API_TOKEN: 'cf-token',
		CLOUDFLARE_AI_GATEWAY_ID: 'runtime-gateway',
		CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID: undefined,
		CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN: 'gateway-auth-token',
		CLOUDFLARE_VECTORIZE_INDEX: 'vector-index',
	})

	const config = getCloudflareConfig()
	expect(config.gatewayId).toBe('runtime-gateway')
})
