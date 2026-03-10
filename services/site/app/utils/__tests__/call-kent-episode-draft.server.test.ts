import { Buffer } from 'node:buffer'
import { expect, test, vi } from 'vitest'

async function loadDraftModule() {
	vi.resetModules()
	const getAudioBuffer = vi.fn()
	const assembleCallKentTranscript = vi.fn()
	const generateCallKentEpisodeMetadataWithWorkersAi = vi.fn()
	const formatCallKentTranscriptWithWorkersAi = vi.fn()
	const transcribeMp3WithWorkersAi = vi.fn()
	const findUnique = vi.fn()
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
	vi.doMock('#app/utils/prisma.server.ts', () => ({
		prisma: {
			callKentEpisodeDraft: {
				findUnique,
				updateMany,
			},
		},
	}))

	const mod = await import('../call-kent-episode-draft.server.ts')

	return {
		getAudioBuffer,
		assembleCallKentTranscript,
		generateCallKentEpisodeMetadataWithWorkersAi,
		formatCallKentTranscriptWithWorkersAi,
		transcribeMp3WithWorkersAi,
		findUnique,
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
		findUnique,
		updateMany,
		startCallKentEpisodeDraftProcessing,
	} = await loadDraftModule()

	const callerSegmentAudio = Buffer.from('caller-segment-audio')
	const responseSegmentAudio = Buffer.from('response-segment-audio')

	findUnique.mockResolvedValue({
		id: 'draft-1',
		status: 'PROCESSING',
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
			callerTranscript: 'Caller: I edited this caller transcript.',
			user: { firstName: 'Riley' },
		},
	})
	updateMany.mockResolvedValue({ count: 1 })
	getAudioBuffer
		.mockResolvedValueOnce(Buffer.from('episode-audio'))
		.mockResolvedValueOnce(callerSegmentAudio)
		.mockResolvedValueOnce(responseSegmentAudio)
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

	await startCallKentEpisodeDraftProcessing('draft-1')

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
})
