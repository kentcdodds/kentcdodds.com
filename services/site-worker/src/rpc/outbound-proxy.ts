import { WorkerEntrypoint } from 'cloudflare:workers'
import { handleOutboundMockRoute } from '../../../site/app/utils/outbound-mock-handler.server.ts'
import {
	findOutboundMockRoute,
	PASSTHROUGH_HOSTS,
} from './outbound-mock-routes.ts'
import type { ParentWorkerEnv } from './types.ts'
import { getServiceBindingForHost } from './worker-service-routing.ts'

export class OutboundProxy extends WorkerEntrypoint<ParentWorkerEnv> {
	async fetch(request: Request) {
		const url = new URL(request.url)

		const serviceBinding = getServiceBindingForHost(url.hostname, this.env)
		if (serviceBinding) {
			return serviceBinding.fetch(request)
		}

		if (PASSTHROUGH_HOSTS.has(url.hostname)) {
			return fetch(request)
		}

		const mockRoute = findOutboundMockRoute(request, url)
		if (mockRoute) {
			return handleOutboundMockRoute(request, url, mockRoute, {
				onMailgunEmail: async (body) => {
					if (body.to) {
						await this.env.SITE_CACHE_KV.put(
							`preview:last-email:${body.to}`,
							JSON.stringify(body),
						)
					}
				},
			})
		}

		return fetch(request)
	}
}
