import { expect, test, vi } from 'vitest'

vi.mock('@cloudflare/sandbox', () => ({
	Sandbox: class MockSandbox {},
	getSandbox: vi.fn(),
}))

import {
	createSandboxCommandEnvironment,
	runCallKentAudioSandboxJob,
} from './call-kent-audio-sandbox.ts'

test('createSandboxCommandEnvironment includes the sandbox CLI inputs', () => {
	expect(
		createSandboxCommandEnvironment({
			draftId: 'draft-123',
			attempt: 2,
			callAudioUrl: 'https://example.com/call',
			responseAudioUrl: 'https://example.com/response',
			episodeUploadUrl: 'https://example.com/episode',
			callerSegmentUploadUrl: 'https://example.com/caller',
			responseSegmentUploadUrl: 'https://example.com/response-segment',
		}),
	).toEqual({
		CALL_KENT_AUDIO_DRAFT_ID: 'draft-123',
		CALL_KENT_AUDIO_ATTEMPT: '2',
		CALL_AUDIO_URL: 'https://example.com/call',
		RESPONSE_AUDIO_URL: 'https://example.com/response',
		EPISODE_UPLOAD_URL: 'https://example.com/episode',
		CALLER_SEGMENT_UPLOAD_URL: 'https://example.com/caller',
		RESPONSE_SEGMENT_UPLOAD_URL: 'https://example.com/response-segment',
	})
})

test('runCallKentAudioSandboxJob executes the sandbox CLI and destroys the sandbox', async () => {
	const exec = vi.fn().mockResolvedValue({
		success: true,
		stdout:
			'{"episodeAudioSize":101,"callerSegmentAudioSize":51,"responseSegmentAudioSize":61}',
		stderr: '',
		exitCode: 0,
	})
	const destroy = vi.fn().mockResolvedValue(undefined)
	const getSandboxImpl = vi.fn().mockReturnValue({ exec, destroy })

	const result = await runCallKentAudioSandboxJob({
		binding: {} as never,
		sandboxId: 'sandbox-1',
		request: {
			draftId: 'draft-123',
			attempt: 2,
			callAudioUrl: 'https://example.com/call',
			responseAudioUrl: 'https://example.com/response',
			episodeUploadUrl: 'https://example.com/episode',
			callerSegmentUploadUrl: 'https://example.com/caller',
			responseSegmentUploadUrl: 'https://example.com/response-segment',
		},
		getSandboxImpl: getSandboxImpl as never,
	})

	expect(getSandboxImpl).toHaveBeenCalledWith({}, 'sandbox-1')
	expect(exec).toHaveBeenCalledWith('/usr/local/bin/call-kent-audio-cli', {
		env: expect.objectContaining({
			CALL_KENT_AUDIO_DRAFT_ID: 'draft-123',
			CALL_AUDIO_URL: 'https://example.com/call',
		}),
		timeout: 1800000,
	})
	expect(destroy).toHaveBeenCalledTimes(1)
	expect(result).toEqual({
		episodeAudioSize: 101,
		callerSegmentAudioSize: 51,
		responseSegmentAudioSize: 61,
	})
})

test('runCallKentAudioSandboxJob surfaces sandbox stderr on failure', async () => {
	const destroy = vi.fn().mockResolvedValue(undefined)
	const getSandboxImpl = vi.fn().mockReturnValue({
		exec: vi.fn().mockResolvedValue({
			success: false,
			stdout: '',
			stderr: 'ffmpeg exploded',
			exitCode: 1,
		}),
		destroy,
	})

	await expect(
		runCallKentAudioSandboxJob({
			binding: {} as never,
			sandboxId: 'sandbox-1',
			request: {
				draftId: 'draft-123',
				attempt: 1,
				callAudioUrl: 'https://example.com/call',
				responseAudioUrl: 'https://example.com/response',
				episodeUploadUrl: 'https://example.com/episode',
				callerSegmentUploadUrl: 'https://example.com/caller',
				responseSegmentUploadUrl: 'https://example.com/response-segment',
			},
			getSandboxImpl: getSandboxImpl as never,
		}),
	).rejects.toThrow(/ffmpeg exploded/i)
	expect(destroy).toHaveBeenCalledTimes(1)
})

test('runCallKentAudioSandboxJob retries transient sandbox startup errors', async () => {
	const exec = vi
		.fn()
		.mockRejectedValueOnce(
			new Error('SandboxError: Container is starting. Please retry in a moment.'),
		)
		.mockRejectedValueOnce(
			new Error('Error checking if container is ready: The operation was aborted'),
		)
		.mockResolvedValue({
			success: true,
			stdout:
				'{"episodeAudioSize":101,"callerSegmentAudioSize":51,"responseSegmentAudioSize":61}',
			stderr: '',
			exitCode: 0,
		})
	const destroy = vi.fn().mockResolvedValue(undefined)
	const sleepImpl = vi.fn().mockResolvedValue(undefined)
	const getSandboxImpl = vi.fn().mockReturnValue({ exec, destroy })

	const result = await runCallKentAudioSandboxJob({
		binding: {} as never,
		sandboxId: 'sandbox-1',
		request: {
			draftId: 'draft-123',
			attempt: 2,
			callAudioUrl: 'https://example.com/call',
			responseAudioUrl: 'https://example.com/response',
			episodeUploadUrl: 'https://example.com/episode',
			callerSegmentUploadUrl: 'https://example.com/caller',
			responseSegmentUploadUrl: 'https://example.com/response-segment',
		},
		getSandboxImpl: getSandboxImpl as never,
		sleepImpl,
	})

	expect(exec).toHaveBeenCalledTimes(3)
	expect(sleepImpl).toHaveBeenCalledTimes(2)
	expect(destroy).toHaveBeenCalledTimes(1)
	expect(result).toEqual({
		episodeAudioSize: 101,
		callerSegmentAudioSize: 51,
		responseSegmentAudioSize: 61,
	})
})
