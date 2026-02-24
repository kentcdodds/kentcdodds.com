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

const rateLimit = vi.fn(() => {
	return {
		allowed: true,
		remaining: 999,
		retryAfterMs: null,
		resetAt: Date.now() + 1000,
	}
})

vi.mock('#app/utils/rate-limit.server.ts', () => {
	return { rateLimit }
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
	rateLimit.mockClear()

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
	expect(rateLimit).toHaveBeenCalledTimes(2)
	expect(synthesizeSpeechWithWorkersAi.mock.calls[1]?.[0]).toEqual(
		synthesizeSpeechWithWorkersAi.mock.calls[0]?.[0],
	)
})
