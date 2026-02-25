import { describe, expect, test } from 'vitest'
import worker from '../worker.ts'

describe('call-kent-ffmpeg mock worker', () => {
	test('returns service metadata', async () => {
		const response = await worker.fetch(
			new Request('http://mock-call-kent-ffmpeg.local/__mocks/meta'),
		)
		expect(response.status).toBe(200)
		const payload = (await response.json()) as { service: string }
		expect(payload.service).toBe('call-kent-ffmpeg')
	})

	test('accepts multipart audio and returns base64 payloads', async () => {
		const form = new FormData()
		form.set(
			'callAudio',
			new File([new Uint8Array([1, 2, 3])], 'call.mp3', { type: 'audio/mpeg' }),
		)
		form.set(
			'responseAudio',
			new File([new Uint8Array([4, 5, 6])], 'response.mp3', {
				type: 'audio/mpeg',
			}),
		)

		const response = await worker.fetch(
			new Request('http://mock-call-kent-ffmpeg.local/episode-audio', {
				method: 'POST',
				body: form,
			}),
		)
		expect(response.status).toBe(200)
		const payload = (await response.json()) as {
			callerMp3Base64?: string
			responseMp3Base64?: string
			episodeMp3Base64?: string
		}
		expect(payload.callerMp3Base64).toBeTruthy()
		expect(payload.responseMp3Base64).toBeTruthy()
		expect(payload.episodeMp3Base64).toBeTruthy()
	})
})
