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

vi.mock('#app/utils/prisma.server.ts', () => ({
	prisma: {
		call: {
			create: vi.fn(async ({ data }: { data: { id: string } }) => ({
				id: data.id,
			})),
		},
	},
}))

vi.mock('#app/utils/call-kent-caller-transcript.server.ts', () => ({
	startCallKentCallerTranscriptProcessing: vi.fn(),
}))

vi.mock('#app/utils/discord.server.ts', () => ({
	sendMessageFromDiscordBot: vi.fn(),
}))

vi.mock('#app/utils/send-email.server.ts', () => ({
	sendEmail: vi.fn(),
}))

vi.mock('#app/utils/transistor.server.ts', () => ({
	createEpisode: vi.fn(),
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
import { action } from '../save.tsx'

test('create-call accepts a large multipart audio file', async () => {
	const body = new FormData()
	body.set('intent', 'create-call')
	body.set('title', 'My large call')
	body.set('notes', 'A large recording should submit successfully.')
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
}, 30_000)

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
