import {
  http,
  type DefaultRequestMultipartBody,
  type MockedRequest,
  type HttpHandler,
} from 'msw'

const tiToHandlers: Array<
  HttpHandler<MockedRequest<DefaultRequestMultipartBody>>
> = [
  http.get('https://api.tito.io/v3/hello', async (req, res, ctx) => {
    return res(
      ctx.json({
        accounts: ['kent-c-dodds', 'epic-web'],
      }),
    )
  }),
  http.get('https://api.tito.io/v3/:account/events', async (req, res, ctx) => {
    const slug = 'testing-this-isn-t-a-real-event'
    return res(
      ctx.json({
        events: [
          {
            live: true,
            title: `TESTING (this isn't a real ${
              req.params.account ?? ''
            } event)`,
            description: 'This is a short description',
            banner: {url: null, thumb: {url: null}},
            slug,
            metadata: {workshopSlug: 'react-hooks'},
            url: `https://ti.to/kent-c-dodds/${slug}`,
          },
        ],
        meta: {},
      }),
    )
  }),

  http.get(
    'https://api.tito.io/v3/:account/:eventSlug',
    async (req, res, ctx) => {
      return res(
        ctx.json({
          event: {
            location: 'Zoom',
            date_or_range: 'March 23rd, 2024',
            releases: [
              {
                quantity: 40,
                tickets_count: 2,
              },
            ],
          },
        }),
      )
    },
  ),

  http.get(
    'https://api.tito.io/v3/:account/:eventSlug/discount_codes',
    async (req, res, ctx) => {
      const code = 'early'
      return res(
        ctx.json({
          discount_codes: [
            {
              code,
              end_at: '2024-03-23T06:00:00.000-06:00',
              quantity: 10,
              quantity_used: 0,
              share_url: `https://ti.to/kent-c-dodds/${req.params.eventSlug}/discount/${code}`,
              state: 'current',
            },
          ],
          meta: {},
        }),
      )
    },
  ),

  http.get(
    'https://api.tito.io/v3/:account/:eventSlug/activities',
    async (req, res, ctx) => {
      return res(
        ctx.json({
          activities: [
            {
              start_at: '2024-03-24T09:30:00.000-06:00',
              end_at: '2024-03-24T13:30:00.000-06:00',
            },
          ],
          meta: {},
        }),
      )
    },
  ),
]

export {tiToHandlers}
