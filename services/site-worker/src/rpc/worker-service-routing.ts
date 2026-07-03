import type { ParentWorkerEnv } from './types.ts'

export type ServiceWorkerBinding = {
	fetch(request: Request): Response | Promise<Response>
}

export const OAUTH_WORKER_HOST = 'kcd-oauth-provider.kentcdodds.workers.dev'
export const SEARCH_WORKER_HOST = 'kcd-search-worker.kentcdodds.workers.dev'

function parseHostname(url: string | undefined) {
	if (!url) return null
	try {
		return new URL(url).hostname
	} catch {
		return null
	}
}

export function getServiceBindingForHost(
	hostname: string,
	env: ParentWorkerEnv,
): ServiceWorkerBinding | undefined {
	if (hostname === OAUTH_WORKER_HOST && env.OAUTH_WORKER) {
		return env.OAUTH_WORKER as ServiceWorkerBinding
	}

	const searchHost =
		parseHostname(
			typeof env.SEARCH_WORKER_URL === 'string'
				? env.SEARCH_WORKER_URL
				: undefined,
		) ?? SEARCH_WORKER_HOST

	if (hostname === searchHost && env.SEARCH_WORKER) {
		return env.SEARCH_WORKER as ServiceWorkerBinding
	}

	return undefined
}
