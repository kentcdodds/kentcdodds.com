import { faker } from '@faker-js/faker'
import {
	http,
	type DefaultRequestMultipartBody,
	type HttpHandler,
	HttpResponse,
	type DefaultBodyType,
} from 'msw'
import { requiredHeader, requiredParam, requiredProperty } from './utils.ts'
import {
	type TransistorAuthorizedJson,
	type TransistorCreatedJson,
	type TransistorEpisodeData,
	type TransistorEpisodesJson,
	type TransistorPublishedJson,
} from '~/types.ts'

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
	{ length: 99 },
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
			const data: TransistorAuthorizedJson = {
				data: {
					attributes: {
						upload_url:
							'https://transistorupload.s3.amazonaws.com/uploads/api/37009fba-7aae-4514-8ebb-d3c8be45734f/Episode1.mp3?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAJNPH...%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20210517T191158Z&X-Amz-Expires=600&X-Amz-SignedHeaders=host&X-Amz-Signature=f7b749...',
						content_type: 'audio/mpeg',
						audio_url:
							'https://transistorupload.s3.amazonaws.com/uploads/api/37009fba-7aae-4514-8ebb-d3c8be45734f/Episode1.mp3',
					},
				},
			}
			return HttpResponse.json(data)
		},
	),

	http.put<any, DefaultRequestMultipartBody>(
		'https://transistorupload.s3.amazonaws.com/uploads/api/:bucketId/:fileId',
		async ({ request }) => {
			const body = await request.blob()

			if (!body.size) {
				throw new Error('body is required')
			}

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
			const episode: TransistorEpisodeData = makeEpisode({
				attributes: {
					number:
						Math.max(...episodes.map((e) => e.attributes.number ?? 0)) + 1,
					...body.episode,
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

export { transistorHandlers }
