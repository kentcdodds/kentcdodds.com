import { http, passthrough, HttpResponse, type HttpHandler } from 'msw'
import { cloudflareR2Handlers } from './cloudflare-r2.ts'
import { cloudflareHandlers } from './cloudflare.ts'
import { discordHandlers } from './discord.ts'
import { githubHandlers } from './github.ts'
import { kitHandlers } from './kit.ts'
import { mermaidToSvgHandlers } from './mermaid-to-svg.ts'
import { oauthHandlers } from './oauth.ts'
import { oembedHandlers } from './oembed.ts'
import { searchWorkerHandlers } from './search-worker.ts'
import { simplecastHandlers } from './simplecast.ts'
import { transistorHandlers } from './transistor.ts'
import { twitterHandlers } from './twitter.ts'
import { youtubeHandlers } from './youtube.ts'
import {
	isConnectedToTheInternet,
	readFixture,
	updateFixture,
} from './utils.ts'

// One-off handlers that don't warrant their own files.
const miscHandlers: Array<HttpHandler> = [
	http.get(
		'https://kentcdodds.com/media/:transforms/unsplash/:photoId',
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
	http.get(/\/media\/[^/]+\/unsplash\//, () => {
		if (process.env.NODE_ENV === 'test') {
			return new HttpResponse(new Uint8Array(), {
				status: 200,
				headers: { 'Content-Type': 'image/webp' },
			})
		}
		return passthrough()
	}),
	http.get(/\/media\//, () => {
		if (process.env.NODE_ENV === 'test') {
			return new HttpResponse(new Uint8Array(), {
				status: 200,
				headers: { 'Content-Type': 'image/webp' },
			})
		}
		return passthrough()
	}),
	http.post(
		'https://api.cloudflare.com/client/v4/accounts/:accountId/email/sending/send',
		async ({ request }) => {
			const body = (await request.json()) as {
				to?: string | Array<string>
				from?: string
				subject?: string
				text?: string
				html?: string | null
			}
			const toRaw = body.to
			const to =
				typeof toRaw === 'string'
					? toRaw
					: Array.isArray(toRaw)
						? toRaw[0]
						: undefined
			console.info('🔶 mocked email contents:', body)

			if (to && body.text) {
				const fixture = await readFixture()
				const captured = {
					to,
					...(body.from ? { from: body.from } : {}),
					...(body.subject ? { subject: body.subject } : {}),
					...(body.text ? { text: body.text } : {}),
					...(typeof body.html === 'string' ? { html: body.html } : {}),
				}
				await updateFixture({
					email: {
						...fixture.email,
						[to]: captured,
					},
				})
			}
			const delivered =
				typeof body.to === 'string'
					? [body.to]
					: Array.isArray(body.to)
						? body.to
						: []
			return HttpResponse.json({
				success: true,
				errors: [],
				messages: [],
				result: {
					delivered,
					permanent_bounces: [],
					queued: [],
				},
			})
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
	...searchWorkerHandlers,
	...simplecastHandlers,
	...cloudflareHandlers,
	...cloudflareR2Handlers,
	...mermaidToSvgHandlers,
	...youtubeHandlers,
	...miscHandlers,
]
