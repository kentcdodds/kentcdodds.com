import { expect, test, vi } from 'vitest'
import { requestCallKentEpisodeAudioGeneration } from '../call-kent-audio-processor.server.ts'

test('requestCallKentEpisodeAudioGeneration enqueues cloudflare queue message', async () => {
	vi.clearAllMocks()
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

test('requestCallKentEpisodeAudioGeneration throws on cloudflare queue timeout', async () => {
	vi.clearAllMocks()
	process.env.CALL_KENT_AUDIO_CF_QUEUE_ID = 'queue-123'
	process.env.CALL_KENT_AUDIO_CF_API_BASE_URL =
		'https://api.cloudflare.com/client/v4'
	process.env.CLOUDFLARE_ACCOUNT_ID = 'acct-123'
	process.env.CLOUDFLARE_API_TOKEN = 'token-123'
	const timeoutError = new Error('aborted')
	timeoutError.name = 'AbortError'
	vi.spyOn(global, 'fetch').mockRejectedValue(timeoutError)
	await expect(
		requestCallKentEpisodeAudioGeneration({
			draftId: 'draft-1',
			callAudioKey: 'call-kent/calls/call-1/call.webm',
			responseAudioKey: 'call-kent/drafts/draft-1/response.webm',
		}),
	).rejects.toThrow(/timed out/i)
})

test('requestCallKentEpisodeAudioGeneration throws on empty cloudflare queue response', async () => {
	vi.clearAllMocks()
	process.env.CALL_KENT_AUDIO_CF_QUEUE_ID = 'queue-123'
	process.env.CALL_KENT_AUDIO_CF_API_BASE_URL =
		'https://api.cloudflare.com/client/v4'
	process.env.CLOUDFLARE_ACCOUNT_ID = 'acct-123'
	process.env.CLOUDFLARE_API_TOKEN = 'token-123'
	vi.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 200 }))
	await expect(
		requestCallKentEpisodeAudioGeneration({
			draftId: 'draft-1',
			callAudioKey: 'call-kent/calls/call-1/call.webm',
			responseAudioKey: 'call-kent/drafts/draft-1/response.webm',
		}),
	).rejects.toThrow(/empty response/i)
})

test('requestCallKentEpisodeAudioGeneration rejects cloudflare responses without success=true', async () => {
	vi.clearAllMocks()
	process.env.CALL_KENT_AUDIO_CF_QUEUE_ID = 'queue-123'
	process.env.CALL_KENT_AUDIO_CF_API_BASE_URL =
		'https://api.cloudflare.com/client/v4'
	process.env.CLOUDFLARE_ACCOUNT_ID = 'acct-123'
	process.env.CLOUDFLARE_API_TOKEN = 'token-123'
	vi.spyOn(global, 'fetch').mockResolvedValue(
		new Response(JSON.stringify({}), { status: 200 }),
	)
	await expect(
		requestCallKentEpisodeAudioGeneration({
			draftId: 'draft-1',
			callAudioKey: 'call-kent/calls/call-1/call.webm',
			responseAudioKey: 'call-kent/drafts/draft-1/response.webm',
		}),
	).rejects.toThrow(/success=true/i)
})

test('requestCallKentEpisodeAudioGeneration surfaces response body read failures', async () => {
	vi.clearAllMocks()
	process.env.CALL_KENT_AUDIO_CF_QUEUE_ID = 'queue-123'
	process.env.CALL_KENT_AUDIO_CF_API_BASE_URL =
		'https://api.cloudflare.com/client/v4'
	process.env.CLOUDFLARE_ACCOUNT_ID = 'acct-123'
	process.env.CLOUDFLARE_API_TOKEN = 'token-123'
	vi.spyOn(global, 'fetch').mockResolvedValue({
		ok: true,
		status: 200,
		statusText: 'OK',
		text: vi.fn().mockRejectedValue(new Error('read failed')),
	} as unknown as Response)
	await expect(
		requestCallKentEpisodeAudioGeneration({
			draftId: 'draft-1',
			callAudioKey: 'call-kent/calls/call-1/call.webm',
			responseAudioKey: 'call-kent/drafts/draft-1/response.webm',
		}),
	).rejects.toThrow(/unable to read response body/i)
})
