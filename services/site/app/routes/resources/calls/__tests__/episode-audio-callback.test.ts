import { expect, test, vi } from 'vitest'

vi.mock('#app/utils/call-kent-audio-processor-callback.server.ts', () => ({
	handleCallKentAudioProcessorEvent: vi.fn(),
	parseCallKentAudioProcessorEvent: vi.fn(),
	verifyCallKentAudioProcessorCallbackSignature: vi.fn(),
}))

import {
	handleCallKentAudioProcessorEvent,
	parseCallKentAudioProcessorEvent,
	verifyCallKentAudioProcessorCallbackSignature,
} from '#app/utils/call-kent-audio-processor-callback.server.ts'
import { action } from '../episode-audio-callback.ts'

test('episode-audio-callback rejects unsigned cloudflare callback', async () => {
	vi.clearAllMocks()
	process.env.CALL_KENT_AUDIO_PROCESSOR_CALLBACK_SECRET = 'callback-secret'
	const request = new Request(
		'http://localhost/resources/calls/episode-audio-callback',
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				type: 'audio_generation_started',
				draftId: 'draft-1',
			}),
		},
	)
	const response = await action({ request })
	expect(response.status).toBe(401)
	expect(verifyCallKentAudioProcessorCallbackSignature).not.toHaveBeenCalled()
})

test('episode-audio-callback validates, parses, and handles callback payload', async () => {
	vi.clearAllMocks()
	process.env.CALL_KENT_AUDIO_PROCESSOR_CALLBACK_SECRET = 'callback-secret'
	vi.mocked(verifyCallKentAudioProcessorCallbackSignature).mockReturnValue(true)
	vi.mocked(parseCallKentAudioProcessorEvent).mockReturnValue({
		type: 'audio_generation_started',
		draftId: 'draft-1',
	})
	const request = new Request(
		'http://localhost/resources/calls/episode-audio-callback',
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-call-kent-audio-timestamp': '1710000000',
				'x-call-kent-audio-signature': 'abcd',
			},
			body: JSON.stringify({
				type: 'audio_generation_started',
				draftId: 'draft-1',
			}),
		},
	)
	const response = await action({ request })
	expect(response.status).toBe(200)
	expect(verifyCallKentAudioProcessorCallbackSignature).toHaveBeenCalled()
	expect(parseCallKentAudioProcessorEvent).toHaveBeenCalled()
	expect(handleCallKentAudioProcessorEvent).toHaveBeenCalledWith({
		type: 'audio_generation_started',
		draftId: 'draft-1',
	})
})
