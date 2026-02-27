import { expect, test, vi } from 'vitest'
import {
	clearRuntimeBindingSource,
	setRuntimeBindingSource,
} from '#app/utils/runtime-bindings.server.ts'
import callKentFfmpegMockWorker from '#mock-servers/call-kent-ffmpeg/worker.ts'

const { spawnMock } = vi.hoisted(() => ({
	spawnMock: vi.fn(),
}))

vi.mock('child_process', () => ({
	spawn: spawnMock,
}))

import { createEpisodeAudio } from '../ffmpeg.server.ts'

test('uses container ffmpeg endpoint when configured', async () => {
	const callerMp3 = Buffer.from([1, 2, 3, 4])
	const responseMp3 = Buffer.from([5, 6, 7, 8])
	const episodeMp3 = Buffer.from([9, 10, 11, 12])
	const bindingFetchMock = vi.fn(async () => {
		return new Response(
			JSON.stringify({
				callerMp3Base64: callerMp3.toString('base64'),
				responseMp3Base64: responseMp3.toString('base64'),
				episodeMp3Base64: episodeMp3.toString('base64'),
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			},
		)
	})
	setRuntimeBindingSource({
		CALL_KENT_FFMPEG: {
			fetch: bindingFetchMock,
		},
	})

	try {
		const result = await createEpisodeAudio(
			new Uint8Array([1, 2]),
			new Uint8Array([3, 4]),
		)
		expect(result.callerMp3).toEqual(callerMp3)
		expect(result.responseMp3).toEqual(responseMp3)
		expect(result.episodeMp3).toEqual(episodeMp3)
		expect(spawnMock).not.toHaveBeenCalled()
		expect(bindingFetchMock).toHaveBeenCalledWith(
			'https://call-kent-ffmpeg.internal/episode-audio',
			expect.objectContaining({ method: 'POST' }),
		)
	} finally {
		clearRuntimeBindingSource()
	}
})

test('supports mock container endpoint contract end-to-end', async () => {
	setRuntimeBindingSource({
		CALL_KENT_FFMPEG: {
			fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
		const request = new Request(input, init)
		const rewritten = new URL(request.url)
		rewritten.protocol = 'http:'
		rewritten.host = 'mock-call-kent-ffmpeg.local'
		return (callKentFfmpegMockWorker.fetch as unknown as (
			request: Request,
			env: unknown,
			ctx: unknown,
		) => Promise<Response>)(
			new Request(rewritten.toString(), request as unknown as RequestInit),
			{},
			{},
		)
			},
		},
	})

	try {
		const result = await createEpisodeAudio(
			new Uint8Array([1, 2, 3]),
			new Uint8Array([4, 5, 6]),
		)
		expect(result.callerMp3.byteLength).toBeGreaterThan(0)
		expect(result.responseMp3.byteLength).toBeGreaterThan(0)
		expect(result.episodeMp3.byteLength).toBeGreaterThan(0)
		expect(spawnMock).not.toHaveBeenCalled()
	} finally {
		clearRuntimeBindingSource()
	}
})
