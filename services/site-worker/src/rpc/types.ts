export type AssetsBinding = {
	fetch(request: Request): Response | Promise<Response>
}

export type WorkerLoaderBinding = {
	get(
		id: string,
		factory: () => Promise<{
			compatibilityDate: string
			compatibilityFlags?: string[]
			mainModule: string
			modules: Record<
				string,
				string | { js: string } | { json: unknown } | { wasm: Uint8Array }
			>
			env: Record<string, unknown>
			globalOutbound?: unknown
		}>,
	): {
		getEntrypoint(): { fetch(request: Request): Promise<Response> }
	}
}

export type ServiceWorkerBinding = {
	fetch(request: Request): Response | Promise<Response>
}

export type ParentWorkerEnv = {
	ASSETS?: AssetsBinding
	APP_DB: D1Database
	SITE_CACHE_KV: KVNamespace
	CONTENT_KV: KVNamespace
	MDX_ARTIFACTS: R2Bucket
	LOADER: WorkerLoaderBinding
	OAUTH_WORKER?: ServiceWorkerBinding
	SEARCH_WORKER?: ServiceWorkerBinding
	BUILD_SHA: string
	COMPATIBILITY_DATE: string
	REFRESH_CACHE_SECRET?: string
	SEARCH_WORKER_URL?: string
	[key: string]: unknown
}
