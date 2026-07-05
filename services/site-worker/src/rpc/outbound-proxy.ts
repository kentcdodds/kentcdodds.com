import { WorkerEntrypoint } from 'cloudflare:workers'
import { maybeHandleOutboundMockFetch } from '../../../site/app/utils/outbound-mock-handler.server.ts'
import { PASSTHROUGH_HOSTS } from './outbound-mock-routes.ts'
import type { ParentWorkerEnv } from './types.ts'
import { getServiceBindingForHost } from './worker-service-routing.ts'

export class OutboundProxy extends WorkerEntrypoint<ParentWorkerEnv> {
	async fetch(request: Request) {
		const url = new URL(request.url)

		const serviceBinding = getServiceBindingForHost(url.hostname, this.env)
		if (serviceBinding) {
			return serviceBinding.fetch(request)
		}

		// Only staging/preview mocks third-party APIs (Transistor, Kit,
		// Discord, email sending, verifier, ...). Production must reach the
		// real services. OUTBOUND_MOCKS is a var written into the generated
		// wrangler config per deploy target.
		if (this.env.OUTBOUND_MOCKS !== 'true') {
			return fetch(request)
		}

		if (PASSTHROUGH_HOSTS.has(url.hostname)) {
			return fetch(request)
		}

		const mocked = await maybeHandleOutboundMockFetch(request, {
			onOutboundEmail: async (body) => {
				if (body.to) {
					await this.env.SITE_CACHE_KV.put(
						`preview:last-email:${body.to}`,
						JSON.stringify(body),
					)
				}
			},
			searchWorkerUrl:
				typeof this.env.SEARCH_WORKER_URL === 'string'
					? this.env.SEARCH_WORKER_URL
					: undefined,
			searchWorkerToken:
				typeof this.env.SEARCH_WORKER_TOKEN === 'string'
					? this.env.SEARCH_WORKER_TOKEN
					: undefined,
		})
		if (mocked) return mocked

		return fetch(request)
	}
}
