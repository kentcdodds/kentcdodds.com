import { expect, test, vi } from 'vitest'
import {
	clearRuntimeEnvSource,
	setRuntimeEnvSource,
} from '#app/utils/env.server.ts'
import { transcribeMp3WithWorkersAi } from '../cloudflare-ai-transcription.server.ts'

test('rejects base64-only transcription model unless explicitly allowed', async () => {
	const fetchMock = vi.fn()
	vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)
	setRuntimeEnvSource({
		CLOUDFLARE_AI_TRANSCRIPTION_MODEL: '@cf/openai/whisper-large-v3-turbo',
		CLOUDFLARE_AI_TRANSCRIPTION_ALLOW_BASE64: 'false',
	})

	try {
		await expect(
			transcribeMp3WithWorkersAi({
				mp3: new Uint8Array([1, 2, 3]),
			}),
		).rejects.toThrow('CLOUDFLARE_AI_TRANSCRIPTION_ALLOW_BASE64=true')
		expect(fetchMock).not.toHaveBeenCalled()
	} finally {
		clearRuntimeEnvSource()
		vi.unstubAllGlobals()
	}
})

test('sends raw binary payload for default whisper model', async () => {
	const fetchMock = vi.fn(async () => {
		return new Response(JSON.stringify({ result: { text: 'hello world' } }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		})
	})
	vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)
	setRuntimeEnvSource({
		CLOUDFLARE_AI_TRANSCRIPTION_MODEL: '@cf/openai/whisper',
		CLOUDFLARE_AI_TRANSCRIPTION_ALLOW_BASE64: 'false',
	})

	try {
		const text = await transcribeMp3WithWorkersAi({
			mp3: new Uint8Array([9, 8, 7]),
		})
		expect(text).toBe('hello world')
		const firstCall = fetchMock.mock.calls[0] as Array<unknown> | undefined
		const requestInit = (firstCall?.[1] ?? {}) as RequestInit
		const headers = new Headers(requestInit.headers)
		expect(headers.get('Content-Type')).toBe('audio/mpeg')
		expect(requestInit.body).toBeInstanceOf(Uint8Array)
	} finally {
		clearRuntimeEnvSource()
		vi.unstubAllGlobals()
	}
})
