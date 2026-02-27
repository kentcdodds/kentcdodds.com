import { expect, test, vi } from 'vitest'

const { processCallKentEpisodeDraftQueueMessageMock } = vi.hoisted(() => ({
	processCallKentEpisodeDraftQueueMessageMock: vi.fn(),
}))

vi.mock('#app/utils/call-kent-episode-draft-queue.server.ts', () => ({
	processCallKentEpisodeDraftQueueMessage:
		processCallKentEpisodeDraftQueueMessageMock,
}))

vi.mock('../oauth-provider.ts', () => ({
	createWorkerOAuthProvider: (defaultHandler: {
		fetch: (request: Request, env: Record<string, unknown>, ctx: unknown) => Promise<Response>
	}) => ({
		fetch: (request: Request, env: Record<string, unknown>, ctx: unknown) =>
			defaultHandler.fetch(request, env, ctx),
	}),
}))

import * as worker from '../index.ts'

test('queue handler processes all Call Kent draft messages', async () => {
	processCallKentEpisodeDraftQueueMessageMock.mockResolvedValue(undefined)

	await worker.queue(
		{
			messages: [
				{ body: { draftId: 'draft_1', responseAudioKey: 'response_1' } },
				{ body: { draftId: 'draft_2', responseAudioKey: null } },
			],
		},
		{},
	)

	expect(processCallKentEpisodeDraftQueueMessageMock).toHaveBeenCalledTimes(2)
	expect(processCallKentEpisodeDraftQueueMessageMock).toHaveBeenNthCalledWith(
		1,
		{
			draftId: 'draft_1',
			responseAudioKey: 'response_1',
		},
	)
	expect(processCallKentEpisodeDraftQueueMessageMock).toHaveBeenNthCalledWith(
		2,
		{
			draftId: 'draft_2',
			responseAudioKey: null,
		},
	)
})

test('queue handler retries messages that fail processing', async () => {
	processCallKentEpisodeDraftQueueMessageMock.mockRejectedValueOnce(
		new Error('queue-processing-failed'),
	)
	const retry = vi.fn()
	const consoleErrorSpy = vi
		.spyOn(console, 'error')
		.mockImplementation(() => undefined)

	try {
		await worker.queue(
			{
				messages: [
					{ body: { draftId: 'draft_3', responseAudioKey: 'response_3' }, retry },
				],
			},
			{},
		)
	} finally {
		consoleErrorSpy.mockRestore()
	}

	expect(retry).toHaveBeenCalledTimes(1)
})
