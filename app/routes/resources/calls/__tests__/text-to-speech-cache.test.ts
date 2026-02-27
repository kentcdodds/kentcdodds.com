// @vitest-environment node
import { expect, test, vi } from 'vitest'
import { AI_VOICE_DISCLOSURE_PREFIX } from '#app/utils/call-kent-text-to-speech.ts'

const synthesizeSpeechWithWorkersAi = vi.fn(
	async ({
		text,
		voice,
		model,
	}: {
		text: string
		voice?: string
		model?: string
	}) => {
		// Make it obvious in assertions when inputs change.
		const payload = `${model ?? ''}|${voice ?? ''}|${text}`
		return {
			bytes: new TextEncoder().encode(payload),
			contentType: 'audio/mpeg',
			model: model ?? '@cf/deepgram/aura-2-en',
		}
	},
)

vi.mock('#app/utils/cloudflare-ai-text-to-speech.server.ts', () => {
	return {
		synthesizeSpeechWithWorkersAi,
	}
})

vi.mock('#app/utils/session.server.ts', () => {
	return {
		getUser: async () => ({ id: 'user_1' }),
	}
})

function makeRequest({ text, voice }: { text: string; voice: string }) {
	return new Request('http://localhost/resources/calls/text-to-speech', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ text, voice }),
	})
}

test('does not cache audio bytes; repeated requests invoke workers ai', async () => {
	synthesizeSpeechWithWorkersAi.mockClear()

	const { action } = await import('../text-to-speech.tsx')

	const req1 = makeRequest({
		text: 'Hello from the cache test message.',
		voice: 'luna',
	})
	const res1 = (await action({ request: req1 } as any)) as Response
	expect(res1.ok).toBe(true)
	const firstCallArgs = synthesizeSpeechWithWorkersAi.mock.calls[0]?.[0]
	expect(firstCallArgs?.text?.startsWith(AI_VOICE_DISCLOSURE_PREFIX)).toBe(true)

	const req2 = makeRequest({
		text: 'Hello from the cache test message.',
		voice: 'luna',
	})
	const res2 = (await action({ request: req2 } as any)) as Response
	expect(res2.ok).toBe(true)

	expect(synthesizeSpeechWithWorkersAi).toHaveBeenCalledTimes(2)
	expect(synthesizeSpeechWithWorkersAi.mock.calls[1]?.[0]).toEqual(
		synthesizeSpeechWithWorkersAi.mock.calls[0]?.[0],
	)
})

test('validates normalized question text before synthesis', async () => {
	synthesizeSpeechWithWorkersAi.mockClear()

	const { action } = await import('../text-to-speech.tsx')

	const req = makeRequest({
		text: 'hello               you',
		voice: 'luna',
	})
	const result = (await action({ request: req } as any)) as {
		type?: string
		data?: unknown
		init?: ResponseInit | null
	}

	expect(result.type).toBe('DataWithResponseInit')
	expect(result.init?.status).toBe(400)
	expect(result.data).toEqual({
		error: 'Question text must be at least 20 characters',
	})
	expect(synthesizeSpeechWithWorkersAi).not.toHaveBeenCalled()
})

test('falls back to audio/mpeg when workers ai omits content type', async () => {
	synthesizeSpeechWithWorkersAi.mockClear()
	synthesizeSpeechWithWorkersAi.mockImplementationOnce(
		async ({
			text,
			voice,
			model,
		}: {
			text: string
			voice?: string
			model?: string
		}) => {
			const payload = `${model ?? ''}|${voice ?? ''}|${text}`
			return {
				bytes: new TextEncoder().encode(payload),
				contentType: '',
				model: model ?? '@cf/deepgram/aura-2-en',
			}
		},
	)

	const { action } = await import('../text-to-speech.tsx')

	const req = makeRequest({
		text: 'This request should still produce an audio response.',
		voice: 'luna',
	})
	const res = (await action({ request: req } as any)) as Response

	expect(res.ok).toBe(true)
	expect(res.headers.get('content-type')).toBe('audio/mpeg')
	expect(synthesizeSpeechWithWorkersAi).toHaveBeenCalledTimes(1)
})
