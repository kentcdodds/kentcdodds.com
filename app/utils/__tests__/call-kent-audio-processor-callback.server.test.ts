import { createHmac } from 'node:crypto'
import { expect, test, vi } from 'vitest'

async function loadCallbackModule() {
	vi.resetModules()
	const updateMany = vi.fn()
	const startCallKentEpisodeDraftProcessing = vi.fn()
	vi.doMock('#app/utils/prisma.server.ts', () => ({
		prisma: {
			callKentEpisodeDraft: {
				updateMany,
			},
		},
	}))
	vi.doMock('#app/utils/call-kent-episode-draft.server.ts', () => ({
		startCallKentEpisodeDraftProcessing,
	}))
	const mod = await import('../call-kent-audio-processor-callback.server.ts')
	return {
		updateMany,
		startCallKentEpisodeDraftProcessing,
		...mod,
	}
}

test('verifyCallKentAudioProcessorCallbackSignature validates signed payload', async () => {
	vi.clearAllMocks()
	process.env.CALL_KENT_AUDIO_PROCESSOR_CALLBACK_SECRET = 'test-secret'
	const { verifyCallKentAudioProcessorCallbackSignature } =
		await loadCallbackModule()
	const rawBody = JSON.stringify({ hello: 'world' })
	const timestamp = '1710000000'
	const signature = createHmac(
		'sha256',
		process.env.CALL_KENT_AUDIO_PROCESSOR_CALLBACK_SECRET,
	)
		.update(`${timestamp}.${rawBody}`, 'utf8')
		.digest('hex')
	expect(
		verifyCallKentAudioProcessorCallbackSignature({
			timestamp,
			signature,
			rawBody,
			now: Number(timestamp) * 1000,
		}),
	).toBe(true)
	expect(
		verifyCallKentAudioProcessorCallbackSignature({
			timestamp,
			signature: `${signature}00`,
			rawBody,
			now: Number(timestamp) * 1000,
		}),
	).toBe(false)
	expect(
		verifyCallKentAudioProcessorCallbackSignature({
			timestamp,
			signature: `${signature}0`,
			rawBody,
			now: Number(timestamp) * 1000,
		}),
	).toBe(false)
})

test('handleCallKentAudioProcessorEvent stores generated audio metadata and continues processing', async () => {
	vi.clearAllMocks()
	const {
		updateMany,
		startCallKentEpisodeDraftProcessing,
		handleCallKentAudioProcessorEvent,
	} = await loadCallbackModule()
	updateMany.mockResolvedValue({
		count: 1,
	})
	await handleCallKentAudioProcessorEvent({
		type: 'audio_generation_completed',
		draftId: 'draft-1',
		episodeAudioKey: 'call-kent/drafts/draft-1/episode.mp3',
		episodeAudioContentType: 'audio/mpeg',
		episodeAudioSize: 321,
		callerSegmentAudioKey: 'call-kent/drafts/draft-1/caller-segment.mp3',
		responseSegmentAudioKey: 'call-kent/drafts/draft-1/response-segment.mp3',
	})
	expect(updateMany).toHaveBeenCalledWith({
		where: {
			id: 'draft-1',
			status: 'PROCESSING',
			step: { in: ['STARTED', 'GENERATING_AUDIO'] },
		},
		data: {
			episodeAudioKey: 'call-kent/drafts/draft-1/episode.mp3',
			episodeAudioContentType: 'audio/mpeg',
			episodeAudioSize: 321,
			callerSegmentAudioKey: 'call-kent/drafts/draft-1/caller-segment.mp3',
			responseSegmentAudioKey: 'call-kent/drafts/draft-1/response-segment.mp3',
			step: 'TRANSCRIBING',
			errorMessage: null,
		},
	})
	expect(startCallKentEpisodeDraftProcessing).toHaveBeenCalledWith('draft-1')
})
