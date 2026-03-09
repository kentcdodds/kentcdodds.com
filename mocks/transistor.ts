import { faker } from '@faker-js/faker'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
	http,
	type DefaultRequestMultipartBody,
	type HttpHandler,
	HttpResponse,
	type DefaultBodyType,
} from 'msw'
import {
	type TransistorAuthorizedJson,
	type TransistorCreatedJson,
	type TransistorEpisodeData,
	type TransistorEpisodesJson,
	type TransistorPublishedJson,
} from '#app/types.ts'
import { requiredHeader, requiredParam, requiredProperty } from './utils.ts'

const transistorUploadsDirectory = path.join(
	process.cwd(),
	'.cache',
	'transistor-uploads',
)
const transistorUploadsRoutePrefix = '/mock/transistor/uploads'

function sanitizePathPart(value: string) {
	return value.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function buildUploadedAudioPath({
	bucketId,
	fileId,
}: {
	bucketId: string
	fileId: string
}) {
	return path.join(
		transistorUploadsDirectory,
		sanitizePathPart(bucketId),
		sanitizePathPart(fileId),
	)
}

async function writeUploadedAudio({
	bucketId,
	fileId,
	body,
}: {
	bucketId: string
	fileId: string
	body: Blob
}) {
	const filePath = buildUploadedAudioPath({ bucketId, fileId })
	await fs.mkdir(path.dirname(filePath), { recursive: true })
	await fs.writeFile(filePath, Buffer.from(await body.arrayBuffer()))
}

function makeEpisode(
	overrides: {
		id?: string
		attributes?: Partial<TransistorEpisodeData['attributes']>
	} = {},
): TransistorEpisodeData {
	const publishedAt = faker.date.between({
		from: Date.now() - 1000 * 60 * 60 * 24 * 7 * 6,
		to: Date.now() - 1000 * 60 * 60 * 24,
	})
	return {
		id: faker.string.uuid(),
		type: 'episode',
		...overrides,
		attributes: {
			number: 0,
			season: 1,
			title: faker.lorem.words(),
			duration: faker.number.float({ min: 180, max: 900 }),
			summary: faker.lorem.sentence(),
			description: faker.lorem.paragraphs(2),
			keywords: faker.lorem.words().split(' ').join(','),
			status: 'published',
			image_url: faker.image.avatar(),
			media_url: 'https://media.transistor.fm/1493e91f/10e5e65b.mp3',
			share_url: 'https://share.transistor.fm/s/1493e91f',
			embed_html:
				'<iframe src="https://share.transistor.fm/e/1493e91f" width="100%" height="180" frameborder="0" scrolling="no" seamless style="width:100%; height:180px;"></iframe>',
			embed_html_dark:
				'<iframe src="https://share.transistor.fm/e/1493e91f/dark" width="100%" height="180" frameborder="0" scrolling="no" seamless style="width:100%; height:180px;"></iframe>',
			published_at: publishedAt.toISOString(),
			audio_processing: false,
			updated_at: faker.date
				.between({
					from: publishedAt.getTime(),
					to: Date.now() - 1000 * 60 * 60 * 23,
				})
				.toISOString(),
			...overrides.attributes,
		},
	}
}

const episodes: Array<TransistorEpisodeData> = Array.from(
	{ length: 300 },
	(item, index) =>
		makeEpisode({
			attributes: {
				season: Math.ceil((index + 1) / 50),
				number: (index % 50) + 1,
			},
		}),
)

const transistorHandlers: Array<HttpHandler> = [
	http.get<any, DefaultRequestMultipartBody>(
		'https://api.transistor.fm/v1/episodes/authorize_upload',
		async ({ request }) => {
			const url = new URL(request.url)

			requiredParam(url.searchParams, 'filename')
			requiredHeader(request.headers, 'x-api-key')
			const filename = url.searchParams.get('filename')
			if (!filename) {
				throw new Error('filename is required')
			}
			const bucketId = faker.string.uuid()
			const fileId = sanitizePathPart(filename)
			const uploadUrlBase = `https://transistorupload.s3.amazonaws.com/uploads/api/${bucketId}/${fileId}`
			const data: TransistorAuthorizedJson = {
				data: {
					attributes: {
						upload_url: `${uploadUrlBase}?mock-signature=1`,
						content_type: 'audio/mpeg',
						audio_url: `${transistorUploadsRoutePrefix}/${bucketId}/${fileId}`,
					},
				},
			}
			return HttpResponse.json(data)
		},
	),

	http.put<any, DefaultRequestMultipartBody>(
		'https://transistorupload.s3.amazonaws.com/uploads/api/:bucketId/:fileId',
		async ({ request, params }) => {
			const body = await request.blob()

			if (!body.size) {
				throw new Error('body is required')
			}
			const bucketId = params.bucketId
			const fileId = params.fileId
			if (!bucketId || !fileId) {
				throw new Error('bucketId and fileId are required')
			}
			await writeUploadedAudio({ bucketId, fileId, body })

			return HttpResponse.json({
				// we don't use the response so no need to put something real here.
			})
		},
	),

	http.post<any, DefaultBodyType>(
		'https://api.transistor.fm/v1/episodes',
		async ({ request }) => {
			const body = await request.json()

			if (!body || typeof body !== 'object') {
				throw new Error('req.body must be an object')
			}
			requiredHeader(request.headers, 'x-api-key')
			requiredProperty(body, 'episode')
			requiredProperty(body.episode, 'show_id')
			requiredProperty(body.episode, 'season')
			requiredProperty(body.episode, 'audio_url')
			requiredProperty(body.episode, 'title')
			requiredProperty(body.episode, 'summary')
			requiredProperty(body.episode, 'description')
			const mediaUrl =
				typeof body.episode.audio_url === 'string'
					? body.episode.audio_url
					: undefined
			const episode: TransistorEpisodeData = makeEpisode({
				attributes: {
					number:
						Math.max(...episodes.map((e) => e.attributes.number ?? 0)) + 1,
					...body.episode,
					...(mediaUrl ? { media_url: mediaUrl } : {}),
				},
			})
			const data: TransistorCreatedJson = { data: episode }
			episodes.push(episode)
			return HttpResponse.json(data)
		},
	),

	http.patch<any, DefaultBodyType>(
		'https://api.transistor.fm/v1/episodes/:episodeId/publish',
		async ({ request, params }) => {
			const body = await request.json()

			if (!body || typeof body !== 'object') {
				throw new Error('req.body must be an object')
			}
			requiredProperty(body, 'episode')
			requiredHeader(request.headers, 'x-api-key')
			if (body.episode.status !== 'published') {
				throw new Error(
					`req.body.episode.status must be published. Was "${body.episode.status}"`,
				)
			}
			const episode = episodes.find((e) => e.id === params.episodeId)
			if (!episode) {
				throw new Error(`No episode exists with the id of ${params.episodeId}`)
			}
			episode.attributes.status = 'published'
			const data: TransistorPublishedJson = { data: episode }
			return HttpResponse.json(data)
		},
	),

	http.patch<any, DefaultBodyType>(
		'https://api.transistor.fm/v1/episodes/:episodeId',
		async ({ request, params }) => {
			const body = await request.json()

			if (!body || typeof body !== 'object') {
				throw new Error('req.body must be an object')
			}
			requiredProperty(body, 'episode')
			requiredHeader(request.headers, 'x-api-key')
			const episode = episodes.find((e) => e.id === params.episodeId)
			if (!episode) {
				throw new Error(`No episode exists with the id of ${params.episodeId}`)
			}
			Object.assign(episode, body.episode)
			const data: TransistorPublishedJson = { data: episode }
			return HttpResponse.json(data)
		},
	),

	http.get<any, DefaultRequestMultipartBody>(
		'https://api.transistor.fm/v1/episodes',
		async ({ request }) => {
			requiredHeader(request.headers, 'x-api-key')
			const data: TransistorEpisodesJson = { data: episodes }
			return HttpResponse.json(data)
		},
	),
]

export { transistorHandlers, episodes as mockTransistorEpisodes }
