import { http, passthrough, HttpResponse, type HttpHandler } from 'msw'
import { cloudflareR2Handlers } from './cloudflare-r2.ts'
import { cloudflareHandlers } from './cloudflare.ts'
import { discordHandlers } from './discord.ts'
import { githubHandlers } from './github.ts'
import { kitHandlers } from './kit.ts'
import { mermaidToSvgHandlers } from './mermaid-to-svg.ts'
import { oauthHandlers } from './oauth.ts'
import { oembedHandlers } from './oembed.ts'
import { simplecastHandlers } from './simplecast.ts'
import { transistorHandlers } from './transistor.ts'
import { twitterHandlers } from './twitter.ts'
import {
	isConnectedToTheInternet,
	readFixture,
	updateFixture,
} from './utils.ts'

// One-off handlers that don't warrant their own files.
const miscHandlers: Array<HttpHandler> = [
	http.get(
		'https://media.kentcdodds.com/kentcdodds-com/image/upload/w_100,q_auto,f_webp,e_blur:1000/unsplash/:photoId',
		async () => {
			if (
				process.env.NODE_ENV !== 'test' &&
				(await isConnectedToTheInternet())
			) {
				return passthrough()
			}

			const base64 =
				'UklGRhoBAABXRUJQVlA4IA4BAABwCgCdASpkAEMAPqVInUq5sy+hqvqpuzAUiWcG+BsvrZQel/iYPLGE154ZiYwzeF8UJRAKZ0oAzLdTpjlp8qBuGwW1ntMTe6iQZbxzyP4gBeg7X7SH7NwyBcUDAAD+8MrTwbAD8OLmsoaL1QDPwEE+GrfqLQPn6xkgFHCB8lyjV3K2RvcQ7pSvgA87LOVuDtMrtkm+tTV0x1RcIe4Uvb6J+yygkV48DSejuyrMWrYgoZyjkf/0/L9+bAZgCam6+oHqjBSWTq5jF7wzBxYwfoGY7OdYZOdeGb4euuuLaCzDHz/QRbDCaIsJWJW3Jo4bkbz44AI/8UfFTGX4tMTRcKLXTDIviU+/u7UnlVaDQAA='
			const buffer = Buffer.from(base64)
			return HttpResponse.json(buffer)
		},
	),
	http.get(/media\.kentcdodds\.com\/kentcdodds-com\//, () => {
		if (process.env.NODE_ENV === 'test') {
			return new HttpResponse(new Uint8Array(), {
				status: 200,
				headers: { 'Content-Type': 'image/webp' },
			})
		}
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
		if (process.env.NODE_ENV !== 'test' && (await isConnectedToTheInternet())) {
			return passthrough()
		}

		return HttpResponse.json(null, { status: 404 })
	}),
	http.get(/http:\/\/(localhost|127\.0\.0\.1):\d+\/.*/, async () =>
		passthrough(),
	),
	http.head(/http:\/\/(localhost|127\.0\.0\.1):\d+\/.*/, async () =>
		passthrough(),
	),
	http.post(/http:\/\/(localhost|127\.0\.0\.1):\d+\/.*/, async () =>
		passthrough(),
	),
	http.get('https://verifyright.co/verify/:email', () =>
		HttpResponse.json({ status: true }),
	),
	http.get('https://api.pwnedpasswords.com/range/:prefix', () => {
		// Empty response means "not found" for all suffixes.
		return new HttpResponse('', { status: 200 })
	}),
]

export const mswHandlers: Array<HttpHandler> = [
	...githubHandlers,
	...oauthHandlers,
	...oembedHandlers,
	...twitterHandlers,
	...transistorHandlers,
	...discordHandlers,
	...kitHandlers,
	...simplecastHandlers,
	...cloudflareHandlers,
	...cloudflareR2Handlers,
	...mermaidToSvgHandlers,
	...miscHandlers,
]
