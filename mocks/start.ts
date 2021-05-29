import {rest} from 'msw'
import {setupServer} from 'msw/node'
import {githubHandlers} from './github'
import {tiToHandlers} from './tito'
import {oembedHandlers} from './oembed'
import {hitNetwork} from './utils'

// put one-off handlers that don't really need an entire file to themselves here
const miscHandlers = [
  rest.post(
    'https://api.mailgun.net/v3/:domain/messages',
    async (req, res, ctx) => {
      if (hitNetwork) return hitNetwork(req)
      const body = new URLSearchParams(req.body?.toString())
      console.log('SENDING MOCK EMAIL', body.get('text'))

      const randomId = '20210321210543.1.E01B8B612C44B41B'
      const id = `<${randomId}>@${req.params.domain}`
      return res(ctx.json({id, message: 'Queued. Thank you.'}))
    },
  ),
]

const server = setupServer(
  ...githubHandlers,
  ...oembedHandlers,
  ...tiToHandlers,
  ...miscHandlers,
)

server.listen({onUnhandledRequest: 'error'})
console.log('🔶 Mock server installed')

process.once('SIGINT', () => server.close())
process.once('SIGTERM', () => server.close())
