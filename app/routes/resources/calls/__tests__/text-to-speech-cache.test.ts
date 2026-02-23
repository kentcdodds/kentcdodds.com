// @vitest-environment node
import { describe, expect, test, vi } from 'vitest'
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
		isCloudflareTextToSpeechConfigured: () => true,
		synthesizeSpeechWithWorkersAi,
	}
})

const memory = new Map<string, unknown>()
const testCache = {
	name: 'test-cache',
	get(key: string) {
		return (memory.get(key) as any) ?? null
	},
	async set(key: string, entry: unknown) {
		memory.set(key, entry)
	},
	async delete(key: string) {
		memory.delete(key)
	},
}

vi.mock('#app/utils/cache.server.ts', async () => {
	const { cachified } = await import('@epic-web/cachified')
	return { cachified, cache: testCache }
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

describe('/resources/calls/text-to-speech cache', () => {
	test('caches audio by normalized text + voice + model (skips paid call on hit)', async () => {
		memory.clear()
		synthesizeSpeechWithWorkersAi.mockClear()
		rateLimit.mockClear()

		const { action } = await import('../text-to-speech.tsx')

		const req1 = makeRequest({
			text: 'Hello from the cache test message.',
			voice: 'luna',
		})
		const res1 = (await action({ request: req1 } as any)) as Response
		expect(res1.ok).toBe(true)
		const bytes1 = new Uint8Array(await res1.arrayBuffer())
		const firstCallArgs = synthesizeSpeechWithWorkersAi.mock.calls[0]?.[0]
		expect(firstCallArgs?.text?.startsWith(AI_VOICE_DISCLOSURE_PREFIX)).toBe(
			true,
		)

		// Same content, different whitespace: should hit cache.
		const req2 = makeRequest({
			text: '  Hello   from  the  cache   test message.  ',
			voice: 'luna',
		})
		const res2 = (await action({ request: req2 } as any)) as Response
		expect(res2.ok).toBe(true)
		const bytes2 = new Uint8Array(await res2.arrayBuffer())

		expect(bytes2).toEqual(bytes1)
		expect(synthesizeSpeechWithWorkersAi).toHaveBeenCalledTimes(1)
		expect(rateLimit).toHaveBeenCalledTimes(1)

		// Different voice should be a different cache key.
		const req3 = makeRequest({
			text: 'Hello from the cache test message.',
			voice: 'orion',
		})
		const res3 = (await action({ request: req3 } as any)) as Response
		expect(res3.ok).toBe(true)
		expect(synthesizeSpeechWithWorkersAi).toHaveBeenCalledTimes(2)
		expect(rateLimit).toHaveBeenCalledTimes(2)
	})
})
