import { expect, test, vi } from 'vitest'

vi.mock('@cloudflare/sandbox', () => ({
	Sandbox: class MockSandbox {},
	getSandbox: vi.fn(),
}))

vi.mock('./call-kent-audio-r2', () => ({
	createSignedEpisodeAudioUrls: vi.fn(),
}))

import { handleQueueBatch, processMessage } from './index.ts'
import { type Env } from './env'

function createEnv(): Env {
	return {
		Sandbox: {} as never,
		R2_ENDPOINT: 'https://example.r2.cloudflarestorage.com',
		R2_ACCESS_KEY_ID: 'access-key',
		R2_SECRET_ACCESS_KEY: 'secret-key',
		CALL_KENT_R2_BUCKET: 'call-kent-audio',
		CALL_KENT_AUDIO_CALLBACK_URL:
			'https://kentcdodds.com/resources/calls/episode-audio-callback',
		CALL_KENT_AUDIO_CALLBACK_SECRET: 'callback-secret',
	}
}

test('processMessage sends started and completed callbacks around sandbox exec', async () => {
	const sendCallback = vi.fn().mockResolvedValue(undefined)
	const createSignedUrls = vi.fn().mockResolvedValue({
		callAudioUrl: 'https://example.com/call',
		responseAudioUrl: 'https://example.com/response',
		episodeAudioKey: 'call-kent/drafts/draft-1/episode.mp3',
		episodeUploadUrl: 'https://example.com/episode',
		callerSegmentAudioKey: 'call-kent/drafts/draft-1/caller-segment.mp3',
		callerSegmentUploadUrl: 'https://example.com/caller',
		responseSegmentAudioKey: 'call-kent/drafts/draft-1/response-segment.mp3',
		responseSegmentUploadUrl: 'https://example.com/response-segment',
	})
	const runSandboxJob = vi.fn().mockResolvedValue({
		episodeAudioSize: 12345,
		callerSegmentAudioSize: 2345,
		responseSegmentAudioSize: 3456,
	})

	await processMessage({
		message: {
			body: {
				draftId: 'draft-1',
				callAudioKey: 'call-kent/calls/call-1/call.webm',
				responseAudioKey: 'call-kent/drafts/draft-1/response.webm',
			},
			attempts: 2,
			ack: vi.fn(),
			retry: vi.fn(),
		},
		env: createEnv(),
		sendCallback,
		createSignedUrls,
		runSandboxJob,
	})

	expect(sendCallback).toHaveBeenNthCalledWith(
		1,
		expect.objectContaining({
			event: {
				type: 'audio_generation_started',
				draftId: 'draft-1',
				attempt: 2,
			},
		}),
	)
	expect(runSandboxJob).toHaveBeenCalledWith(
		expect.objectContaining({
			sandboxId: expect.stringMatching(/^call-kent-[a-z0-9]+-[a-f0-9]+$/),
			request: expect.objectContaining({
				draftId: 'draft-1',
				attempt: 2,
				callAudioUrl: 'https://example.com/call',
				responseAudioUrl: 'https://example.com/response',
			}),
		}),
	)
	expect(runSandboxJob.mock.calls[0]?.[0].sandboxId.length).toBeLessThanOrEqual(63)
	expect(sendCallback).toHaveBeenNthCalledWith(
		2,
		expect.objectContaining({
			event: {
				type: 'audio_generation_completed',
				draftId: 'draft-1',
				episodeAudioKey: 'call-kent/drafts/draft-1/episode.mp3',
				episodeAudioContentType: 'audio/mpeg',
				episodeAudioSize: 12345,
				callerSegmentAudioKey: 'call-kent/drafts/draft-1/caller-segment.mp3',
				responseSegmentAudioKey:
					'call-kent/drafts/draft-1/response-segment.mp3',
				attempt: 2,
			},
		}),
	)
})

test('handleQueueBatch retries failed sandbox jobs after sending a failed callback', async () => {
	const ack = vi.fn()
	const retry = vi.fn()
	const sendCallback = vi.fn().mockResolvedValue(undefined)
	const createSignedUrls = vi.fn().mockResolvedValue({
		callAudioUrl: 'https://example.com/call',
		responseAudioUrl: 'https://example.com/response',
		episodeAudioKey: 'call-kent/drafts/draft-1/episode.mp3',
		episodeUploadUrl: 'https://example.com/episode',
		callerSegmentAudioKey: 'call-kent/drafts/draft-1/caller-segment.mp3',
		callerSegmentUploadUrl: 'https://example.com/caller',
		responseSegmentAudioKey: 'call-kent/drafts/draft-1/response-segment.mp3',
		responseSegmentUploadUrl: 'https://example.com/response-segment',
	})
	const runSandboxJob = vi.fn().mockRejectedValue(new Error('ffmpeg exploded'))

	await handleQueueBatch({
		batch: {
			messages: [
				{
					body: {
						draftId: 'draft-1',
						callAudioKey: 'call-kent/calls/call-1/call.webm',
						responseAudioKey: 'call-kent/drafts/draft-1/response.webm',
					},
					attempts: 1,
					ack,
					retry,
				},
			],
		},
		env: createEnv(),
		sendCallback,
		createSignedUrls,
		runSandboxJob,
	})

	expect(ack).not.toHaveBeenCalled()
	expect(retry).toHaveBeenCalledTimes(1)
	expect(sendCallback).toHaveBeenNthCalledWith(
		2,
		expect.objectContaining({
			event: {
				type: 'audio_generation_failed',
				draftId: 'draft-1',
				errorMessage: 'ffmpeg exploded',
				attempt: 1,
			},
		}),
	)
})

test('handleQueueBatch retries invalid messages without attempting callbacks', async () => {
	const ack = vi.fn()
	const retry = vi.fn()
	const sendCallback = vi.fn().mockResolvedValue(undefined)

	await handleQueueBatch({
		batch: {
			messages: [
				{
					body: { nope: true },
					attempts: 1,
					ack,
					retry,
				},
			],
		},
		env: createEnv(),
		sendCallback,
	})

	expect(ack).not.toHaveBeenCalled()
	expect(retry).toHaveBeenCalledTimes(1)
	expect(sendCallback).not.toHaveBeenCalled()
})

test('handleQueueBatch sends a failed callback for invalid payloads that still include draftId', async () => {
	const ack = vi.fn()
	const retry = vi.fn()
	const sendCallback = vi.fn().mockResolvedValue(undefined)

	await handleQueueBatch({
		batch: {
			messages: [
				{
					body: {
						draftId: 'draft-1',
						callAudioKey: 'call-kent/calls/call-1/call.webm',
					},
					attempts: 3,
					ack,
					retry,
				},
			],
		},
		env: createEnv(),
		sendCallback,
	})

	expect(ack).not.toHaveBeenCalled()
	expect(retry).toHaveBeenCalledTimes(1)
	expect(sendCallback).toHaveBeenCalledTimes(1)
	expect(sendCallback).toHaveBeenCalledWith(
		expect.objectContaining({
			event: expect.objectContaining({
				type: 'audio_generation_failed',
				draftId: 'draft-1',
				attempt: 3,
			}),
		}),
	)
})
