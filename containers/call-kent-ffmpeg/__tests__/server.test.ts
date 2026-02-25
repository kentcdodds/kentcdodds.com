import { describe, expect, test, vi } from 'vitest'
import { createCallKentFfmpegHandler } from '../server.mjs'

describe('call-kent-ffmpeg container server handler', () => {
	test('returns health payload', async () => {
		const handler = createCallKentFfmpegHandler({
			stitchAudio: vi.fn(),
		})
		const response = await handler(new Request('http://container.local/health'))
		expect(response.status).toBe(200)
		const payload = (await response.json()) as { ok: boolean; service: string }
		expect(payload.ok).toBe(true)
		expect(payload.service).toBe('call-kent-ffmpeg-container')
	})

	test('stitches multipart audio using injected stitcher', async () => {
		const stitchAudio = vi.fn(async () => {
			return {
				callerMp3: Buffer.from([1, 2, 3]),
				responseMp3: Buffer.from([4, 5, 6]),
				episodeMp3: Buffer.from([7, 8, 9]),
			}
		})
		const handler = createCallKentFfmpegHandler({ stitchAudio })
		const form = new FormData()
		form.set(
			'callAudio',
			new File([new Uint8Array([10, 11])], 'call.mp3', { type: 'audio/mpeg' }),
		)
		form.set(
			'responseAudio',
			new File([new Uint8Array([12, 13])], 'response.mp3', {
				type: 'audio/mpeg',
			}),
		)
		const response = await handler(
			new Request('http://container.local/episode-audio', {
				method: 'POST',
				body: form,
			}),
		)

		expect(response.status).toBe(200)
		expect(stitchAudio).toHaveBeenCalledTimes(1)
		const payload = (await response.json()) as {
			callerMp3Base64: string
			responseMp3Base64: string
			episodeMp3Base64: string
		}
		expect(payload.callerMp3Base64).toBe(Buffer.from([1, 2, 3]).toString('base64'))
		expect(payload.responseMp3Base64).toBe(
			Buffer.from([4, 5, 6]).toString('base64'),
		)
		expect(payload.episodeMp3Base64).toBe(
			Buffer.from([7, 8, 9]).toString('base64'),
		)
	})
})
