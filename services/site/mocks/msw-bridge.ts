import { passthrough, type HttpResponseResolver } from 'msw'

/**
 * Adapts a canonical outbound mock handler (`app/utils/outbound-mock-*`) into
 * an MSW resolver. The canonical handlers are typed against the workers-types
 * `Request`/`Response` globals while MSW uses the DOM ones; both are the same
 * fetch primitives at runtime, so the casts are safe.
 */
export function bridgeOutboundMock(
	handler: (request: Request) => Promise<Response | null>,
): HttpResponseResolver {
	return async ({ request }) => {
		const outboundRequest = request.clone() as unknown as Request
		const response = await handler(outboundRequest)
		if (!response) return passthrough()
		return response as unknown as globalThis.Response
	}
}
