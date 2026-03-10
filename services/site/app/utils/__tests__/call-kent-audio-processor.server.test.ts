import { expect, test, vi } from 'vitest'
import { requestCallKentEpisodeAudioGeneration } from '../call-kent-audio-processor.server.ts'

test('requestCallKentEpisodeAudioGeneration starts cloudflare workflow instance', async () => {
	vi.clearAllMocks()
	process.env.CALL_KENT_AUDIO_CF_WORKFLOW_NAME = 'call-kent-audio-pipeline'
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
		callTitle: 'Should I learn workflows?',
		callerNotes: 'I am migrating this pipeline.',
		callerName: 'Sam',
		savedCallerTranscript: 'How should I migrate this pipeline?',
	})
	expect(fetchSpy).toHaveBeenCalledWith(
		'https://api.cloudflare.com/client/v4/accounts/acct-123/workflows/call-kent-audio-pipeline/instances',
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
		instance_id: 'draft-1',
		params: {
			draftId: 'draft-1',
			callAudioKey: 'call-kent/calls/call-1/call.webm',
			responseAudioKey: 'call-kent/drafts/draft-1/response.webm',
			callTitle: 'Should I learn workflows?',
			callerNotes: 'I am migrating this pipeline.',
			callerName: 'Sam',
			savedCallerTranscript: 'How should I migrate this pipeline?',
			cloudflareAccountId: 'acct-123',
		},
	})
})

test('requestCallKentEpisodeAudioGeneration throws on cloudflare workflow errors', async () => {
	vi.clearAllMocks()
	process.env.CALL_KENT_AUDIO_CF_WORKFLOW_NAME = 'call-kent-audio-pipeline'
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
			callTitle: 'Title',
			callerNotes: null,
			callerName: 'Sam',
			savedCallerTranscript: null,
		}),
	).rejects.toThrow(/Cloudflare workflow start failed/i)
})

test('requestCallKentEpisodeAudioGeneration throws on cloudflare workflow timeout', async () => {
	vi.clearAllMocks()
	process.env.CALL_KENT_AUDIO_CF_WORKFLOW_NAME = 'call-kent-audio-pipeline'
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
			callTitle: 'Title',
			callerNotes: null,
			callerName: 'Sam',
			savedCallerTranscript: null,
		}),
	).rejects.toThrow(/timed out/i)
})

test('requestCallKentEpisodeAudioGeneration throws on empty cloudflare workflow response', async () => {
	vi.clearAllMocks()
	process.env.CALL_KENT_AUDIO_CF_WORKFLOW_NAME = 'call-kent-audio-pipeline'
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
			callTitle: 'Title',
			callerNotes: null,
			callerName: 'Sam',
			savedCallerTranscript: null,
		}),
	).rejects.toThrow(/empty response/i)
})

test('requestCallKentEpisodeAudioGeneration rejects cloudflare workflow responses without success=true', async () => {
	vi.clearAllMocks()
	process.env.CALL_KENT_AUDIO_CF_WORKFLOW_NAME = 'call-kent-audio-pipeline'
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
			callTitle: 'Title',
			callerNotes: null,
			callerName: 'Sam',
			savedCallerTranscript: null,
		}),
	).rejects.toThrow(/success=true/i)
})

test('requestCallKentEpisodeAudioGeneration surfaces workflow response body read failures', async () => {
	vi.clearAllMocks()
	process.env.CALL_KENT_AUDIO_CF_WORKFLOW_NAME = 'call-kent-audio-pipeline'
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
			callTitle: 'Title',
			callerNotes: null,
			callerName: 'Sam',
			savedCallerTranscript: null,
		}),
	).rejects.toThrow(/unable to read response body/i)
})
