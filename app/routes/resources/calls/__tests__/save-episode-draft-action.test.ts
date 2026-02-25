import { expect, test, vi } from 'vitest'

const {
	putEpisodeDraftResponseAudioFromBufferMock,
	deleteAudioObjectMock,
	enqueueCallKentEpisodeDraftProcessingMock,
	startCallKentEpisodeDraftProcessingMock,
	requireAdminUserMock,
	callFindFirstMock,
	callUpdateMock,
	callKentEpisodeDraftFindFirstMock,
	transactionMock,
} = vi.hoisted(() => ({
	putEpisodeDraftResponseAudioFromBufferMock: vi.fn(),
	deleteAudioObjectMock: vi.fn(),
	enqueueCallKentEpisodeDraftProcessingMock: vi.fn(),
	startCallKentEpisodeDraftProcessingMock: vi.fn(),
	requireAdminUserMock: vi.fn(),
	callFindFirstMock: vi.fn(),
	callUpdateMock: vi.fn(),
	callKentEpisodeDraftFindFirstMock: vi.fn(),
	transactionMock: vi.fn(),
}))

vi.mock('#app/utils/call-kent-audio-storage.server.ts', () => ({
	putEpisodeDraftResponseAudioFromBuffer:
		putEpisodeDraftResponseAudioFromBufferMock,
	deleteAudioObject: deleteAudioObjectMock,
	getAudioBuffer: vi.fn(),
	putCallAudioFromBuffer: vi.fn(),
}))

vi.mock('#app/utils/call-kent-episode-draft-queue.server.ts', () => ({
	enqueueCallKentEpisodeDraftProcessing:
		enqueueCallKentEpisodeDraftProcessingMock,
}))

vi.mock('#app/utils/call-kent-episode-draft.server.ts', () => ({
	startCallKentEpisodeDraftProcessing:
		startCallKentEpisodeDraftProcessingMock,
}))

vi.mock('#app/utils/session.server.ts', () => ({
	requireAdminUser: requireAdminUserMock,
	requireUser: vi.fn(),
}))

vi.mock('#app/utils/prisma.server.ts', () => ({
	prisma: {
		call: {
			findFirst: callFindFirstMock,
			update: callUpdateMock,
		},
		callKentEpisodeDraft: {
			findFirst: callKentEpisodeDraftFindFirstMock,
			deleteMany: vi.fn(),
			create: vi.fn(),
		},
		$transaction: transactionMock,
	},
}))

import { action } from '../save.tsx'

function setup({
	wasEnqueued,
	existingEpisodeAudioKey = null,
}: {
	wasEnqueued: boolean
	existingEpisodeAudioKey?: string | null
}) {
	vi.clearAllMocks()
	requireAdminUserMock.mockResolvedValue(undefined)
	callFindFirstMock.mockResolvedValue({ id: 'call_123' })
	callUpdateMock.mockResolvedValue({ id: 'call_123' })
	callKentEpisodeDraftFindFirstMock.mockResolvedValue({
		episodeAudioKey: existingEpisodeAudioKey,
	})
	transactionMock.mockResolvedValue([{ count: 1 }, { id: 'draft_123' }])
	putEpisodeDraftResponseAudioFromBufferMock.mockResolvedValue({
		key: 'call-kent/drafts/draft_123/response.webm',
		contentType: 'audio/webm',
		size: 42,
	})
	enqueueCallKentEpisodeDraftProcessingMock.mockResolvedValue(wasEnqueued)
	startCallKentEpisodeDraftProcessingMock.mockResolvedValue(undefined)
	deleteAudioObjectMock.mockResolvedValue(undefined)
}

function buildRequest(formData: FormData) {
	return new Request('https://kentcdodds.com/resources/calls/save', {
		method: 'POST',
		body: formData,
	})
}

test('enqueues processing for create-episode-draft with binary audio upload', async () => {
	setup({ wasEnqueued: true })
	const formData = new FormData()
	formData.set('intent', 'create-episode-draft')
	formData.set('callId', 'call_123')
	formData.set(
		'audio',
		new File(['audio-bytes'], 'response.webm', { type: 'audio/webm' }),
	)

	const response = (await action({
		request: buildRequest(formData),
	} as never)) as Response

	expect(response.status).toBe(302)
	expect(response.headers.get('Location')).toBe('/calls/admin/call_123')
	expect(putEpisodeDraftResponseAudioFromBufferMock).toHaveBeenCalledTimes(1)
	const putCall = putEpisodeDraftResponseAudioFromBufferMock.mock.calls[0]?.[0]
	expect(putCall).toMatchObject({
		draftId: 'draft_123',
		contentType: 'audio/webm',
	})
	expect(putCall.audio).toBeInstanceOf(Uint8Array)
	expect(putCall.audio.byteLength).toBeGreaterThan(0)
	expect(enqueueCallKentEpisodeDraftProcessingMock).toHaveBeenCalledWith({
		draftId: 'draft_123',
		responseAudioKey: 'call-kent/drafts/draft_123/response.webm',
	})
	expect(startCallKentEpisodeDraftProcessingMock).not.toHaveBeenCalled()
})

test('falls back to in-process draft processing when queue enqueue fails', async () => {
	setup({ wasEnqueued: false, existingEpisodeAudioKey: 'call-kent/old/audio.mp3' })
	const formData = new FormData()
	formData.set('intent', 'create-episode-draft')
	formData.set('callId', 'call_123')
	formData.set(
		'audio',
		new File(['audio-bytes'], 'response.webm', { type: 'audio/webm' }),
	)

	const response = (await action({
		request: buildRequest(formData),
	} as never)) as Response

	expect(response.status).toBe(302)
	expect(response.headers.get('Location')).toBe('/calls/admin/call_123')
	expect(deleteAudioObjectMock).toHaveBeenCalledWith({
		key: 'call-kent/old/audio.mp3',
	})
	expect(startCallKentEpisodeDraftProcessingMock).toHaveBeenCalledWith(
		'draft_123',
		{
			responseAudioKey: 'call-kent/drafts/draft_123/response.webm',
		},
	)
})

test('returns audio-required error when response audio file is missing', async () => {
	setup({ wasEnqueued: true })
	const formData = new FormData()
	formData.set('intent', 'create-episode-draft')
	formData.set('callId', 'call_123')

	const response = (await action({
		request: buildRequest(formData),
	} as never)) as Response

	expect(response.status).toBe(302)
	expect(response.headers.get('Location')).toBe(
		'/calls/admin/call_123?error=Response+audio+file+is+required.',
	)
	expect(requireAdminUserMock).not.toHaveBeenCalled()
	expect(putEpisodeDraftResponseAudioFromBufferMock).not.toHaveBeenCalled()
	expect(enqueueCallKentEpisodeDraftProcessingMock).not.toHaveBeenCalled()
})
