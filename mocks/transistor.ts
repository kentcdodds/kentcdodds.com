import type {DefaultRequestBody, MockedRequest, RestHandler} from 'msw'
import {rest} from 'msw'
import type {
  TransistorEpisodesJson,
  TransistorPublishedJson,
  TransistorAuthorizedJson,
  TransistorCreatedJson,
  TransistorEpisodeData,
} from '~/types'
import * as faker from 'faker'
import {requiredParam, requiredHeader, requiredProperty} from './utils'

function makeEpisode(
  overrides: {
    id?: string
    attributes?: Partial<TransistorEpisodeData['attributes']>
  } = {},
): TransistorEpisodeData {
  const publishedAt = faker.datatype.datetime({
    max: Date.now() - 1000 * 60 * 60 * 24,
    min: Date.now() - 1000 * 60 * 60 * 24 * 7 * 6,
  })
  return {
    id: faker.datatype.uuid(),
    type: 'episode',
    ...overrides,
    attributes: {
      number: 0,
      season: 1,
      title: faker.lorem.words(),
      duration: faker.datatype.number({min: 180, max: 900}),
      summary: faker.lorem.sentence(),
      description: faker.lorem.paragraphs(2),
      keywords: faker.lorem.words().split(' ').join(','),
      status: 'published',
      image_url: faker.internet.avatar(),
      media_url: 'https://media.transistor.fm/1493e91f/10e5e65b.mp3',
      share_url: 'https://share.transistor.fm/s/1493e91f',
      embed_html:
        '<iframe src="https://share.transistor.fm/e/1493e91f" width="100%" height="180" frameborder="0" scrolling="no" seamless style="width:100%; height:180px;"></iframe>',
      embed_html_dark:
        '<iframe src="https://share.transistor.fm/e/1493e91f/dark" width="100%" height="180" frameborder="0" scrolling="no" seamless style="width:100%; height:180px;"></iframe>',
      published_at: publishedAt.toISOString(),
      audio_processing: false,
      updated_at: faker.datatype
        .datetime({
          max: Date.now() - 1000 * 60 * 60 * 23,
          min: publishedAt.getTime(),
        })
        .toISOString(),
      ...overrides.attributes,
    },
  }
}

const episodes: Array<TransistorEpisodeData> = Array.from(
  {length: 35},
  (item, index) => makeEpisode({attributes: {number: index + 1}}),
)

const transistorHandlers: Array<
  RestHandler<MockedRequest<DefaultRequestBody>>
> = [
  rest.get(
    'https://api.transistor.fm/v1/episodes/authorize_upload',
    async (req, res, ctx) => {
      requiredParam(req.url.searchParams, 'filename')
      requiredHeader(req.headers, 'x-api-key')
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
      return res(ctx.json(data))
    },
  ),

  rest.put(
    'https://transistorupload.s3.amazonaws.com/uploads/api/:bucketId/:fileId',
    async (req, res, ctx) => {
      if (!req.body) {
        throw new Error('req.body is required')
      }

      return res(
        ctx.json({
          // we don't use the response so no need to put something real here.
        }),
      )
    },
  ),

  rest.post('https://api.transistor.fm/v1/episodes', async (req, res, ctx) => {
    if (typeof req.body !== 'object') {
      throw new Error('req.body must be an object')
    }
    requiredHeader(req.headers, 'x-api-key')
    requiredProperty(req.body, 'episode')
    requiredProperty(req.body.episode, 'show_id')
    requiredProperty(req.body.episode, 'season')
    requiredProperty(req.body.episode, 'audio_url')
    requiredProperty(req.body.episode, 'title')
    requiredProperty(req.body.episode, 'summary')
    requiredProperty(req.body.episode, 'description')
    const episode: TransistorEpisodeData = makeEpisode({
      attributes: {
        number: Math.max(...episodes.map(e => e.attributes.number ?? 0)) + 1,
        ...req.body.episode,
      },
    })
    const data: TransistorCreatedJson = {data: episode}
    episodes.push(episode)
    return res(ctx.json(data))
  }),

  rest.patch(
    'https://api.transistor.fm/v1/episodes/:episodeId/publish',
    async (req, res, ctx) => {
      if (typeof req.body !== 'object') {
        throw new Error('req.body must be an object')
      }
      requiredProperty(req.body, 'episode')
      requiredHeader(req.headers, 'x-api-key')
      if (req.body.episode.status !== 'published') {
        throw new Error(
          `req.body.episode.status must be published. Was "${req.body.episode.status}"`,
        )
      }
      const episode = episodes.find(e => e.id === req.params.episodeId)
      if (!episode) {
        throw new Error(
          `No episode exists with the id of ${req.params.episodeId}`,
        )
      }
      episode.attributes.status = 'published'
      const data: TransistorPublishedJson = {data: episode}
      return res(ctx.json(data))
    },
  ),

  rest.patch(
    'https://api.transistor.fm/v1/episodes/:episodeId',
    async (req, res, ctx) => {
      if (typeof req.body !== 'object') {
        throw new Error('req.body must be an object')
      }
      requiredProperty(req.body, 'episode')
      requiredHeader(req.headers, 'x-api-key')
      const episode = episodes.find(e => e.id === req.params.episodeId)
      if (!episode) {
        throw new Error(
          `No episode exists with the id of ${req.params.episodeId}`,
        )
      }
      Object.assign(episode, req.body.episode)
      const data: TransistorPublishedJson = {data: episode}
      return res(ctx.json(data))
    },
  ),

  rest.get('https://api.transistor.fm/v1/episodes', async (req, res, ctx) => {
    requiredHeader(req.headers, 'x-api-key')
    const data: TransistorEpisodesJson = {data: episodes}
    return res(ctx.json(data))
  }),
]

export {transistorHandlers}
