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
import {isE2E, updateFixture} from './utils'

// put one-off handlers that don't really need an entire file to themselves here
const miscHandlers = [
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

server.listen({onUnhandledRequest: 'error'})
console.info('🔶 Mock server installed')
if (isE2E) console.info('running in E2E mode')

process.once('SIGINT', () => server.close())
process.once('SIGTERM', () => server.close())
