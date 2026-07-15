import { expect, test, vi } from 'vitest'
import { generateCallKentEpisodeMetadataWithWorkersAi } from '../cloudflare-ai-call-kent-metadata.server.ts'
import { transcribeMp3WithWorkersAi } from '../cloudflare-ai-transcription.server.ts'
import { setEnv } from '#tests/env-disposable.ts'

const workersAiEnv = {
	CLOUDFLARE_API_TOKEN: 'MOCK_CLOUDFLARE_API_TOKEN',
	CLOUDFLARE_ACCOUNT_ID: 'mock-account',
	CLOUDFLARE_AI_GATEWAY_ID: 'mock-gateway',
	CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN: 'MOCK_GATEWAY_TOKEN',
}

test('Call Kent transcription sends Workers AI a timeout signal', async () => {
	using _env = setEnv(workersAiEnv)
	const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
		Response.json({
			result: { text: 'Caller transcript' },
		}),
	)
	try {
		await transcribeMp3WithWorkersAi({
			mp3: new Uint8Array([1, 2, 3]),
			model: '@cf/openai/whisper',
		})
		expect(fetchSpy.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal)
	} finally {
		fetchSpy.mockRestore()
	}
})

test('Call Kent metadata generation sends Workers AI a timeout signal', async () => {
	using _env = setEnv(workersAiEnv)
	const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
		Response.json({
			result: {
				response: JSON.stringify({
					title: 'Episode title',
					description: 'Episode description.',
					keywords: 'testing',
				}),
			},
		}),
	)
	try {
		await generateCallKentEpisodeMetadataWithWorkersAi({
			transcript: 'Caller: Question.\n\nKent: Answer.',
			model: '@cf/meta/llama-3.1-8b-instruct',
		})
		expect(fetchSpy.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal)
	} finally {
		fetchSpy.mockRestore()
	}
})
