import type {DefaultRequestBody, MockedRequest, RestHandler} from 'msw'
import {rest} from 'msw'

const transistorHandlers: Array<
  RestHandler<MockedRequest<DefaultRequestBody>>
> = [
  rest.get(
    'https://api.transistor.fm/v1/episodes/authorize_upload',
    async (req, res, ctx) => {
      console.log(req.url, req.body)
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
      console.log(req.url, req.body)
      return res(
        ctx.json({
          // TODO: we don't use the response so no need to put something real here.
        }),
      )
    },
  ),

  rest.post('https://api.transistor.fm/v1/episodes', async (req, res, ctx) => {
    console.log(req.url, req.body)
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
      console.log(req.url, req.body)
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
      console.log(req.url, req.body)
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
