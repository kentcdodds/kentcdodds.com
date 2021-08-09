import type {DefaultRequestBody, MockedRequest, RestHandler} from 'msw'
import {rest} from 'msw'

type RequestBody = {
  first_name: string
  email: string
  fields: Array<string>
}

const convertKitHandlers: Array<
  RestHandler<MockedRequest<DefaultRequestBody>>
> = [
  rest.get('https://api.convertkit.com/v3/subscribers', (req, res, ctx) => {
    return res(
      ctx.json({
        total_subscribers: 0,
        page: 1,
        total_pages: 1,
        subscribers: [],
      }),
    )
  }),
  rest.get(
    'https://api.convertkit.com/v3/subscribers/:subscriberId/tags',
    (req, res, ctx) => {
      return res(
        ctx.json({
          tags: [
            {
              id: 1,
              name: 'Subscribed: general newsletter',
              created_at: '2021-06-09T17:54:22Z',
            },
          ],
        }),
      )
    },
  ),
  rest.post(
    'https://api.convertkit.com/v3/forms/:formId/subscribe',
    (req, res, ctx) => {
      const {formId} = req.params
      const {first_name, email, fields} = req.body as RequestBody
      return res(
        ctx.json({
          subscription: {
            id: 1234567890,
            state: 'active',
            created_at: new Date().toJSON(),
            source: 'API::V3::SubscriptionsController (external)',
            referrer: null,
            subscribable_id: formId,
            subscribable_type: 'form',
            subscriber: {
              id: 987654321,
              first_name,
              email_address: email,
              state: 'inactive',
              created_at: new Date().toJSON(),
              fields,
            },
          },
        }),
      )
    },
  ),
  rest.post(
    'https://api.convertkit.com/v3/tags/:tagId/subscribe',
    (req, res, ctx) => {
      const {tagId} = req.params
      const {first_name, email, fields} = req.body as RequestBody
      return res(
        ctx.json({
          subscription: {
            id: 1234567890,
            state: 'active',
            created_at: new Date().toJSON(),
            source: 'API::V3::SubscriptionsController (external)',
            referrer: null,
            subscribable_id: tagId,
            subscribable_type: 'tag',
            subscriber: {
              id: 987654321,
              first_name,
              email_address: email,
              state: 'inactive',
              created_at: new Date().toJSON(),
              fields,
            },
          },
        }),
      )
    },
  ),
]

export {convertKitHandlers}
