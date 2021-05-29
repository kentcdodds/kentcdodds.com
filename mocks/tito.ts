import type {DefaultRequestBody, MockedRequest, RestHandler} from 'msw'
import {rest} from 'msw'

const tiToHandlers: Array<RestHandler<MockedRequest<DefaultRequestBody>>> = [
  rest.get(
    'https://api.tito.io/v3/kent-c-dodds/events',
    async (req, res, ctx) => {
      const slug = 'testing-this-isn-t-a-real-event'
      return res(
        ctx.json({
          events: [
            {
              live: true,
              title: "TESTING (this isn't a real event)",
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
    },
  ),

  rest.get(
    'https://api.tito.io/v3/kent-c-dodds/:eventSlug',
    async (req, res, ctx) => {
      return res(
        ctx.json({
          event: {
            location: 'Zoom',
            date_or_range: 'March 23rd, 2021',
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

  rest.get(
    'https://api.tito.io/v3/kent-c-dodds/:eventSlug/discount_codes',
    async (req, res, ctx) => {
      const code = 'early'
      return res(
        ctx.json({
          discount_codes: [
            {
              code,
              end_at: '2021-03-23T06:00:00.000-06:00',
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

  rest.get(
    'https://api.tito.io/v3/kent-c-dodds/:eventSlug/activities',
    async (req, res, ctx) => {
      return res(
        ctx.json({
          activities: [
            {
              start_at: '2021-03-24T09:30:00.000-06:00',
              end_at: '2021-03-24T13:30:00.000-06:00',
            },
          ],
          meta: {},
        }),
      )
    },
  ),
]

export {tiToHandlers}
