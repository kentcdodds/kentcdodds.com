import { http, type HttpHandler } from 'msw'
import {
	getTransistorMockEpisodes,
	maybeHandleTransistorMockFetch,
	resetTransistorMockState as resetSharedTransistorMockState,
	seedTransistorEpisodes,
} from '#app/utils/outbound-mock-transistor.server.ts'
import { bridgeOutboundMock } from './msw-bridge.ts'

/** Test/dev MSW fixture: 300 published episodes for podcast search corpus + list APIs. */
const TRANSISTOR_SEED_COUNT = 300

seedTransistorEpisodes(TRANSISTOR_SEED_COUNT)

export function resetTransistorMockState() {
	resetSharedTransistorMockState()
	seedTransistorEpisodes(TRANSISTOR_SEED_COUNT)
}

export const transistorHandlers: Array<HttpHandler> = [
	http.all(
		'https://api.transistor.fm/*',
		bridgeOutboundMock(maybeHandleTransistorMockFetch),
	),
	http.all(
		'https://transistorupload.s3.amazonaws.com/*',
		bridgeOutboundMock(maybeHandleTransistorMockFetch),
	),
]

export { getTransistorMockEpisodes }
