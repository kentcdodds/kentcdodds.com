import { http, passthrough, HttpResponse, type HttpHandler } from 'msw'
import { maybeHandleEmailMockFetch } from '#app/utils/outbound-mock-email.server.ts'
import { maybeHandleMiscMockFetch } from '#app/utils/outbound-mock-misc.server.ts'
import { cloudflareR2Handlers } from './cloudflare-r2.ts'
import { cloudflareHandlers } from './cloudflare.ts'
import { discordHandlers } from './discord.ts'
import { githubHandlers } from './github.ts'
import { kitHandlers } from './kit.ts'
import { mermaidToSvgHandlers } from './mermaid-to-svg.ts'
import { bridgeOutboundMock } from './msw-bridge.ts'
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

const handleEmailMock = bridgeOutboundMock((request) =>
	maybeHandleEmailMockFetch(request, {
		onOutboundEmail: async (captured) => {
			// Preserve prior MSW capture gate: only persist when text is present.
			const to = captured.to
			if (!to || !captured.text) return
			const fixture = await readFixture()
			await updateFixture({
				email: {
					...fixture.email,
					[to]: captured,
				},
			})
		},
	}),
)

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
		handleEmailMock,
	),
	http.head('https://www.gravatar.com/avatar/:md5Hash', async (info) => {
		if (process.env.NODE_ENV !== 'test' && (await isConnectedToTheInternet())) {
			return passthrough()
		}
		return bridgeOutboundMock(maybeHandleMiscMockFetch)(info)
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
	http.all(
		'https://verifyright.co/*',
		bridgeOutboundMock(maybeHandleMiscMockFetch),
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
