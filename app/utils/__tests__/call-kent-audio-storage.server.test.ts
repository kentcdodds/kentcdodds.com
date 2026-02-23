import { setupServer } from 'msw/node'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { cloudflareR2Handlers } from '../../../mocks/cloudflare-r2.ts'
import {
	deleteAudioObject,
	getAudioBuffer,
	getAudioStream,
	putCallAudioFromBuffer,
} from '../call-kent-audio-storage.server.ts'

const server = setupServer(...cloudflareR2Handlers)

beforeAll(() => {
	process.env.R2_BUCKET = 'mock-r2-bucket'
	process.env.R2_ENDPOINT = 'https://mock.r2.cloudflarestorage.com'
	process.env.R2_ACCESS_KEY_ID = 'MOCKR2ACCESSKEYID'
	process.env.R2_SECRET_ACCESS_KEY = 'MOCKR2SECRETACCESSKEY'
	process.env.CALL_KENT_R2_BUCKET = 'mock-call-kent-audio'

	server.listen({ onUnhandledRequest: 'error' })
})

afterAll(() => {
	server.close()
})

describe('call kent audio storage (R2 via MSW)', () => {
	test('round-trips audio bytes and supports range reads', async () => {
		const callId = 'call_123'
		const original = new Uint8Array([0, 1, 2, 3, 4, 5, 250, 251, 252, 253])
		const contentType = 'audio/webm;codecs=opus'

		const putRes = await putCallAudioFromBuffer({ callId, audio: original, contentType })
		expect(putRes.size).toBe(original.byteLength)
		expect(putRes.key).toContain(`call-kent/calls/${callId}/`)

		const full = await getAudioBuffer({ key: putRes.key })
		expect(new Uint8Array(full)).toEqual(original)

		const { body } = await getAudioStream({
			key: putRes.key,
			range: { start: 2, end: 5 },
		})
		const chunks: Buffer[] = []
		for await (const chunk of body) {
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
		}
		const ranged = new Uint8Array(Buffer.concat(chunks))
		expect(ranged).toEqual(original.slice(2, 6))

		await deleteAudioObject({ key: putRes.key })
		await expect(getAudioBuffer({ key: putRes.key })).rejects.toThrow()
	})
})

