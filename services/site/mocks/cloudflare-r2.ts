import { http, type HttpHandler } from 'msw'
import { maybeHandleR2MockFetch } from '#app/utils/outbound-mock-r2.server.ts'
import { bridgeOutboundMock } from './msw-bridge.ts'

export const cloudflareR2Handlers: Array<HttpHandler> = [
	http.all(
		/https?:\/\/[^/]*r2\.cloudflarestorage\.com\/.*/,
		bridgeOutboundMock(maybeHandleR2MockFetch),
	),
]
