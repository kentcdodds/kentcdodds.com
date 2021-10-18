import type {DefaultRequestBody, MockedRequest, RestHandler} from 'msw'
import {rest} from 'msw'
import {requiredHeader, requiredParam} from './utils'

const discordHandlers: Array<RestHandler<MockedRequest<DefaultRequestBody>>> = [
  rest.post('https://discord.com/api/oauth2/token', async (req, res, ctx) => {
    if (typeof req.body !== 'string') {
      throw new Error('request body must be a string of URLSearchParams')
    }
    if (
      req.headers.get('Content-Type') !== 'application/x-www-form-urlencoded'
    ) {
      throw new Error(
        'Content-Type header must be "application/x-www-form-urlencoded"',
      )
    }
    const params = new URLSearchParams(req.body)
    requiredParam(params, 'client_id')
    requiredParam(params, 'client_secret')
    requiredParam(params, 'grant_type')
    requiredParam(params, 'redirect_uri')
    requiredParam(params, 'scope')
    return res(
      ctx.json({
        token_type: 'test_token_type',
        access_token: 'test_access_token',
      }),
    )
  }),

  rest.get('https://discord.com/api/users/:userId', async (req, res, ctx) => {
    requiredHeader(req.headers, 'Authorization')
    return res(
      ctx.json({
        id: 'test_discord_id',
        username: 'test_discord_username',
        discriminator: '0000',
      }),
    )
  }),

  rest.get(
    'https://discord.com/api/guilds/:guildId/members/:userId',
    async (req, res, ctx) => {
      requiredHeader(req.headers, 'Authorization')
      const user = {
        id: req.params.userId,
        username: `${req.params.userId}username`,
        discriminator: '0000',
      }
      return res(
        ctx.json({
          user,
          roles: [],
          ...user,
        }),
      )
    },
  ),

  rest.put(
    'https://discord.com/api/guilds/:guildId/members/:userId',
    async (req, res, ctx) => {
      requiredHeader(req.headers, 'Authorization')
      if (typeof req.body !== 'object') {
        console.error('Request body:', req.body)
        throw new Error('Request body must be a JSON object')
      }
      if (!req.body.access_token) {
        const bodyString = JSON.stringify(req.body, null, 2)
        throw new Error(
          `access_token required in the body, but not found in ${bodyString}`,
        )
      }
      return res(
        ctx.json({
          // We don't use this response for now so we'll leave this empty
        }),
      )
    },
  ),

  rest.patch(
    'https://discord.com/api/guilds/:guildId/members/:userId',
    async (req, res, ctx) => {
      requiredHeader(req.headers, 'Authorization')
      if (typeof req.body !== 'object') {
        throw new Error('patch request to member must have a JSON body')
      }
      if (!Array.isArray(req.body.roles) || req.body.roles.length < 1) {
        throw new Error(
          'patch request to member must include a roles array with the new role',
        )
      }
      return res(
        ctx.json({
          // We don't use this response for now so we'll leave this empty
        }),
      )
    },
  ),

  rest.get(
    'https://discord.com/api/guilds/:guildId/members/:userId',
    async (req, res, ctx) => {
      requiredHeader(req.headers, 'Authorization')
      return res(
        ctx.json({
          user: {id: 'test_discord_id', username: 'test_username'},
          roles: [],
        }),
      )
    },
  ),

  rest.post(
    'https://discord.com/api/channels/:channelId/messages',
    async (req, res, ctx) => {
      requiredHeader(req.headers, 'Authorization')
      if (typeof req.body !== 'object') {
        console.error('Request body:', req.body)
        throw new Error('Request body must be a JSON object')
      }

      console.log(
        `🤖 Sending bot message to ${req.params.channelId}:\n`,
        req.body.content,
      )

      return res(
        ctx.json({
          /* we ignore the response */
        }),
      )
    },
  ),
]

export {discordHandlers}
