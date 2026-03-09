// @vitest-environment node
import { Buffer } from 'node:buffer'
import { Readable } from 'node:stream'
import { expect, test, vi } from 'vitest'

vi.mock('#app/utils/call-kent-audio-storage.server.ts', () => ({
	getAudioBuffer: vi.fn(),
	getAudioStream: vi.fn(),
	parseHttpByteRangeHeader: vi.fn(),
}))

vi.mock('#app/utils/prisma.server.ts', () => ({
	prisma: {
		callKentEpisodeDraft: {
			findUnique: vi.fn(),
		},
	},
}))

vi.mock('#app/utils/session.server.ts', () => ({
	requireAdminUser: vi.fn(),
}))

import {
	getAudioBuffer,
	getAudioStream,
} from '#app/utils/call-kent-audio-storage.server.ts'
import { prisma } from '#app/utils/prisma.server.ts'
import { loader } from '../draft-response-audio.ts'

test('draft-response-audio streams saved response audio for admins', async () => {
	vi.clearAllMocks()
	vi.mocked(prisma.callKentEpisodeDraft.findUnique).mockResolvedValue({
		responseAudioKey: 'call-kent/drafts/draft-1/response.webm',
		responseAudioContentType: 'audio/webm',
		responseAudioSize: 5,
	} as any)
	vi.mocked(getAudioStream).mockResolvedValue({
		body: Readable.from(Buffer.from('hello')),
	} as any)

	const response = await loader({
		request: new Request(
			'http://localhost/resources/calls/draft-response-audio?callId=call-1',
		),
	} as any)

	expect(response.status).toBe(200)
	expect(response.headers.get('content-type')).toBe('audio/webm')
	expect(Buffer.from(await response.arrayBuffer()).toString('utf8')).toBe(
		'hello',
	)
	expect(getAudioStream).toHaveBeenCalledWith({
		key: 'call-kent/drafts/draft-1/response.webm',
		range: undefined,
	})
})

test('draft-response-audio falls back to buffered reads when size is missing', async () => {
	vi.clearAllMocks()
	vi.mocked(prisma.callKentEpisodeDraft.findUnique).mockResolvedValue({
		responseAudioKey: 'call-kent/drafts/draft-1/response.webm',
		responseAudioContentType: 'audio/webm',
		responseAudioSize: null,
	} as any)
	vi.mocked(getAudioBuffer).mockResolvedValue(Buffer.from('retry me'))

	const response = await loader({
		request: new Request(
			'http://localhost/resources/calls/draft-response-audio?callId=call-1',
		),
	} as any)

	expect(response.status).toBe(200)
	expect(Buffer.from(await response.arrayBuffer()).toString('utf8')).toBe(
		'retry me',
	)
	expect(getAudioBuffer).toHaveBeenCalledWith({
		key: 'call-kent/drafts/draft-1/response.webm',
	})
})
