import { expect, test, vi } from 'vitest'

vi.mock('#app/utils/call-kent-audio-storage.server.ts', () => ({
	getAudioBuffer: vi.fn(),
}))

vi.mock('#app/utils/cloudflare-ai-transcription.server.ts', () => ({
	transcribeMp3WithWorkersAi: vi.fn(),
}))

vi.mock(
	'#app/utils/cloudflare-ai-call-kent-transcript-format.server.ts',
	() => ({
		formatCallKentTranscriptWithWorkersAi: vi.fn(),
	}),
)

vi.mock('#app/utils/prisma.server.ts', () => ({
	prisma: {
		call: {
			updateMany: vi.fn(),
			findUnique: vi.fn(),
		},
	},
}))

import { getAudioBuffer } from '#app/utils/call-kent-audio-storage.server.ts'
import { formatCallKentTranscriptWithWorkersAi } from '#app/utils/cloudflare-ai-call-kent-transcript-format.server.ts'
import { transcribeMp3WithWorkersAi } from '#app/utils/cloudflare-ai-transcription.server.ts'
import { prisma } from '#app/utils/prisma.server.ts'
import {
	normalizeCallerTranscriptForEpisode,
	startCallKentCallerTranscriptProcessing,
} from '../call-kent-caller-transcript.server.ts'

test('startCallKentCallerTranscriptProcessing saves ready transcript', async () => {
	vi.clearAllMocks()

	vi.mocked(prisma.call.updateMany)
		.mockResolvedValueOnce({ count: 1 })
		.mockResolvedValueOnce({ count: 1 })
	vi.mocked(prisma.call.findUnique).mockResolvedValue({
		audioKey: 'calls/123.mp3',
		title: 'How do I get better at testing?',
		notes: 'I am stuck with flaky tests.',
		isAnonymous: false,
		user: { firstName: 'Riley' },
	} as any)
	vi.mocked(getAudioBuffer).mockResolvedValue(Buffer.from('audio-data'))
	vi.mocked(transcribeMp3WithWorkersAi).mockResolvedValue(
		'I have this testing question',
	)
	vi.mocked(formatCallKentTranscriptWithWorkersAi).mockResolvedValue(
		'Riley: I have this testing question',
	)

	await startCallKentCallerTranscriptProcessing('call-123')

	expect(transcribeMp3WithWorkersAi).toHaveBeenCalledWith({
		mp3: Buffer.from('audio-data'),
		callerName: 'Riley',
		callTitle: 'How do I get better at testing?',
		callerNotes: 'I am stuck with flaky tests.',
	})
	expect(formatCallKentTranscriptWithWorkersAi).toHaveBeenCalledWith({
		transcript: 'Riley: I have this testing question',
		callTitle: 'How do I get better at testing?',
		callerNotes: 'I am stuck with flaky tests.',
		callerName: 'Riley',
	})
	expect(prisma.call.updateMany).toHaveBeenLastCalledWith({
		where: { id: 'call-123', callerTranscriptStatus: 'PROCESSING' },
		data: {
			callerTranscript: 'Riley: I have this testing question',
			callerTranscriptStatus: 'READY',
			callerTranscriptErrorMessage: null,
		},
	})
})

test('startCallKentCallerTranscriptProcessing records error state', async () => {
	vi.clearAllMocks()

	vi.mocked(prisma.call.updateMany)
		.mockResolvedValueOnce({ count: 1 })
		.mockResolvedValueOnce({ count: 1 })
	vi.mocked(prisma.call.findUnique).mockResolvedValue({
		audioKey: null,
		title: 'Question without audio',
		notes: null,
		isAnonymous: true,
		user: { firstName: 'Taylor' },
	} as any)

	await startCallKentCallerTranscriptProcessing('call-456')

	expect(prisma.call.updateMany).toHaveBeenLastCalledWith({
		where: { id: 'call-456', callerTranscriptStatus: 'PROCESSING' },
		data: {
			callerTranscriptStatus: 'ERROR',
			callerTranscriptErrorMessage:
				'Caller audio is missing (audioKey is null).',
		},
	})
})

test('normalizeCallerTranscriptForEpisode strips caller label prefix', () => {
	expect(
		normalizeCallerTranscriptForEpisode({
			callerTranscript: 'Riley: How should I test this flow?',
			callerName: 'Riley',
		}),
	).toBe('How should I test this flow?')
	expect(
		normalizeCallerTranscriptForEpisode({
			callerTranscript: 'Caller: Is this better now?',
			callerName: 'Riley',
		}),
	).toBe('Is this better now?')
})

test('normalizeCallerTranscriptForEpisode preserves plain transcript text', () => {
	expect(
		normalizeCallerTranscriptForEpisode({
			callerTranscript: 'How should I test this flow?',
			callerName: 'Riley',
		}),
	).toBe('How should I test this flow?')
})
