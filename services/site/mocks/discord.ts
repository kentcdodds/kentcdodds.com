import { http, type HttpHandler } from 'msw'
import { maybeHandleDiscordMockFetch } from '#app/utils/outbound-mock-discord.server.ts'
import { bridgeOutboundMock } from './msw-bridge.ts'

export const discordHandlers: Array<HttpHandler> = [
	http.all(
		'https://discord.com/*',
		bridgeOutboundMock(maybeHandleDiscordMockFetch),
	),
]
