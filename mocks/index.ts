import { http, passthrough, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { convertKitHandlers } from './convert-kit.ts'
import { discordHandlers } from './discord.ts'
import { githubHandlers } from './github.ts'
import { oembedHandlers } from './oembed.ts'
import { simplecastHandlers } from './simplecast.ts'
import { tiToHandlers } from './tito.ts'
import { transistorHandlers } from './transistor.ts'
import { twitterHandlers } from './twitter.ts'
import {
	isConnectedToTheInternet,
	readFixture,
	updateFixture,
} from './utils.ts'

const remix = process.env.REMIX_DEV_HTTP_ORIGIN as string

// put one-off handlers that don't really need an entire file to themselves here
const miscHandlers = [
	http.post(`${remix}/ping`, () => {
		return passthrough()
	}),
	http.get(
		'https://res.cloudinary.com/kentcdodds-com/image/upload/w_100,q_auto,f_webp,e_blur:1000/unsplash/:photoId',
		async () => {
			if (await isConnectedToTheInternet()) return passthrough()

			const base64 =
				'UklGRhoBAABXRUJQVlA4IA4BAABwCgCdASpkAEMAPqVInUq5sy+hqvqpuzAUiWcG+BsvrZQel/iYPLGE154ZiYwzeF8UJRAKZ0oAzLdTpjlp8qBuGwW1ntMTe6iQZbxzyP4gBeg7X7SH7NwyBcUDAAD+8MrTwbAD8OLmsoaL1QDPwEE+GrfqLQPn6xkgFHCB8lyjV3K2RvcQ7pSvgA87LOVuDtMrtkm+tTV0x1RcIe4Uvb6J+yygkV48DSejuyrMWrYgoZyjkf/0/L9+bAZgCam6+oHqjBSWTq5jF7wzBxYwfoGY7OdYZOdeGb4euuuLaCzDHz/QRbDCaIsJWJW3Jo4bkbz44AI/8UfFTGX4tMTRcKLXTDIviU+/u7UnlVaDQAA='
			const buffer = Buffer.from(base64)
			return HttpResponse.json(buffer)
		},
	),
	http.get(/res.cloudinary.com\/kentcdodds-com\//, () => {
		return passthrough()
	}),
	http.post(
		'https://api.mailgun.net/v3/:domain/messages',
		async ({ request, params }) => {
			const reqBody = await request.text()
			const body = Object.fromEntries(new URLSearchParams(reqBody))
			console.info('🔶 mocked email contents:', body)

			if (body.text && body.to) {
				const fixture = await readFixture()
				await updateFixture({
					email: {
						...fixture.email,
						[body.to]: body,
					},
				})
			}
			const randomId = '20210321210543.1.E01B8B612C44B41B'
			const id = `<${randomId}>@${params.domain}`
			return HttpResponse.json({ id, message: 'Queued. Thank you.' })
		},
	),
	http.head('https://www.gravatar.com/avatar/:md5Hash', async () => {
		if (await isConnectedToTheInternet()) return passthrough()

		return HttpResponse.json(null, { status: 404 })
	}),
	http.get(/http:\/\/localhost:\d+\/.*/, async () => passthrough()),
	http.post(/http:\/\/localhost:\d+\/.*/, async () => passthrough()),
	http.get('https://verifier.meetchopra.com/verify/:email', () => {
		return HttpResponse.json({ status: true })
	}),
	http.post('https://metrics.metronome.sh/telemetry/v5/metrics', () => {
		return HttpResponse.json({ success: true })
	}),
	http.post('https://metrics.metronome.sh/telemetry/v5/spans', () => {
		return HttpResponse.json({ success: true })
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

server.listen({
	onUnhandledRequest(request, print) {
		// Do not print warnings on unhandled requests to https://<:userId>.ingest.us.sentry.io/api/
		// Note: a request handler with passthrough is not suited with this type of url
		//       until there is a more permissible url catching system
		//       like requested at https://github.com/mswjs/msw/issues/1804
		if (request.url.includes('.sentry.io')) {
			return
		}

		// Print the regular MSW unhandled request warning otherwise.
		print.warning()
	},
})
console.info('🔶 Mock server installed')

process.once('SIGINT', () => server.close())
process.once('SIGTERM', () => server.close())
