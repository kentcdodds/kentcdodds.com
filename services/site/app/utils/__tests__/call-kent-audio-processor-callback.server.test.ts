import { createHmac } from 'node:crypto'
import { expect, test, vi } from 'vitest'
import { callKentEpisodeDraftTable } from '../db/schema.server.ts'

const processingJobId = '11111111-1111-4111-8111-111111111111'

vi.mock('#app/utils/background-task.server.ts', () => ({
	runBackgroundTask: vi.fn(),
}))

async function loadCallbackModule() {
	vi.resetModules()
	const updateMany = vi.fn()
	const findOne = vi.fn(async () => ({ processingJobId }))
	const enqueueCallKentTranscriptionJob = vi.fn()
	vi.doMock('#app/utils/db.server.ts', () => ({
		db: {
			findOne,
			updateMany,
		},
	}))
	vi.doMock('#app/utils/call-kent-transcription-queue.server.ts', () => ({
		enqueueCallKentTranscriptionJob,
	}))
	const mod = await import('../call-kent-audio-processor-callback.server.ts')
	return {
		findOne,
		updateMany,
		enqueueCallKentTranscriptionJob,
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

test('completed audio callback stores keys and awaits durable enqueue', async () => {
	vi.clearAllMocks()
	const {
		updateMany,
		enqueueCallKentTranscriptionJob,
		handleCallKentAudioProcessorEvent,
	} = await loadCallbackModule()
	updateMany.mockResolvedValue({
		affectedRows: 1,
	})
	let resolveEnqueue = () => {}
	enqueueCallKentTranscriptionJob.mockImplementation(
		() =>
			new Promise<void>((resolve) => {
				resolveEnqueue = resolve
			}),
	)
	let settled = false
	const handling = handleCallKentAudioProcessorEvent({
		type: 'audio_generation_completed',
		draftId: 'draft-1',
		episodeAudioKey: 'call-kent/drafts/draft-1/episode.mp3',
		episodeAudioContentType: 'audio/mpeg',
		episodeAudioSize: 321,
		callerSegmentAudioKey: 'call-kent/drafts/draft-1/caller-segment.mp3',
		responseSegmentAudioKey: 'call-kent/drafts/draft-1/response-segment.mp3',
	}).then(() => {
		settled = true
	})
	await vi.waitFor(() => {
		expect(enqueueCallKentTranscriptionJob).toHaveBeenCalled()
	})
	expect(settled).toBe(false)
	resolveEnqueue()
	await handling
	expect(updateMany).toHaveBeenCalledWith(
		callKentEpisodeDraftTable,
		{
			episodeAudioKey: 'call-kent/drafts/draft-1/episode.mp3',
			episodeAudioContentType: 'audio/mpeg',
			episodeAudioSize: 321,
			callerSegmentAudioKey: 'call-kent/drafts/draft-1/caller-segment.mp3',
			responseSegmentAudioKey: 'call-kent/drafts/draft-1/response-segment.mp3',
			step: 'TRANSCRIBING',
			errorMessage: null,
		},
		expect.objectContaining({
			where: expect.objectContaining({
				type: 'logical',
			}),
		}),
	)
	expect(enqueueCallKentTranscriptionJob).toHaveBeenCalledWith({
		version: 1,
		type: 'episode-draft',
		draftId: 'draft-1',
		jobId: processingJobId,
	})
})

test('completed audio callback remains recoverable when durable enqueue fails', async () => {
	vi.clearAllMocks()
	const {
		updateMany,
		enqueueCallKentTranscriptionJob,
		handleCallKentAudioProcessorEvent,
	} = await loadCallbackModule()
	updateMany.mockResolvedValue({ affectedRows: 1 })
	enqueueCallKentTranscriptionJob.mockRejectedValue(
		new Error('queue unavailable'),
	)

	await handleCallKentAudioProcessorEvent({
		type: 'audio_generation_completed',
		draftId: 'draft-1',
		episodeAudioKey: 'episode.mp3',
		episodeAudioContentType: 'audio/mpeg',
		episodeAudioSize: 321,
	})

	expect(updateMany).toHaveBeenLastCalledWith(
		callKentEpisodeDraftTable,
		{
			errorMessage:
				'Unable to enqueue episode transcription: queue unavailable',
		},
		{
			where: {
				id: 'draft-1',
				processingJobId,
				status: 'PROCESSING',
			},
		},
	)
})

test('late audio failure cannot overwrite transcription or metadata work', async () => {
	vi.clearAllMocks()
	const { updateMany, handleCallKentAudioProcessorEvent } =
		await loadCallbackModule()
	updateMany.mockResolvedValue({ affectedRows: 0 })

	await handleCallKentAudioProcessorEvent({
		type: 'audio_generation_failed',
		draftId: 'draft-1',
		errorMessage: 'late audio failure',
	})

	expect(updateMany).toHaveBeenCalledWith(
		callKentEpisodeDraftTable,
		{
			status: 'ERROR',
			step: 'DONE',
			errorMessage: 'late audio failure',
		},
		expect.objectContaining({
			where: expect.objectContaining({
				type: 'logical',
				operator: 'and',
				predicates: expect.arrayContaining([
					expect.objectContaining({
						type: 'comparison',
						operator: 'in',
						column: 'step',
						value: ['STARTED', 'GENERATING_AUDIO'],
					}),
				]),
			}),
		}),
	)
})
