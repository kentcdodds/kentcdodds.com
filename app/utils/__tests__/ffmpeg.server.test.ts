import { expect, test, vi } from 'vitest'
import {
	clearRuntimeEnvSource,
	setRuntimeEnvSource,
} from '#app/utils/env.server.ts'

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
	const fetchMock = vi.fn(async () => {
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
	vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)
	setRuntimeEnvSource({
		CALL_KENT_FFMPEG_CONTAINER_BASE_URL: 'https://ffmpeg-container.example',
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
		expect(fetchMock).toHaveBeenCalledWith(
			'https://ffmpeg-container.example/episode-audio',
			expect.objectContaining({ method: 'POST' }),
		)
	} finally {
		clearRuntimeEnvSource()
		vi.unstubAllGlobals()
	}
})
