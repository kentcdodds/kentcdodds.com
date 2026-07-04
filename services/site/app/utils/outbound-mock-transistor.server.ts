import { randomUUID } from 'node:crypto'

function json(data: unknown, init?: ResponseInit) {
	return Response.json(data, init)
}

type TransistorEpisode = {
	id: string
	type: 'episode'
	attributes: {
		number: number
		season: number
		title: string
		duration: number
		summary: string
		description: string
		keywords: string
		media_url: string
		share_url: string
		embed_html: string
		embed_html_dark: string
		published_at: string | null
		status: string
	}
}

const episodes = new Map<string, TransistorEpisode>()
const uploads = new Map<string, Uint8Array>()

function requiredHeader(headers: Headers, name: string) {
	const value = headers.get(name)
	if (!value) throw new Error(`${name} header is required`)
	return value
}

function makeEpisode(overrides: {
	id?: string
	attributes?: Partial<TransistorEpisode['attributes']>
} = {}): TransistorEpisode {
	return {
		id: overrides.id ?? randomUUID(),
		type: 'episode',
		attributes: {
			number: 1,
			season: 1,
			title: 'Mock Transistor Episode',
			duration: 300,
			summary: 'Mock summary',
			description: 'Mock description',
			keywords: 'mock,podcast',
			media_url: 'https://media.transistor.fm/mock/mock.mp3',
			share_url: 'https://share.transistor.fm/s/mock',
			embed_html:
				'<iframe src="https://share.transistor.fm/e/mock" width="100%" height="180"></iframe>',
			embed_html_dark:
				'<iframe src="https://share.transistor.fm/e/mock/dark" width="100%" height="180"></iframe>',
			published_at: null,
			status: 'draft',
			...overrides.attributes,
		},
	}
}

export async function maybeHandleTransistorMockFetch(request: Request) {
	const url = new URL(request.url)

	if (
		url.hostname === 'transistorupload.s3.amazonaws.com' &&
		request.method === 'PUT'
	) {
		const bytes = new Uint8Array(await request.arrayBuffer())
		uploads.set(url.pathname, bytes)
		return new Response('', { status: 200 })
	}

	if (url.hostname !== 'api.transistor.fm') return null

	if (
		request.method === 'GET' &&
		url.pathname === '/v1/episodes/authorize_upload'
	) {
		requiredHeader(request.headers, 'x-api-key')
		const filename = url.searchParams.get('filename')
		if (!filename) {
			return json({ errors: [{ title: 'filename is required' }] }, { status: 400 })
		}
		const bucketId = randomUUID()
		const fileId = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
		const uploadUrl = `https://transistorupload.s3.amazonaws.com/uploads/api/${bucketId}/${fileId}`
		return json({
			data: {
				id: randomUUID(),
				type: 'upload_authorization',
				attributes: {
					upload_url: uploadUrl,
					audio_url: uploadUrl,
					content_type: 'audio/mpeg',
					expires_in: 3600,
				},
			},
		})
	}

	if (
		request.method === 'POST' &&
		url.pathname === '/v1/episodes/authorize_upload'
	) {
		requiredHeader(request.headers, 'x-api-key')
		const bucketId = randomUUID()
		const fileId = randomUUID()
		const uploadUrl = `https://transistorupload.s3.amazonaws.com/uploads/api/${bucketId}/${fileId}`
		return json({
			data: {
				id: randomUUID(),
				type: 'upload_authorization',
				attributes: {
					upload_url: uploadUrl,
					audio_url: `https://transistorupload.s3.amazonaws.com/uploads/api/${bucketId}/${fileId}`,
					content_type: 'audio/mpeg',
					expires_in: 3600,
				},
			},
		})
	}

	if (request.method === 'POST' && url.pathname === '/v1/episodes') {
		requiredHeader(request.headers, 'x-api-key')
		const body = (await request.json()) as {
			episode?: {
				title?: string
				summary?: string
				description?: string
				keywords?: string
				season?: number
				number?: number
				audio_url?: string
			}
		}
		const nextNumber =
			[...episodes.values()].reduce(
				(max, episode) => Math.max(max, episode.attributes.number ?? 0),
				0,
			) + 1
		const episode = makeEpisode({
			attributes: {
				title: body.episode?.title ?? 'Mock Transistor Episode',
				summary: body.episode?.summary ?? 'Mock summary',
				description: body.episode?.description ?? 'Mock description',
				keywords: body.episode?.keywords ?? 'mock,podcast',
				season: body.episode?.season ?? 1,
				number: body.episode?.number ?? nextNumber,
				media_url: body.episode?.audio_url ?? 'https://media.transistor.fm/mock/mock.mp3',
			},
		})
		episodes.set(episode.id, episode)
		return json({ data: episode })
	}

	const publishMatch = /^\/v1\/episodes\/(?<episodeId>[^/]+)\/publish$/.exec(
		url.pathname,
	)
	if (
		(request.method === 'PATCH' || request.method === 'POST') &&
		publishMatch?.groups?.episodeId
	) {
		requiredHeader(request.headers, 'x-api-key')
		const body = (await request.json()) as {
			episode?: { status?: string }
		}
		if (body.episode?.status && body.episode.status !== 'published') {
			return json(
				{
					errors: [
						{
							title: `req.body.episode.status must be published. Was "${body.episode.status}"`,
						},
					],
				},
				{ status: 400 },
			)
		}
		const episode = episodes.get(publishMatch.groups.episodeId)
		if (!episode) {
			return json({ errors: [{ title: 'Not found' }] }, { status: 404 })
		}
		episode.attributes.status = 'published'
		episode.attributes.published_at = new Date().toISOString()
		return json({ data: episode })
	}

	const episodeMatch = /^\/v1\/episodes\/(?<episodeId>[^/]+)$/.exec(url.pathname)
	if (request.method === 'PATCH' && episodeMatch?.groups?.episodeId) {
		requiredHeader(request.headers, 'x-api-key')
		const body = (await request.json()) as {
			episode?: Partial<TransistorEpisode['attributes']>
		}
		const episode = episodes.get(episodeMatch.groups.episodeId)
		if (!episode) {
			return json({ errors: [{ title: 'Not found' }] }, { status: 404 })
		}
		if (body.episode) {
			Object.assign(episode.attributes, body.episode)
		}
		return json({ data: episode })
	}

	if (request.method === 'GET' && episodeMatch?.groups?.episodeId) {
		requiredHeader(request.headers, 'x-api-key')
		const episode = episodes.get(episodeMatch.groups.episodeId)
		if (!episode) {
			return json({ errors: [{ title: 'Not found' }] }, { status: 404 })
		}
		return json({ data: episode })
	}

	if (request.method === 'GET' && url.pathname === '/v1/episodes') {
		requiredHeader(request.headers, 'x-api-key')
		return json({ data: [...episodes.values()] })
	}

	return null
}
