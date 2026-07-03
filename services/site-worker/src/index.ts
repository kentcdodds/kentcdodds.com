import { deleteExpiredSessionsAndVerifications } from './expired-cleanup.ts'
import {
	buildDynamicWorkerModuleMap,
	getDynamicWorkerId,
	type MdxArtifactBundle,
} from './module-map.ts'
import {
	clearManifestCache,
	readMdxManifest,
	shouldBypassManifestCache,
} from './manifest.ts'
import { CacheRpc } from './rpc/cache-rpc.ts'
import { OutboundProxy } from './rpc/outbound-proxy.ts'
import { getParentPrismaClient, PrismaRpc } from './rpc/prisma-rpc.ts'
import type { ParentWorkerEnv } from './rpc/types.ts'
import { serveStaticAsset } from './static-assets.ts'

type ParentExecutionContext = ExecutionContext & {
	exports: {
		PrismaRpc: (options: { props: Record<string, never> }) => unknown
		CacheRpc: (options: { props: Record<string, never> }) => unknown
		OutboundProxy: (options: { props: Record<string, never> }) => unknown
	}
}

export { CacheRpc, OutboundProxy, PrismaRpc }

function getStringEnvBindings(env: ParentWorkerEnv) {
	return Object.fromEntries(
		Object.entries(env).filter((entry): entry is [string, string] => {
			return typeof entry[1] === 'string'
		}),
	)
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

async function fetchArtifactBundle(
	env: ParentWorkerEnv,
	r2Key: string,
): Promise<MdxArtifactBundle | null> {
	const object = await env.MDX_ARTIFACTS.get(r2Key)
	if (!object) return null

	try {
		return (await object.json()) as MdxArtifactBundle
	} catch {
		return null
	}
}

async function handleDynamicRequest(
	request: Request,
	env: ParentWorkerEnv,
	ctx: ParentExecutionContext,
) {
	const bypassManifestCache = shouldBypassManifestCache(request)
	if (bypassManifestCache) {
		clearManifestCache()
	}
	const manifest = await readMdxManifest(env.CONTENT_KV, {
		bypassCache: bypassManifestCache,
	})

	if (!manifest) {
		return unprovisionedResponse({
			missing: 'CONTENT_KV mdx-manifest:current',
		})
	}

	const bundle = await fetchArtifactBundle(env, manifest.r2Key)
	if (!bundle) {
		return unprovisionedResponse({
			missing: `MDX_ARTIFACTS object ${manifest.r2Key}`,
			manifestVersion: manifest.version,
		})
	}

	const buildSha = env.BUILD_SHA?.trim() || 'local-dev'
	const workerId = getDynamicWorkerId(buildSha, manifest.version)
	const stringEnv = getStringEnvBindings(env)

	const worker = env.LOADER.get(workerId, async () => ({
		compatibilityDate: env.COMPATIBILITY_DATE ?? '2026-03-17',
		compatibilityFlags: [
			'nodejs_compat',
			'no_handle_cross_request_promise_resolution',
		],
		mainModule: 'app-worker.js',
		modules: buildDynamicWorkerModuleMap(bundle),
		env: {
			...stringEnv,
			PRISMA_RPC: ctx.exports.PrismaRpc({ props: {} }),
			CACHE_RPC: ctx.exports.CacheRpc({ props: {} }),
			MDX_MODULES_AVAILABLE: 'true',
		},
		globalOutbound: ctx.exports.OutboundProxy({ props: {} }),
	}))

	return worker.getEntrypoint().fetch(request)
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

		if (env.ASSETS) {
			const assetResponse = await serveStaticAsset(request, env.ASSETS)
			if (assetResponse) return assetResponse
		}

		return handleDynamicRequest(request, env, ctx as ParentExecutionContext)
	},

	async scheduled(_controller: ScheduledController, env: ParentWorkerEnv) {
		const prisma = getParentPrismaClient(env)
		const result = await deleteExpiredSessionsAndVerifications(prisma)
		if (
			result.deletedSessionsCount > 0 ||
			result.deletedVerificationsCount > 0
		) {
			console.info('expired-data-cleanup', result)
		}
	},
} satisfies ExportedHandler<ParentWorkerEnv>
