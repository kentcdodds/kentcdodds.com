import { expect, test } from 'vitest'
import { setEnv } from '#tests/env-disposable.ts'
import { getWorkersAiRunUrl } from '../cloudflare-ai-utils.server.ts'

test('getWorkersAiRunUrl routes embeddinggemma requests through CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID', () => {
	using ignoredEnv = setEnv({
		CLOUDFLARE_ACCOUNT_ID: 'cf-account',
		CLOUDFLARE_AI_GATEWAY_ID: 'runtime-gateway',
		CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID: 'embedding-gateway',
	})

	const url = getWorkersAiRunUrl('@cf/google/embeddinggemma-300m')
	expect(url).toContain('/embedding-gateway/')
	expect(url).not.toContain('/runtime-gateway/')
})

test('getWorkersAiRunUrl keeps non-embedding models on CLOUDFLARE_AI_GATEWAY_ID', () => {
	using ignoredEnv = setEnv({
		CLOUDFLARE_ACCOUNT_ID: 'cf-account',
		CLOUDFLARE_AI_GATEWAY_ID: 'runtime-gateway',
		CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID: 'embedding-gateway',
	})

	const url = getWorkersAiRunUrl('@cf/openai/whisper-large-v3-turbo')
	expect(url).toContain('/runtime-gateway/')
	expect(url).not.toContain('/embedding-gateway/')
})

test('getWorkersAiRunUrl prefers explicit gatewayId overrides', () => {
	using ignoredEnv = setEnv({
		CLOUDFLARE_ACCOUNT_ID: 'cf-account',
		CLOUDFLARE_AI_GATEWAY_ID: 'runtime-gateway',
		CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID: 'embedding-gateway',
	})

	const url = getWorkersAiRunUrl({
		model: '@cf/google/embeddinggemma-300m',
		gatewayId: 'explicit-gateway',
	})
	expect(url).toContain('/explicit-gateway/')
	expect(url).not.toContain('/embedding-gateway/')
})
