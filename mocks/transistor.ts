import type {DefaultRequestBody, MockedRequest, RestHandler} from 'msw'
import {rest} from 'msw'
import {requiredParam, requiredProperty} from './utils'

const transistorHandlers: Array<
  RestHandler<MockedRequest<DefaultRequestBody>>
> = [
  rest.get(
    'https://api.transistor.fm/v1/episodes/authorize_upload',
    async (req, res, ctx) => {
      requiredParam(req.url.searchParams, 'filename')
      return res(
        ctx.json({
          data: {
            id: '37009fba-7aae-4514-8ebb-d3c8be45734f',
            type: 'audio_upload',
            attributes: {
              upload_url:
                'https://transistorupload.s3.amazonaws.com/uploads/api/37009fba-7aae-4514-8ebb-d3c8be45734f/Episode1.mp3?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAJNPH...%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20210517T191158Z&X-Amz-Expires=600&X-Amz-SignedHeaders=host&X-Amz-Signature=f7b749...',
              content_type: 'audio/mpeg',
              expires_in: 600,
              audio_url:
                'https://transistorupload.s3.amazonaws.com/uploads/api/37009fba-7aae-4514-8ebb-d3c8be45734f/Episode1.mp3',
            },
          },
        }),
      )
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
          // TODO: we don't use the response so no need to put something real here.
        }),
      )
    },
  ),

  rest.post('https://api.transistor.fm/v1/episodes', async (req, res, ctx) => {
    if (typeof req.body !== 'object') {
      throw new Error('req.body must be an object')
    }
    requiredProperty(req.body, 'episode')
    requiredProperty(req.body.episode, 'show_id')
    requiredProperty(req.body.episode, 'season')
    requiredProperty(req.body.episode, 'audio_url')
    requiredProperty(req.body.episode, 'title')
    requiredProperty(req.body.episode, 'summary')
    requiredProperty(req.body.episode, 'description')
    return res(
      ctx.json({
        data: {
          id: '1234923',
        },
      }),
    )
  }),

  rest.patch(
    'https://api.transistor.fm/v1/episodes/:episodeId/publish',
    async (req, res, ctx) => {
      if (typeof req.body !== 'object') {
        throw new Error('req.body must be an object')
      }
      requiredProperty(req.body, 'episode')
      if (req.body.episode.status !== 'published') {
        throw new Error(
          `req.body.episode.status must be published. Was "${req.body.episode.status}"`,
        )
      }
      return res(
        ctx.json({
          data: {
            id: req.params.episodeId,
          },
        }),
      )
    },
  ),

  rest.get(
    'https://api.transistor.fm/v1/episodes/:episodeId',
    async (req, res, ctx) => {
      requiredProperty(req.params, 'episodeId')
      return res(
        ctx.json({
          data: {
            id: req.params.episodeId,
            type: 'episode',
            attributes: {
              title: 'Test Title',
              media_url: 'https://media.transistor.fm/eac55340/b307611b.mp3',
              share_url: 'https://share.transistor.fm/s/eac55340',
            },
          },
        }),
      )
    },
  ),
]

export {transistorHandlers}
