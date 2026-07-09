import { http, type HttpHandler } from 'msw'
import { maybeHandleKitMockFetch } from '#app/utils/outbound-mock-kit.server.ts'
import { bridgeOutboundMock } from './msw-bridge.ts'

export const kitHandlers: Array<HttpHandler> = [
	http.all(
		'https://api.kit.com/*',
		bridgeOutboundMock(maybeHandleKitMockFetch),
	),
]
