import { Buffer } from 'node:buffer'
import { expect, test, vi } from 'vitest'

vi.mock('#app/utils/call-kent-audio-storage.server.ts', () => ({
	getAudioBuffer: vi.fn(),
	parseBase64DataUrl: vi.fn(),
	putEpisodeDraftAudioFromBuffer: vi.fn(),
}))

vi.mock('#app/utils/call-kent-transcript-template.ts', () => ({
	assembleCallKentTranscript: vi.fn(),
}))

vi.mock('#app/utils/cloudflare-ai-call-kent-metadata.server.ts', () => ({
	generateCallKentEpisodeMetadataWithWorkersAi: vi.fn(),
}))

vi.mock('#app/utils/cloudflare-ai-call-kent-transcript-format.server.ts', () => ({
	formatCallKentTranscriptWithWorkersAi: vi.fn(),
}))

vi.mock('#app/utils/cloudflare-ai-transcription.server.ts', () => ({
	transcribeMp3WithWorkersAi: vi.fn(),
}))

vi.mock('#app/utils/ffmpeg.server.ts', () => ({
	createEpisodeAudio: vi.fn(),
}))

vi.mock('#app/utils/prisma.server.ts', () => ({
	prisma: {
		callKentEpisodeDraft: {
			findUnique: vi.fn(),
			updateMany: vi.fn(),
		},
	},
}))

import {
	getAudioBuffer,
	parseBase64DataUrl,
	putEpisodeDraftAudioFromBuffer,
} from '#app/utils/call-kent-audio-storage.server.ts'
import { assembleCallKentTranscript } from '#app/utils/call-kent-transcript-template.ts'
import { generateCallKentEpisodeMetadataWithWorkersAi } from '#app/utils/cloudflare-ai-call-kent-metadata.server.ts'
import { formatCallKentTranscriptWithWorkersAi } from '#app/utils/cloudflare-ai-call-kent-transcript-format.server.ts'
import { transcribeMp3WithWorkersAi } from '#app/utils/cloudflare-ai-transcription.server.ts'
import { createEpisodeAudio } from '#app/utils/ffmpeg.server.ts'
import { prisma } from '#app/utils/prisma.server.ts'
import { startCallKentEpisodeDraftProcessing } from '../call-kent-episode-draft.server.ts'

test('startCallKentEpisodeDraftProcessing reuses saved caller transcript', async () => {
	vi.clearAllMocks()

	const callAudio = Buffer.from('call-audio')
	const responseAudio = Buffer.from('response-audio')
	const callerSegmentAudio = Buffer.from('caller-segment-audio')
	const responseSegmentAudio = Buffer.from('response-segment-audio')

	vi.mocked(prisma.callKentEpisodeDraft.findUnique).mockResolvedValue({
		id: 'draft-1',
		status: 'PROCESSING',
		step: 'STARTED',
		transcript: null,
		title: null,
		description: null,
		keywords: null,
		episodeAudioKey: null,
		call: {
			id: 'call-1',
			title: 'A testing question',
			notes: 'Need confidence in this flow.',
			isAnonymous: false,
			callerTranscript: 'Caller: I edited this caller transcript.',
			audioKey: 'calls/call-1.mp3',
			user: { firstName: 'Riley' },
		},
	} as any)
	vi.mocked(prisma.callKentEpisodeDraft.updateMany).mockResolvedValue({ count: 1 })
	vi.mocked(getAudioBuffer).mockResolvedValue(callAudio)
	vi.mocked(parseBase64DataUrl).mockReturnValue({ buffer: responseAudio } as any)
	vi.mocked(createEpisodeAudio).mockResolvedValue({
		episodeMp3: Buffer.from('episode-audio'),
		callerMp3: callerSegmentAudio,
		responseMp3: responseSegmentAudio,
	})
	vi.mocked(putEpisodeDraftAudioFromBuffer).mockResolvedValue({
		key: 'drafts/draft-1.mp3',
		contentType: 'audio/mpeg',
		size: 123,
	})
	vi.mocked(transcribeMp3WithWorkersAi).mockResolvedValue(
		'This is Kent responding.',
	)
	vi.mocked(assembleCallKentTranscript).mockReturnValue(
		'raw assembled transcript',
	)
	vi.mocked(formatCallKentTranscriptWithWorkersAi).mockResolvedValue(
		'formatted transcript',
	)
	vi.mocked(generateCallKentEpisodeMetadataWithWorkersAi).mockResolvedValue({
		title: 'Episode title',
		description: 'Episode description',
		keywords: 'testing, transcript',
	})

	await startCallKentEpisodeDraftProcessing('draft-1', {
		responseBase64: 'data:audio/mpeg;base64,AAAA',
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
})
