import {
	cacheArtifactBundle,
	fetchArtifactBundle,
	clearArtifactBundleCache,
	getCachedArtifactBundle,
	getCachedModuleMap,
	getOrBuildModuleMap,
} from './artifact-bundle-cache.ts'
import type { MirroredMdxArtifactBundle } from './artifact-kv-mirror.ts'
import {
	consumeCallKentTranscriptionBatch,
	reenqueueStaleCallKentTranscriptionJobs,
} from '../../site/app/utils/call-kent-transcription-consumer.server.ts'
import { createDirectD1Database } from '../../site/app/utils/db/direct-d1-database.server.ts'
import { setRuntimeEnvSource } from '../../site/app/utils/env.server.ts'
import {
	formatColdStartTiming,
	mergeColdStartTimingHeaders,
} from './cold-start-timing.ts'
import { deleteExpiredSessionsAndVerifications } from './expired-cleanup.ts'
import { getAppCodeHash, getDynamicWorkerId } from './module-map.ts'
import {
	clearManifestCache,
	readMdxManifest,
	shouldBypassManifestCache,
} from './manifest.ts'
import {
	ARTIFACT_PUBLISH_PATH,
	handlePublishArtifacts,
} from './publish-artifacts.ts'
import { CacheRpc } from './rpc/cache-rpc.ts'
import { CallKentTranscriptionQueueRpc } from './rpc/call-kent-transcription-queue-rpc.ts'
import { ContentRpc } from './rpc/content-rpc.ts'
import { D1Rpc } from './rpc/d1-rpc.ts'
import { OutboundProxy } from './rpc/outbound-proxy.ts'
import type { ParentWorkerEnv } from './rpc/types.ts'

import {
	bumpPageCacheGeneration,
	clearPageCacheGenerationCache,
	handlePageCacheRequest,
	PAGE_CACHE_GENERATION_HEADER,
	PAGE_CACHE_PREWARM_CONTENT_VERSION_HEADER,
} from './page-cache.ts'
import { serveStaticAsset } from './static-assets.ts'
import { handleMediaRequest } from './media.ts'
import {
	checkParentRateLimit,
	isParentSecretAuthorized,
	MEDIA_RATE_LIMIT_PER_MINUTE,
	OG_IMAGE_RATE_LIMIT_PER_MINUTE,
	rateLimitedResponse,
} from './parent-rate-limit.ts'
import { handleOgImageRequest } from '../../site/app/og/handler.server.ts'

const OG_IMAGE_PATH = '/resources/og-image'

type ParentExecutionContext = ExecutionContext & {
	exports: {
		D1Rpc: (options: { props: Record<string, never> }) => unknown
		CacheRpc: (options: { props: Record<string, never> }) => unknown
		CallKentTranscriptionQueueRpc: (options: {
			props: Record<string, never>
		}) => unknown
		ContentRpc: (options: { props: Record<string, never> }) => unknown
		OutboundProxy: (options: { props: Record<string, never> }) => unknown
	}
}

export {
	CacheRpc,
	CallKentTranscriptionQueueRpc,
	ContentRpc,
	D1Rpc,
	OutboundProxy,
}

function getStringEnvBindings(env: ParentWorkerEnv) {
	return Object.fromEntries(
		Object.entries(env).filter((entry): entry is [string, string] => {
			return typeof entry[1] === 'string'
		}),
	)
}

const CONTENT_VERSION_HEADER = 'X-Content-Version'

async function handleMetaRequest(env: ParentWorkerEnv) {
	const manifest = await readMdxManifest(env.CONTENT_KV)
	return Response.json({
		buildSha: env.BUILD_SHA?.trim() || 'local-dev',
		contentVersion: manifest?.version ?? null,
	})
}

function unprovisionedResponse(details: Record<string, unknown>) {
	return Response.json(
		{
			ok: false,
			error: 'Service unavailable: content artifacts are not provisioned',
			details,
		},
		{ status: 503 },
	)
}

const WARMUP_CRON = '*/2 * * * *'

// Keeps the parent artifact cache and a few dynamic isolates warm so real
// traffic is less likely to pay the cold-isolate cost.
async function warmDynamicWorker(
	env: ParentWorkerEnv,
	ctx: ParentExecutionContext,
) {
	// The blog-post path matters: '/' and '/blog' never import an MDX module,
	// so without it even a "warm" isolate pays the first `import('mdx/...')`
	// (plus its cachified misses) on the first real blog-post request.
	const paths = [
		'/',
		'/blog',
		'/blog/javascript-to-know-for-react',
		'/healthcheck',
	]
	for (const path of paths) {
		try {
			const request = new Request(`https://warmup.internal${path}`, {
				headers: { 'user-agent': 'kcd-site-worker-warmup' },
			})
			const response = await handleDynamicRequest(request, env, ctx)
			await response.body?.cancel()
		} catch (error) {
			console.warn('warmup request failed', path, error)
		}
	}
}

async function handleDynamicRequest(
	request: Request,
	env: ParentWorkerEnv,
	ctx: ParentExecutionContext,
) {
	const parentStartedAt = performance.now()
	const expectedContentVersion = request.headers.get(
		PAGE_CACHE_PREWARM_CONTENT_VERSION_HEADER,
	)
	const bypassManifestCache =
		shouldBypassManifestCache(request) || Boolean(expectedContentVersion)
	if (bypassManifestCache) {
		clearManifestCache()
		clearArtifactBundleCache()
	}
	const manifest = await readMdxManifest(env.CONTENT_KV, {
		bypassCache: bypassManifestCache,
	})
	const manifestMs = performance.now() - parentStartedAt

	if (!manifest) {
		return unprovisionedResponse({
			missing: 'CONTENT_KV mdx-manifest:current',
		})
	}
	if (expectedContentVersion && manifest.version !== expectedContentVersion) {
		return new Response(null, {
			status: 409,
			headers: { [CONTENT_VERSION_HEADER]: manifest.version },
		})
	}

	const bundleFetchStartedAt = performance.now()
	let bundle: MirroredMdxArtifactBundle | undefined = getCachedArtifactBundle(
		manifest.version,
	)
	let bundleCacheHit = true
	if (!bundle) {
		bundleCacheHit = false
		const fetchedBundle = await fetchArtifactBundle(env, manifest.r2Key)
		if (fetchedBundle) {
			bundle = fetchedBundle
			cacheArtifactBundle(manifest.version, bundle)
		}
	}
	const bundleFetchMs = performance.now() - bundleFetchStartedAt

	if (!bundle) {
		return unprovisionedResponse({
			missing: `MDX_ARTIFACTS object ${manifest.r2Key}`,
			manifestVersion: manifest.version,
		})
	}

	const moduleMapStartedAt = performance.now()
	const hadModuleMapCache = Boolean(getCachedModuleMap(manifest.version))
	const modules = getOrBuildModuleMap(manifest.version, bundle)
	const moduleMapMs = performance.now() - moduleMapStartedAt

	// Keyed by actual code content (not deploy SHA) so redeploys with an
	// unchanged app bundle keep reusing warm dynamic isolates.
	const workerId = getDynamicWorkerId(await getAppCodeHash(), manifest.version)
	const stringEnv = getStringEnvBindings(env)

	let loaderCallbackMs = 0
	// Note: WorkerStubs are I/O objects tied to the creating request context
	// and must NOT be cached across requests ("Cannot perform I/O on behalf of
	// a different request"). LOADER.get is cheap; isolate reuse is keyed by
	// workerId on the platform side.
	const worker = env.LOADER.get(workerId, async () => {
		const loaderCallbackStartedAt = performance.now()
		const workerConfig = {
			compatibilityDate: env.COMPATIBILITY_DATE ?? '2026-03-17',
			compatibilityFlags: [
				'nodejs_compat',
				'no_handle_cross_request_promise_resolution',
			],
			mainModule: 'app-worker.js',
			modules,
			env: {
				...stringEnv,
				D1_RPC: ctx.exports.D1Rpc({ props: {} }),
				CACHE_RPC: ctx.exports.CacheRpc({ props: {} }),
				CONTENT_RPC: ctx.exports.ContentRpc({ props: {} }),
				CALL_KENT_TRANSCRIPTION_QUEUE:
					ctx.exports.CallKentTranscriptionQueueRpc({ props: {} }),
			},
			globalOutbound: ctx.exports.OutboundProxy({ props: {} }),
		}
		loaderCallbackMs = performance.now() - loaderCallbackStartedAt
		return workerConfig
	})

	const beforeFetchAt = performance.now()
	const response = await worker.getEntrypoint().fetch(request)
	const parentSetupMs = beforeFetchAt - parentStartedAt
	const totalMs = performance.now() - parentStartedAt
	const parentTiming = formatColdStartTiming({
		manifest: manifestMs,
		bundle: bundleFetchMs,
		moduleMap: moduleMapMs,
		loader: loaderCallbackMs,
		parentSetup: parentSetupMs,
		total: totalMs,
		bundleCache: bundleCacheHit ? 1 : 0,
		moduleMapCache: hadModuleMapCache ? 1 : 0,
	})
	const headers = new Headers(response.headers)
	headers.set(CONTENT_VERSION_HEADER, manifest.version)
	headers.set(
		'X-Cold-Start-Timing',
		mergeColdStartTimingHeaders(
			response.headers.get('X-Cold-Start-Timing') ?? undefined,
			parentTiming,
		),
	)
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	})
}

export default {
	async fetch(request: Request, env: ParentWorkerEnv, ctx: ExecutionContext) {
		const url = new URL(request.url)

		if (url.pathname === '/healthcheck') {
			if (request.method !== 'GET' && request.method !== 'HEAD') {
				return new Response('Method not allowed', {
					status: 405,
					headers: { Allow: 'GET, HEAD' },
				})
			}
			return new Response('OK', {
				status: 200,
				headers: { 'content-type': 'text/plain; charset=utf-8' },
			})
		}

		if (url.pathname === '/__meta') {
			if (request.method !== 'GET' && request.method !== 'HEAD') {
				return new Response('Method not allowed', {
					status: 405,
					headers: { Allow: 'GET, HEAD' },
				})
			}
			return handleMetaRequest(env)
		}

		if (url.pathname.startsWith('/media/')) {
			const rateLimit = checkParentRateLimit(request, {
				bucket: 'media',
				limit: MEDIA_RATE_LIMIT_PER_MINUTE,
			})
			if (!rateLimit.allowed) {
				return rateLimitedResponse(rateLimit.retryAfterSec)
			}
			return handleMediaRequest(request, env, ctx)
		}

		if (url.pathname === OG_IMAGE_PATH) {
			const rateLimit = checkParentRateLimit(request, {
				bucket: 'og-image',
				limit: OG_IMAGE_RATE_LIMIT_PER_MINUTE,
			})
			if (!rateLimit.allowed) {
				return rateLimitedResponse(rateLimit.retryAfterSec)
			}
			return handleOgImageRequest(request, env)
		}

		if (url.pathname === ARTIFACT_PUBLISH_PATH && request.method === 'POST') {
			return handlePublishArtifacts(request, env)
		}

		if (env.ASSETS) {
			const assetResponse = await serveStaticAsset(request, env.ASSETS)
			if (assetResponse) return assetResponse
		}

		let pageCacheGeneration: string | undefined
		if (
			url.pathname === '/action/refresh-cache' &&
			request.method === 'POST' &&
			// The app route re-validates too, but the generation bump must not be
			// reachable without the secret or anyone could bust the page cache.
			isParentSecretAuthorized(
				request.headers.get('auth'),
				env.REFRESH_CACHE_SECRET,
			)
		) {
			pageCacheGeneration = await bumpPageCacheGeneration(env.CONTENT_KV)
			clearPageCacheGenerationCache()
		}

		const response = await handlePageCacheRequest(
			request,
			env,
			ctx,
			(dynamicRequest) =>
				handleDynamicRequest(
					dynamicRequest,
					env,
					ctx as ParentExecutionContext,
				),
		)
		if (!pageCacheGeneration) return response
		const headers = new Headers(response.headers)
		headers.set(PAGE_CACHE_GENERATION_HEADER, pageCacheGeneration)
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		})
	},

	async scheduled(
		controller: ScheduledController,
		env: ParentWorkerEnv,
		ctx: ExecutionContext,
	) {
		if (controller.cron === WARMUP_CRON) {
			setRuntimeEnvSource(getStringEnvBindings(env))
			const database = createDirectD1Database(env.APP_DB)
			const [, recovery] = await Promise.all([
				warmDynamicWorker(env, ctx as ParentExecutionContext),
				reenqueueStaleCallKentTranscriptionJobs({
					database,
					enqueue: async (job) =>
						await env.CALL_KENT_TRANSCRIPTION_QUEUE.send(job),
				}),
			])
			if (recovery.selected > 0) {
				console.info('call-kent-transcription-stale-recovery', recovery)
			}
			return
		}

		const result = await deleteExpiredSessionsAndVerifications(env)
		if (
			result.deletedSessionsCount > 0 ||
			result.deletedVerificationsCount > 0
		) {
			console.info('expired-data-cleanup', result)
		}
	},

	async queue(batch, env) {
		setRuntimeEnvSource(getStringEnvBindings(env))
		await consumeCallKentTranscriptionBatch(batch, {
			database: createDirectD1Database(env.APP_DB),
		})
	},
} satisfies ExportedHandler<ParentWorkerEnv>
