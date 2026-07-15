import { expect, test, vi } from 'vitest'
import { type RecordingFormData } from '#app/components/calls/recording-form.tsx'

vi.mock('#app/components/calls/recording-form.tsx', () => ({}))

vi.mock('#app/utils/cache.server.ts', () => ({
	cache: {},
	lruCache: {},
	cachified: vi.fn(
		async ({ getFreshValue }: { getFreshValue: () => unknown }) =>
			getFreshValue(),
	),
	shouldForceFresh: vi.fn(() => false),
	invalidatePageCache: vi.fn(),
}))

vi.mock('#app/utils/session.server.ts', () => ({
	requireUser: vi.fn(async () => ({
		id: 'user_1',
		email: 'probe@example.com',
		firstName: 'Probe',
		team: 'BLUE',
		discordId: null,
	})),
	requireAdminUser: vi.fn(),
}))

vi.mock('#app/utils/db.server.ts', () => ({
	db: {
		create: vi.fn(async (_table, data: { id: string }) => ({
			id: data.id,
		})),
		findOne: vi.fn(),
		update: vi.fn(),
		updateMany: vi.fn(),
	},
}))

vi.mock('#app/utils/auth-write-flows.server.ts', () => ({
	recordPublishedCallKentEpisode: vi.fn(),
	replaceCallKentEpisodeDraft: vi.fn(),
}))

vi.mock('#app/utils/call-kent-transcription-queue.server.ts', () => ({
	enqueueCallKentTranscriptionJob: vi.fn(),
}))

vi.mock('#app/utils/discord.server.ts', () => ({
	sendMessageFromDiscordBot: vi.fn(),
}))

vi.mock('#app/utils/send-email.server.ts', () => ({
	sendEmail: vi.fn(),
}))

vi.mock('#app/utils/transistor.server.ts', () => ({
	bumpEpisodesCacheGeneration: vi.fn(),
	createEpisode: vi.fn(),
	refreshEpisodesAfterPublish: vi.fn(),
}))

vi.mock('#app/utils/markdown.server.ts', () => ({
	markdownToHtml: vi.fn(async (value: string) => value),
}))

vi.mock('#app/utils/call-kent-audio-processor.server.ts', () => ({
	requestCallKentEpisodeAudioGeneration: vi.fn(),
}))

vi.mock('#app/utils/call-kent-audio-storage.server.ts', () => ({
	deleteAudioObject: vi.fn(async () => {}),
	getAudioBuffer: vi.fn(async () => Buffer.from('audio')),
	parseBase64DataUrl: vi.fn((dataUrl: string) => ({
		buffer: Buffer.from(dataUrl),
		contentType: 'audio/webm',
	})),
	putCallAudioFromBuffer: vi.fn(
		async ({
			callId,
			audio,
			contentType,
		}: {
			callId: string
			audio: Uint8Array
			contentType: string
		}) => ({
			key: `audio-${callId}`,
			contentType,
			size: audio.byteLength,
		}),
	),
	putCallAudioFromDataUrl: vi.fn(
		async ({ callId }: { callId: string; dataUrl: string }) => ({
			key: `audio-${callId}`,
			contentType: 'audio/webm',
			size: 1024,
		}),
	),
	putEpisodeDraftResponseAudioFromBuffer: vi.fn(async () => ({
		key: 'response-audio',
		contentType: 'audio/webm',
		size: 1024,
	})),
}))

import { putCallAudioFromDataUrl } from '#app/utils/call-kent-audio-storage.server.ts'
import { enqueueCallKentTranscriptionJob } from '#app/utils/call-kent-transcription-queue.server.ts'
import { invalidatePageCache } from '#app/utils/cache.server.ts'
import { db } from '#app/utils/db.server.ts'
import { recordPublishedCallKentEpisode } from '#app/utils/auth-write-flows.server.ts'
import { sendEmail } from '#app/utils/send-email.server.ts'
import {
	bumpEpisodesCacheGeneration,
	createEpisode,
	refreshEpisodesAfterPublish,
} from '#app/utils/transistor.server.ts'
import { action } from '../save.tsx'

test('create-call accepts a large multipart audio file', async () => {
	vi.clearAllMocks()
	const body = new FormData()
	body.set('intent', 'create-call')
	body.set('title', 'My large call')
	body.set('notes', 'A large recording should submit successfully.')
	body.set('questionText', '')
	body.set(
		'audio',
		new File([new Uint8Array(16 * 1024 * 1024)], 'call.webm', {
			type: 'audio/webm',
		}),
	)
	const request = new Request('http://localhost/resources/calls/save', {
		method: 'POST',
		headers: {
			host: 'localhost',
		},
		body,
	})

	const response = (await action({ request } as never)) as Response

	expect(response.status).toBe(302)
	expect(response.headers.get('location')).toMatch(/^\/calls\/record\//)
	expect(db.create).toHaveBeenCalledWith(
		expect.anything(),
		expect.objectContaining({
			callerTranscriptStatus: 'PROCESSING',
			callerTranscriptErrorMessage: null,
			callerTranscriptJobId: expect.any(String),
			callerTranscriptLeaseId: null,
			callerTranscriptLeaseExpiresAt: null,
		}),
		{ returnRow: true },
	)
	expect(enqueueCallKentTranscriptionJob).toHaveBeenCalledWith({
		version: 1,
		type: 'caller-transcription',
		callId: expect.any(String),
		jobId: expect.any(String),
	})
	expect(sendEmail).toHaveBeenCalledWith({
		to: '"Kent C. Dodds" <me@kentcdodds.com>',
		from: '"Call Kent" <hello+calls@kentcdodds.com>',
		replyTo: '"Probe" <probe@example.com>',
		subject: 'New Call Kent call: My large call',
		text: expect.stringMatching(
			/New Call Kent call[\s\S]*A large recording should submit successfully\.[\s\S]*\/calls\/admin\//,
		),
	})
}, 30_000)

test('create-call stores typed question wording as a ready transcript without enqueueing', async () => {
	vi.clearAllMocks()
	const body = new URLSearchParams({
		intent: 'create-call',
		title: 'Typed question call',
		notes: 'These editable notes are not transcript provenance.',
		questionText:
			'  How should I structure loaders without duplicating fetches?  ',
		audio: 'data:audio/webm;codecs=opus;base64,ZmFrZQ==',
	})
	const request = new Request('http://localhost/resources/calls/save', {
		method: 'POST',
		headers: {
			host: 'localhost',
			'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
		},
		body,
	})

	const response = (await action({ request } as never)) as Response

	expect(response.status).toBe(302)
	expect(db.create).toHaveBeenCalledWith(
		expect.anything(),
		expect.objectContaining({
			notes: 'These editable notes are not transcript provenance.',
			callerTranscript:
				'Probe: How should I structure loaders without duplicating fetches?',
			callerTranscriptStatus: 'READY',
			callerTranscriptErrorMessage: null,
			callerTranscriptJobId: null,
		}),
		{ returnRow: true },
	)
	expect(enqueueCallKentTranscriptionJob).not.toHaveBeenCalled()
})

test('create-call labels an anonymous typed question transcript as Caller', async () => {
	vi.clearAllMocks()
	const body = new URLSearchParams({
		intent: 'create-call',
		title: 'Anonymous typed call',
		questionText: 'What makes a useful abstraction in a growing codebase?',
		anonymous: 'on',
		audio: 'data:audio/webm;codecs=opus;base64,ZmFrZQ==',
	})
	const request = new Request('http://localhost/resources/calls/save', {
		method: 'POST',
		headers: {
			host: 'localhost',
			'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
		},
		body,
	})

	const response = (await action({ request } as never)) as Response

	expect(response.status).toBe(302)
	expect(db.create).toHaveBeenCalledWith(
		expect.anything(),
		expect.objectContaining({
			isAnonymous: true,
			callerTranscript:
				'Caller: What makes a useful abstraction in a growing codebase?',
			callerTranscriptStatus: 'READY',
		}),
		{ returnRow: true },
	)
	expect(enqueueCallKentTranscriptionJob).not.toHaveBeenCalled()
})

test('create-call rejects an invalid supplied typed question instead of enqueueing', async () => {
	vi.clearAllMocks()
	const body = new URLSearchParams({
		intent: 'create-call',
		title: 'Invalid typed call',
		questionText: 'Too short',
		audio: 'data:audio/webm;codecs=opus;base64,ZmFrZQ==',
	})
	const request = new Request('http://localhost/resources/calls/save', {
		method: 'POST',
		headers: {
			host: 'localhost',
			'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
		},
		body,
	})

	const result = (await action({ request } as never)) as {
		type?: string
		data?: RecordingFormData
		init?: ResponseInit | null
	}

	expect(result.type).toBe('DataWithResponseInit')
	expect(result.init?.status).toBe(400)
	expect(result.data).toMatchObject({
		fields: {
			questionText: 'Too short',
		},
		errors: {
			questionText: 'Question text must be at least 20 characters',
		},
	})
	expect(putCallAudioFromDataUrl).not.toHaveBeenCalled()
	expect(db.create).not.toHaveBeenCalled()
	expect(enqueueCallKentTranscriptionJob).not.toHaveBeenCalled()
})

test('create-call records ERROR when caller transcription enqueue fails', async () => {
	vi.clearAllMocks()
	vi.mocked(enqueueCallKentTranscriptionJob).mockRejectedValueOnce(
		new Error('queue unavailable'),
	)
	const body = new URLSearchParams({
		intent: 'create-call',
		title: 'Queue failure call',
		audio: 'data:audio/webm;codecs=opus;base64,ZmFrZQ==',
	})
	const request = new Request('http://localhost/resources/calls/save', {
		method: 'POST',
		headers: {
			host: 'localhost',
			'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
		},
		body,
	})

	const response = (await action({ request } as never)) as Response

	expect(response.status).toBe(302)
	expect(db.updateMany).toHaveBeenCalledWith(
		expect.anything(),
		{
			callerTranscriptErrorMessage:
				'Unable to enqueue caller transcription: queue unavailable',
		},
		{
			where: {
				id: expect.any(String),
				callerTranscriptJobId: expect.any(String),
				callerTranscriptStatus: 'PROCESSING',
			},
		},
	)
})

test('create-call still accepts a urlencoded audio data URL', async () => {
	const body = new URLSearchParams({
		intent: 'create-call',
		title: 'My data URL call',
		notes: 'A legacy recording should submit successfully.',
		audio: 'data:audio/webm;codecs=opus;base64,ZmFrZQ==',
	})
	const request = new Request('http://localhost/resources/calls/save', {
		method: 'POST',
		headers: {
			host: 'localhost',
			'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
		},
		body,
	})

	const response = (await action({ request } as never)) as Response

	expect(response.status).toBe(302)
	expect(response.headers.get('location')).toMatch(/^\/calls\/record\//)
})

test('create-call rejects malformed legacy audio strings', async () => {
	vi.mocked(putCallAudioFromDataUrl).mockClear()
	const body = new URLSearchParams({
		intent: 'create-call',
		title: 'My malformed audio call',
		audio: 'not-a-data-url',
	})
	const request = new Request('http://localhost/resources/calls/save', {
		method: 'POST',
		headers: {
			host: 'localhost',
			'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
		},
		body,
	})

	const result = (await action({ request } as never)) as {
		type?: string
		data?: RecordingFormData
		init?: ResponseInit | null
	}

	expect(result.type).toBe('DataWithResponseInit')
	expect(result.init?.status).toBe(400)
	expect(result.data).toMatchObject({
		errors: {
			audio: 'Audio file is required',
		},
	})
	expect(putCallAudioFromDataUrl).not.toHaveBeenCalled()
})

test('publish invalidates the parent page cache after persistence without failing the redirect', async () => {
	vi.clearAllMocks()
	vi.mocked(db.findOne).mockResolvedValueOnce({
		id: 'call_1',
		userId: 'user_1',
		title: 'Call title',
		notes: null,
		isAnonymous: false,
		audioKey: 'call-audio',
		createdAt: new Date('2026-07-15T03:00:00.000Z'),
		user: {
			firstName: 'Probe',
			email: 'probe@example.com',
			team: 'BLUE',
		},
		episodeDraft: {
			status: 'READY',
			title: 'Exploring Interests at 15',
			description: 'Episode description',
			keywords: 'interests,learning',
			transcript: 'Probe: How should I explore my interests?',
			episodeAudioKey: 'episode-audio',
			responseAudioKey: null,
			callerSegmentAudioKey: null,
			responseSegmentAudioKey: null,
		},
	} as never)
	vi.mocked(createEpisode).mockResolvedValueOnce({
		transistorEpisodeId: 'episode_28',
		episodeUrl: 'https://kentcdodds.com/calls/05/28/exploring-interests-at-15',
		episodePath: '/calls/05/28/exploring-interests-at-15',
		imageUrl: 'https://kentcdodds.com/resources/og-image',
		seasonNumber: 5,
		episodeNumber: 28,
		slug: 'exploring-interests-at-15',
	})
	vi.mocked(recordPublishedCallKentEpisode).mockResolvedValueOnce(undefined)
	vi.mocked(refreshEpisodesAfterPublish).mockResolvedValueOnce(true)
	vi.mocked(bumpEpisodesCacheGeneration).mockResolvedValueOnce('episodes-123')
	vi.mocked(invalidatePageCache).mockRejectedValueOnce(
		new Error('CACHE_RPC unavailable'),
	)
	const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
	const body = new URLSearchParams({
		intent: 'publish-episode-draft',
		callId: 'call_1',
	})
	const request = new Request('http://localhost/resources/calls/save', {
		method: 'POST',
		body,
	})

	try {
		const response = (await action({ request } as never)) as Response

		expect(response.status).toBe(302)
		expect(response.headers.get('location')).toBe('/calls')
		expect(recordPublishedCallKentEpisode).toHaveBeenCalledOnce()
		expect(refreshEpisodesAfterPublish).toHaveBeenCalledWith({
			episodeId: 'episode_28',
		})
		expect(bumpEpisodesCacheGeneration).toHaveBeenCalledOnce()
		expect(invalidatePageCache).toHaveBeenCalledOnce()
		expect(sendEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: 'probe@example.com',
				subject: 'Your "Call Kent" episode has been published',
			}),
		)
		expect(
			vi.mocked(recordPublishedCallKentEpisode).mock.invocationCallOrder[0],
		).toBeLessThan(
			vi.mocked(refreshEpisodesAfterPublish).mock.invocationCallOrder[0] ?? 0,
		)
		expect(
			vi.mocked(refreshEpisodesAfterPublish).mock.invocationCallOrder[0],
		).toBeLessThan(
			vi.mocked(bumpEpisodesCacheGeneration).mock.invocationCallOrder[0] ?? 0,
		)
		expect(
			vi.mocked(bumpEpisodesCacheGeneration).mock.invocationCallOrder[0],
		).toBeLessThan(
			vi.mocked(invalidatePageCache).mock.invocationCallOrder[0] ?? 0,
		)
		expect(
			vi.mocked(invalidatePageCache).mock.invocationCallOrder[0],
		).toBeLessThan(vi.mocked(sendEmail).mock.invocationCallOrder[0] ?? 0)
		expect(consoleError).toHaveBeenCalledWith(
			'Call Kent episode published but cache invalidation failed.',
			{ transistorEpisodeId: 'episode_28' },
			expect.any(Error),
		)
	} finally {
		consoleError.mockRestore()
	}
})
