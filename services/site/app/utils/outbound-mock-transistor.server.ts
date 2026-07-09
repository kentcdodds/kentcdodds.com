import { randomUUID } from 'node:crypto'
import { type TransistorEpisodeData } from '#app/types.ts'

function json(data: unknown, init?: ResponseInit) {
	return Response.json(data, init)
}

const episodes = new Map<string, TransistorEpisodeData>()
const uploads = new Map<string, Uint8Array>()

const FIXED_MEDIA_URL = 'https://media.transistor.fm/1493e91f/10e5e65b.mp3'
const FIXED_SHARE_URL = 'https://share.transistor.fm/s/1493e91f'
const FIXED_EMBED_HTML =
	'<iframe src="https://share.transistor.fm/e/1493e91f" width="100%" height="180" frameborder="0" scrolling="no" seamless style="width:100%; height:180px;"></iframe>'
const FIXED_EMBED_HTML_DARK =
	'<iframe src="https://share.transistor.fm/e/1493e91f/dark" width="100%" height="180" frameborder="0" scrolling="no" seamless style="width:100%; height:180px;"></iframe>'
const FIXED_IMAGE_URL = 'https://img.transistor.fm/mock-episode-artwork.jpg'

function requiredHeader(headers: Headers, name: string) {
	const value = headers.get(name)
	if (!value) throw new Error(`${name} header is required`)
	return value
}

function missingPropertyError(property: string) {
	return json(
		{ errors: [{ title: `Property "${property}" required` }] },
		{ status: 400 },
	)
}

function makeEpisode(
	overrides: {
		id?: string
		attributes?: Partial<TransistorEpisodeData['attributes']>
	} = {},
): TransistorEpisodeData {
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
			status: 'draft',
			image_url: FIXED_IMAGE_URL,
			media_url: FIXED_MEDIA_URL,
			share_url: FIXED_SHARE_URL,
			embed_html: FIXED_EMBED_HTML,
			embed_html_dark: FIXED_EMBED_HTML_DARK,
			published_at: '',
			audio_processing: false,
			updated_at: new Date().toISOString(),
			...overrides.attributes,
		},
	}
}

function deterministicEpisode(index: number): TransistorEpisodeData {
	const season = Math.ceil((index + 1) / 50)
	const number = (index % 50) + 1
	// Deterministic timestamps spaced 3 hours apart from a fixed epoch.
	const publishedAtMs =
		Date.UTC(2024, 0, 1, 12, 0, 0) + index * 1000 * 60 * 60 * 3
	const updatedAtMs = publishedAtMs + 1000 * 60 * 60
	const title = `Mock Call Kent Episode ${season}-${String(number).padStart(2, '0')}`
	return makeEpisode({
		id: `mock-transistor-episode-${String(index + 1).padStart(3, '0')}`,
		attributes: {
			season,
			number,
			title,
			summary: `Mock summary for ${title}`,
			description: `Mock description for ${title}. This is deterministic fixture content for local mocks and tests.`,
			keywords: `mock,podcast,season-${season},episode-${number}`,
			duration: 180 + (index % 20) * 30,
			status: 'published',
			published_at: new Date(publishedAtMs).toISOString(),
			updated_at: new Date(updatedAtMs).toISOString(),
			audio_processing: false,
		},
	})
}

export function getTransistorMockEpisodes(): Array<TransistorEpisodeData> {
	return [...episodes.values()]
}

export function seedTransistorEpisodes(count: number) {
	for (let index = 0; index < count; index++) {
		const episode = deterministicEpisode(index)
		episodes.set(episode.id, episode)
	}
}

export function resetTransistorMockState() {
	episodes.clear()
	uploads.clear()
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
			return json(
				{ errors: [{ title: 'filename is required' }] },
				{ status: 400 },
			)
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
					audio_url: uploadUrl,
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
				show_id?: string
				title?: string
				summary?: string
				description?: string
				keywords?: string
				season?: number
				number?: number
				audio_url?: string
			}
		}
		if (!body || typeof body !== 'object' || !body.episode) {
			return missingPropertyError('episode')
		}
		const { episode: episodeInput } = body
		for (const property of [
			'show_id',
			'season',
			'audio_url',
			'title',
			'summary',
			'description',
		] as const) {
			if (
				episodeInput[property] === undefined ||
				episodeInput[property] === null ||
				episodeInput[property] === ''
			) {
				return missingPropertyError(property)
			}
		}
		const nextNumber =
			[...episodes.values()].reduce(
				(max, episode) => Math.max(max, episode.attributes.number ?? 0),
				0,
			) + 1
		const episode = makeEpisode({
			attributes: {
				title: episodeInput.title!,
				summary: episodeInput.summary!,
				description: episodeInput.description!,
				keywords: episodeInput.keywords ?? 'mock,podcast',
				season: episodeInput.season!,
				number: episodeInput.number ?? nextNumber,
				media_url: episodeInput.audio_url!,
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
		if (!body?.episode) {
			return missingPropertyError('episode')
		}
		if (body.episode.status !== 'published') {
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
		const now = new Date().toISOString()
		episode.attributes.status = 'published'
		episode.attributes.published_at = now
		episode.attributes.updated_at = now
		return json({ data: episode })
	}

	const episodeMatch = /^\/v1\/episodes\/(?<episodeId>[^/]+)$/.exec(
		url.pathname,
	)
	if (request.method === 'PATCH' && episodeMatch?.groups?.episodeId) {
		requiredHeader(request.headers, 'x-api-key')
		const body = (await request.json()) as {
			episode?: Partial<TransistorEpisodeData['attributes']>
		}
		if (!body?.episode) {
			return missingPropertyError('episode')
		}
		const episode = episodes.get(episodeMatch.groups.episodeId)
		if (!episode) {
			return json({ errors: [{ title: 'Not found' }] }, { status: 404 })
		}
		Object.assign(episode.attributes, body.episode)
		episode.attributes.updated_at = new Date().toISOString()
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
