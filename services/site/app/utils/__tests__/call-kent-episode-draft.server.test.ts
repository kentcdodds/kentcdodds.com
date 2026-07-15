import { Buffer } from 'node:buffer'
import { type Database } from '@remix-run/data-table'
import { expect, test, vi } from 'vitest'

const jobId = '11111111-1111-4111-8111-111111111111'
const leaseId = '22222222-2222-4222-8222-222222222222'

async function loadDraftModule() {
	vi.resetModules()
	const getAudioBuffer = vi.fn()
	const assembleCallKentTranscript = vi.fn()
	const generateCallKentEpisodeMetadataWithWorkersAi = vi.fn()
	const formatCallKentTranscriptWithWorkersAi = vi.fn()
	const transcribeMp3WithWorkersAi = vi.fn()
	const findOne = vi.fn()
	const updateMany = vi.fn()

	vi.doMock('#app/utils/call-kent-audio-storage.server.ts', () => ({
		getAudioBuffer,
	}))
	vi.doMock('#app/utils/call-kent-transcript-template.ts', () => ({
		assembleCallKentTranscript,
	}))
	vi.doMock('#app/utils/cloudflare-ai-call-kent-metadata.server.ts', () => ({
		generateCallKentEpisodeMetadataWithWorkersAi,
	}))
	vi.doMock(
		'#app/utils/cloudflare-ai-call-kent-transcript-format.server.ts',
		() => ({
			formatCallKentTranscriptWithWorkersAi,
		}),
	)
	vi.doMock('#app/utils/cloudflare-ai-transcription.server.ts', () => ({
		transcribeMp3WithWorkersAi,
	}))
	const mod = await import('../call-kent-episode-draft.server.ts')

	return {
		getAudioBuffer,
		assembleCallKentTranscript,
		generateCallKentEpisodeMetadataWithWorkersAi,
		formatCallKentTranscriptWithWorkersAi,
		transcribeMp3WithWorkersAi,
		findOne,
		updateMany,
		...mod,
	}
}

test('startCallKentEpisodeDraftProcessing reuses saved caller transcript', async () => {
	vi.clearAllMocks()
	const {
		getAudioBuffer,
		assembleCallKentTranscript,
		generateCallKentEpisodeMetadataWithWorkersAi,
		formatCallKentTranscriptWithWorkersAi,
		transcribeMp3WithWorkersAi,
		findOne,
		updateMany,
		startCallKentEpisodeDraftProcessing,
	} = await loadDraftModule()

	const responseSegmentAudio = Buffer.from('response-segment-audio')

	findOne.mockResolvedValue({
		id: 'draft-1',
		status: 'PROCESSING',
		processingJobId: jobId,
		processingLeaseId: leaseId,
		step: 'TRANSCRIBING',
		transcript: null,
		title: null,
		description: null,
		keywords: null,
		episodeAudioKey: 'drafts/draft-1.mp3',
		callerSegmentAudioKey: 'drafts/draft-1-caller.mp3',
		responseSegmentAudioKey: 'drafts/draft-1-response.mp3',
		call: {
			id: 'call-1',
			title: 'A testing question',
			notes: 'Need confidence in this flow.',
			isAnonymous: false,
			callerTranscriptStatus: 'READY',
			callerTranscript: 'Caller: I edited this caller transcript.',
			user: { firstName: 'Riley' },
		},
	})
	updateMany.mockResolvedValue({ affectedRows: 1 })
	getAudioBuffer.mockResolvedValueOnce(responseSegmentAudio)
	transcribeMp3WithWorkersAi.mockResolvedValue('This is Kent responding.')
	assembleCallKentTranscript.mockReturnValue('raw assembled transcript')
	formatCallKentTranscriptWithWorkersAi.mockResolvedValue(
		'formatted transcript',
	)
	generateCallKentEpisodeMetadataWithWorkersAi.mockResolvedValue({
		title: 'Episode title',
		description: 'Episode description',
		keywords: 'testing, transcript',
	})

	const outcome = await startCallKentEpisodeDraftProcessing('draft-1', {
		database: { findOne, updateMany } as unknown as Database,
		jobId,
		leaseId,
	})

	expect(outcome).toBe('completed')
	expect(getAudioBuffer).toHaveBeenCalledTimes(1)
	expect(getAudioBuffer).not.toHaveBeenCalledWith({
		key: 'drafts/draft-1-caller.mp3',
	})
	expect(getAudioBuffer).not.toHaveBeenCalledWith({
		key: 'drafts/draft-1.mp3',
	})
	expect(transcribeMp3WithWorkersAi).toHaveBeenCalledTimes(1)
	expect(transcribeMp3WithWorkersAi).toHaveBeenCalledWith({
		mp3: responseSegmentAudio,
		callerName: 'Riley',
		callTitle: 'A testing question',
		callerNotes: 'Need confidence in this flow.',
	})
	expect(assembleCallKentTranscript).toHaveBeenCalledWith({
		callerName: 'Riley',
		callerTranscript: 'I edited this caller transcript.',
		kentTranscript: 'This is Kent responding.',
	})
	expect(generateCallKentEpisodeMetadataWithWorkersAi).toHaveBeenCalledWith({
		callerTranscript: 'I edited this caller transcript.',
		responderTranscript: 'This is Kent responding.',
		callTitle: 'A testing question',
		callerNotes: 'Need confidence in this flow.',
	})
	expect(
		updateMany.mock.results.every((result) => result.type === 'return'),
	).toBe(true)
	expect(updateMany).toHaveBeenLastCalledWith(
		expect.anything(),
		expect.objectContaining({
			status: 'READY',
			step: 'DONE',
			processingLeaseId: null,
			processingLeaseExpiresAt: null,
		}),
		{
			where: {
				id: 'draft-1',
				processingJobId: jobId,
				processingLeaseId: leaseId,
				status: 'PROCESSING',
			},
		},
	)
})

test('startCallKentEpisodeDraftProcessing waits for caller transcript processing', async () => {
	const {
		getAudioBuffer,
		findOne,
		updateMany,
		startCallKentEpisodeDraftProcessing,
	} = await loadDraftModule()
	findOne.mockResolvedValue({
		id: 'draft-1',
		status: 'PROCESSING',
		processingJobId: jobId,
		processingLeaseId: leaseId,
		transcript: null,
		call: {
			id: 'call-1',
			callerTranscriptStatus: 'PROCESSING',
			user: { firstName: 'Riley' },
		},
	})

	const outcome = await startCallKentEpisodeDraftProcessing('draft-1', {
		database: { findOne, updateMany } as unknown as Database,
		jobId,
		leaseId,
	})
	expect(outcome).toBe('deferred')
	expect(getAudioBuffer).not.toHaveBeenCalled()
	expect(updateMany).not.toHaveBeenCalled()
})

test.each([
	{
		status: 'NOT_STARTED',
		transcript: null,
		error: 'Caller transcript is not ready (status: NOT_STARTED).',
	},
	{
		status: 'READY',
		transcript: '   ',
		error: 'Caller transcript is READY but empty.',
	},
])(
	'startCallKentEpisodeDraftProcessing rejects unusable caller transcript status $status',
	async ({ status, transcript, error }) => {
		const { findOne, updateMany, startCallKentEpisodeDraftProcessing } =
			await loadDraftModule()
		findOne.mockResolvedValue({
			id: 'draft-1',
			status: 'PROCESSING',
			processingJobId: jobId,
			processingLeaseId: leaseId,
			callerSegmentAudioKey: 'caller.mp3',
			responseSegmentAudioKey: 'response.mp3',
			call: {
				id: 'call-1',
				isAnonymous: false,
				callerTranscriptStatus: status,
				callerTranscript: transcript,
				user: { firstName: 'Riley' },
			},
		})

		await expect(
			startCallKentEpisodeDraftProcessing('draft-1', {
				database: { findOne, updateMany } as unknown as Database,
				jobId,
				leaseId,
			}),
		).rejects.toThrow(error)
		expect(updateMany).not.toHaveBeenCalled()
	},
)

test('startCallKentEpisodeDraftProcessing requires response segment audio', async () => {
	const {
		getAudioBuffer,
		findOne,
		updateMany,
		startCallKentEpisodeDraftProcessing,
	} = await loadDraftModule()
	findOne.mockResolvedValue({
		id: 'draft-1',
		status: 'PROCESSING',
		processingJobId: jobId,
		processingLeaseId: leaseId,
		callerSegmentAudioKey: 'caller.mp3',
		responseSegmentAudioKey: null,
		call: {
			id: 'call-1',
			isAnonymous: false,
			callerTranscriptStatus: 'READY',
			callerTranscript: 'Riley: Saved transcript.',
			user: { firstName: 'Riley' },
		},
	})

	await expect(
		startCallKentEpisodeDraftProcessing('draft-1', {
			database: { findOne, updateMany } as unknown as Database,
			jobId,
			leaseId,
		}),
	).rejects.toThrow('Episode response segment audio is missing.')
	expect(getAudioBuffer).not.toHaveBeenCalled()
	expect(updateMany).not.toHaveBeenCalled()
})

test('startCallKentEpisodeDraftProcessing reports stale when final READY write loses ownership', async () => {
	const {
		findOne,
		updateMany,
		startCallKentEpisodeDraftProcessing,
		generateCallKentEpisodeMetadataWithWorkersAi,
	} = await loadDraftModule()
	findOne.mockResolvedValue({
		id: 'draft-1',
		status: 'PROCESSING',
		processingJobId: jobId,
		processingLeaseId: leaseId,
		transcript: 'Saved episode transcript.',
		title: 'Saved title',
		description: 'Saved description',
		keywords: 'saved',
		call: {
			id: 'call-1',
			title: 'Question',
			notes: null,
			isAnonymous: false,
			callerTranscriptStatus: 'ERROR',
			callerTranscript: null,
			user: { firstName: 'Riley' },
		},
	})
	updateMany.mockResolvedValue({ affectedRows: 0 })

	const outcome = await startCallKentEpisodeDraftProcessing('draft-1', {
		database: { findOne, updateMany } as unknown as Database,
		jobId,
		leaseId,
	})

	expect(outcome).toBe('stale')
	expect(generateCallKentEpisodeMetadataWithWorkersAi).not.toHaveBeenCalled()
})
