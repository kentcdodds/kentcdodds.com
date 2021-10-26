import {rest} from 'msw'
import {setupServer} from 'msw/node'
import {githubHandlers} from './github'
import {tiToHandlers} from './tito'
import {oembedHandlers} from './oembed'
import {twitterHandlers} from './twitter'
import {transistorHandlers} from './transistor'
import {discordHandlers} from './discord'
import {convertKitHandlers} from './convert-kit'
import {simplecastHandlers} from './simplecast'
import {isConnectedToTheInternet, forward, isE2E, updateFixture} from './utils'

// put one-off handlers that don't really need an entire file to themselves here
const miscHandlers = [
  rest.get(
    'https://res.cloudinary.com/kentcdodds-com/image/upload/w_100,q_auto,f_webp,e_blur:1000/unsplash/:photoId',
    async (req, res, ctx) => {
      if (await isConnectedToTheInternet()) return res(forward())

      const base64 =
        'UklGRhoBAABXRUJQVlA4IA4BAABwCgCdASpkAEMAPqVInUq5sy+hqvqpuzAUiWcG+BsvrZQel/iYPLGE154ZiYwzeF8UJRAKZ0oAzLdTpjlp8qBuGwW1ntMTe6iQZbxzyP4gBeg7X7SH7NwyBcUDAAD+8MrTwbAD8OLmsoaL1QDPwEE+GrfqLQPn6xkgFHCB8lyjV3K2RvcQ7pSvgA87LOVuDtMrtkm+tTV0x1RcIe4Uvb6J+yygkV48DSejuyrMWrYgoZyjkf/0/L9+bAZgCam6+oHqjBSWTq5jF7wzBxYwfoGY7OdYZOdeGb4euuuLaCzDHz/QRbDCaIsJWJW3Jo4bkbz44AI/8UfFTGX4tMTRcKLXTDIviU+/u7UnlVaDQAA='
      const buffer = Buffer.from(base64)
      return res(ctx.body(buffer))
    },
  ),
  rest.get(/res.cloudinary.com\/kentcdodds-com\//, (req, res) => {
    return res(forward())
  }),
  rest.post(
    'https://api.mailgun.net/v3/:domain/messages',
    async (req, res, ctx) => {
      const body = Object.fromEntries(new URLSearchParams(req.body?.toString()))
      console.info('🔶 mocked email contents:', body)

      if (isE2E && body.text) {
        await updateFixture({email: body})
      }
      const randomId = '20210321210543.1.E01B8B612C44B41B'
      const id = `<${randomId}>@${req.params.domain}`
      return res(ctx.json({id, message: 'Queued. Thank you.'}))
    },
  ),
  rest.head(
    'https://www.gravatar.com/avatar/:md5Hash',
    async (req, res, ctx) => {
      if (await isConnectedToTheInternet()) return res(forward())

      return res(ctx.status(404))
    },
  ),
  rest.get('https://verifier.meetchopra.com/verify/:email', (req, res, ctx) => {
    return res(ctx.json({status: true}))
  }),
]

const server = setupServer(
  ...githubHandlers,
  ...oembedHandlers,
  ...twitterHandlers,
  ...tiToHandlers,
  ...transistorHandlers,
  ...discordHandlers,
  ...convertKitHandlers,
  ...simplecastHandlers,
  ...miscHandlers,
)

server.listen({onUnhandledRequest: 'warn'})
console.info('🔶 Mock server installed')
if (isE2E) console.info('running in E2E mode')

process.once('SIGINT', () => server.close())
process.once('SIGTERM', () => server.close())
