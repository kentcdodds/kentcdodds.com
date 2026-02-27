import { describe, expect, test, vi } from 'vitest'

const { startCallKentEpisodeDraftProcessingMock } = vi.hoisted(() => ({
	startCallKentEpisodeDraftProcessingMock: vi.fn(),
}))

vi.mock('#app/utils/call-kent-episode-draft.server.ts', () => ({
	startCallKentEpisodeDraftProcessing:
		startCallKentEpisodeDraftProcessingMock,
}))

import {
	clearRuntimeBindingSource,
	setRuntimeBindingSource,
} from '#app/utils/runtime-bindings.server.ts'
import {
	enqueueCallKentEpisodeDraftProcessing,
	processCallKentEpisodeDraftQueueMessage,
} from '../call-kent-episode-draft-queue.server.ts'

function resetTestState() {
	clearRuntimeBindingSource()
	vi.clearAllMocks()
}

describe('call kent episode draft queue helper', () => {
	test('returns false when queue binding is unavailable', async () => {
		resetTestState()
		const wasEnqueued = await enqueueCallKentEpisodeDraftProcessing({
			draftId: 'draft_1',
			responseAudioKey: 'call-kent/drafts/draft_1/response.webm',
		})
		expect(wasEnqueued).toBe(false)
	})

	test('enqueues message when queue binding exists', async () => {
		resetTestState()
		const send = vi.fn().mockResolvedValue(undefined)
		setRuntimeBindingSource({
			CALLS_DRAFT_QUEUE: {
				send,
			},
		})

		const message = {
			draftId: 'draft_2',
			responseAudioKey: 'call-kent/drafts/draft_2/response.webm',
		}
		const wasEnqueued = await enqueueCallKentEpisodeDraftProcessing(message)

		expect(wasEnqueued).toBe(true)
		expect(send).toHaveBeenCalledWith(message)
	})

	test('processes queue message through draft processor', async () => {
		resetTestState()
		startCallKentEpisodeDraftProcessingMock.mockResolvedValue(undefined)

		await processCallKentEpisodeDraftQueueMessage({
			draftId: 'draft_3',
			responseAudioKey: 'call-kent/drafts/draft_3/response.webm',
		})

		expect(startCallKentEpisodeDraftProcessingMock).toHaveBeenCalledWith(
			'draft_3',
			{
				responseAudioKey: 'call-kent/drafts/draft_3/response.webm',
			},
		)
	})
})
