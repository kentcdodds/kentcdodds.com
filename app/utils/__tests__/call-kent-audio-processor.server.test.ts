import { expect, test, vi } from 'vitest'
import { requestCallKentEpisodeAudioGeneration } from '../call-kent-audio-processor.server.ts'

test('requestCallKentEpisodeAudioGeneration enqueues cloudflare queue message', async () => {
	vi.clearAllMocks()
	process.env.CALL_KENT_AUDIO_PROCESSOR_MODE = 'cloudflare'
	process.env.CALL_KENT_AUDIO_CF_QUEUE_ID = 'queue-123'
	process.env.CALL_KENT_AUDIO_CF_API_BASE_URL =
		'https://api.cloudflare.com/client/v4'
	process.env.CLOUDFLARE_ACCOUNT_ID = 'acct-123'
	process.env.CLOUDFLARE_API_TOKEN = 'token-123'
	const fetchSpy = vi
		.spyOn(global, 'fetch')
		.mockResolvedValue(
			new Response(JSON.stringify({ success: true }), { status: 200 }),
		)
	await requestCallKentEpisodeAudioGeneration({
		draftId: 'draft-1',
		callAudioKey: 'call-kent/calls/call-1/call.webm',
		responseAudioKey: 'call-kent/drafts/draft-1/response.webm',
	})
	expect(fetchSpy).toHaveBeenCalledWith(
		'https://api.cloudflare.com/client/v4/accounts/acct-123/queues/queue-123/messages',
		expect.objectContaining({
			method: 'POST',
			headers: expect.objectContaining({
				Authorization: 'Bearer token-123',
				'Content-Type': 'application/json',
			}),
		}),
	)
	const [, options] = fetchSpy.mock.calls[0]!
	expect(JSON.parse(String(options?.body))).toEqual({
		content_type: 'json',
		body: {
			draftId: 'draft-1',
			callAudioKey: 'call-kent/calls/call-1/call.webm',
			responseAudioKey: 'call-kent/drafts/draft-1/response.webm',
		},
	})
})

test('requestCallKentEpisodeAudioGeneration throws on cloudflare queue errors', async () => {
	vi.clearAllMocks()
	process.env.CALL_KENT_AUDIO_PROCESSOR_MODE = 'cloudflare'
	process.env.CALL_KENT_AUDIO_CF_QUEUE_ID = 'queue-123'
	process.env.CALL_KENT_AUDIO_CF_API_BASE_URL =
		'https://api.cloudflare.com/client/v4'
	process.env.CLOUDFLARE_ACCOUNT_ID = 'acct-123'
	process.env.CLOUDFLARE_API_TOKEN = 'token-123'
	vi.spyOn(global, 'fetch').mockResolvedValue(
		new Response('boom', { status: 500, statusText: 'Server Error' }),
	)
	await expect(
		requestCallKentEpisodeAudioGeneration({
			draftId: 'draft-1',
			callAudioKey: 'call-kent/calls/call-1/call.webm',
			responseAudioKey: 'call-kent/drafts/draft-1/response.webm',
		}),
	).rejects.toThrow(/Cloudflare queue enqueue failed/i)
})
