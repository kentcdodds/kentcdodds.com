import {
	cacheArtifactBundle,
	fetchArtifactBundle,
	clearArtifactBundleCache,
	getCachedArtifactBundle,
	getCachedModuleMap,
	getOrBuildModuleMap,
} from './artifact-bundle-cache.ts'
import {
	formatColdStartTiming,
	mergeColdStartTimingHeaders,
} from './cold-start-timing.ts'
import { deleteExpiredSessionsAndVerifications } from './expired-cleanup.ts'
import {
	getAppCodeHash,
	getDynamicWorkerId,
	type MdxArtifactBundle,
} from './module-map.ts'
import {
	clearManifestCache,
	readMdxManifest,
	shouldBypassManifestCache,
} from './manifest.ts'
import { CacheRpc } from './rpc/cache-rpc.ts'
import { ContentRpc } from './rpc/content-rpc.ts'
import { D1Rpc } from './rpc/d1-rpc.ts'
import { OutboundProxy } from './rpc/outbound-proxy.ts'
import { PrismaRpc } from './rpc/prisma-rpc.ts'
import type { DynamicWorkerConfig, ParentWorkerEnv } from './rpc/types.ts'

import {
	bumpPageCacheGeneration,
	clearPageCacheGenerationCache,
	handlePageCacheRequest,
} from './page-cache.ts'
import { serveStaticAsset } from './static-assets.ts'

type ParentExecutionContext = ExecutionContext & {
	exports: {
		PrismaRpc: (options: { props: Record<string, never> }) => unknown
		D1Rpc: (options: { props: Record<string, never> }) => unknown
		CacheRpc: (options: { props: Record<string, never> }) => unknown
		ContentRpc: (options: { props: Record<string, never> }) => unknown
		OutboundProxy: (options: { props: Record<string, never> }) => unknown
	}
}

export { CacheRpc, ContentRpc, D1Rpc, OutboundProxy, PrismaRpc }

function getStringEnvBindings(env: ParentWorkerEnv) {
	return Object.fromEntries(
		Object.entries(env).filter((entry): entry is [string, string] => {
			return typeof entry[1] === 'string'
		}),
	)
}

const ARTIFACT_PUBLISH_PATH = '/resources/mdx-artifacts'

async function handlePublishArtifacts(request: Request, env: ParentWorkerEnv) {
	if (request.headers.get('auth') !== env.REFRESH_CACHE_SECRET) {
		return new Response(null, { status: 404 })
	}

	const bodyText = await request.text()
	let bundle: MdxArtifactBundle
	try {
		bundle = JSON.parse(bodyText) as MdxArtifactBundle
	} catch {
		return Response.json(
			{ ok: false, error: 'Invalid JSON body' },
			{ status: 400 },
		)
	}

	if (!bundle.version || typeof bundle.version !== 'string') {
		return Response.json(
			{ ok: false, error: 'Bundle JSON must include a string "version" field' },
			{ status: 400 },
		)
	}

	const r2Key = `mdx-artifacts/${bundle.version}.json`
	await env.MDX_ARTIFACTS.put(r2Key, bodyText, {
		httpMetadata: { contentType: 'application/json' },
	})

	// Overwrite the KV mirror too: fetchArtifactBundle prefers the mirror, so
	// a republish with an unchanged version/r2Key must not keep serving the
	// previously mirrored artifact JSON.
	try {
		await env.CONTENT_KV.put(`mdx-bundle:${r2Key}`, bodyText)
	} catch {
		// KV values cap at 25 MiB; R2 remains the source of truth.
	}

	const manifest = JSON.stringify({ version: bundle.version, r2Key })
	await env.CONTENT_KV.put('mdx-manifest:current', manifest)
	clearManifestCache()
	clearArtifactBundleCache()
	await bumpPageCacheGeneration(env.CONTENT_KV)

	return Response.json({ ok: true, version: bundle.version, r2Key })
}

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
	const paths = ['/', '/blog', '/healthcheck']
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
	const bypassManifestCache = shouldBypassManifestCache(request)
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

	const bundleFetchStartedAt = performance.now()
	let bundle: MdxArtifactBundle | undefined = getCachedArtifactBundle(
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
				PRISMA_RPC: ctx.exports.PrismaRpc({ props: {} }),
				D1_RPC: ctx.exports.D1Rpc({ props: {} }),
				CACHE_RPC: ctx.exports.CacheRpc({ props: {} }),
				CONTENT_RPC: ctx.exports.ContentRpc({ props: {} }),
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

		if (url.pathname === ARTIFACT_PUBLISH_PATH && request.method === 'POST') {
			return handlePublishArtifacts(request, env)
		}

		if (env.ASSETS) {
			const assetResponse = await serveStaticAsset(request, env.ASSETS)
			if (assetResponse) return assetResponse
		}

		if (url.pathname === '/action/refresh-cache' && request.method === 'POST') {
			await bumpPageCacheGeneration(env.CONTENT_KV)
			clearPageCacheGenerationCache()
		}

		return handlePageCacheRequest(request, env, ctx, (dynamicRequest) =>
			handleDynamicRequest(dynamicRequest, env, ctx as ParentExecutionContext),
		)
	},

	async scheduled(
		controller: ScheduledController,
		env: ParentWorkerEnv,
		ctx: ExecutionContext,
	) {
		if (controller.cron === WARMUP_CRON) {
			await warmDynamicWorker(env, ctx as ParentExecutionContext)
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
} satisfies ExportedHandler<ParentWorkerEnv>
