import { join } from 'node:path'
import type { ExecutionContext } from '@cloudflare/workers-types'
import { type ServerBuild } from 'react-router'
import { consumeCallKentTranscriptionBatch } from '#app/utils/call-kent-transcription-consumer.server.ts'
import { createDirectD1Database } from '#app/utils/db/direct-d1-database.server.ts'
import { installDevMockFetch } from '#app/utils/dev-outbound-fetch.server.ts'
import { setRuntimeEnvSource } from '#app/utils/env.server.ts'
import { setRuntimeBindingSource } from '#app/utils/runtime-bindings.server.ts'
import { handleOgImageRequest } from '#app/og/handler.server.ts'
import { type MdxDevManifestModule } from '../other/vite-plugins/mdx-dev-manifest.ts'
import redirectsText from '../other/_redirects.txt'
import { handleMediaRequest } from '../../site-worker/src/media.ts'
import { PRODUCTION_MEDIA_ORIGIN } from '#app/utils/media-serving.server.ts'
import {
	createWorkerFetchHandler,
	getStringEnvBindings,
	type WorkerEnv,
} from '#app/utils/worker-request-pipeline.server.ts'

if (import.meta.hot) {
	import.meta.hot.accept()
}

const contentDataKey = Symbol.for('kentcdodds.contentData')
const loadMdxModuleKey = Symbol.for('kentcdodds.loadMdxModule')

let fetchMocksInstalled = false
let manifestPromise: Promise<MdxDevManifestModule> | null = null

async function readDevManifestFromDisk(): Promise<MdxDevManifestModule> {
	const cacheRoot = __MDX_DEV_CACHE_ROOT__
	const modulesDir = join(cacheRoot, 'modules')
	const sidecarPort = Number(process.env.MDX_DEV_SIDECAR_PORT ?? 3099)
	const response = await fetch(`http://127.0.0.1:${sidecarPort}/manifest`, {
		headers: { 'cache-control': 'no-cache' },
	})
	if (!response.ok) {
		throw new Error(
			`MDX dev manifest fetch failed (${response.status}). Is the mdx dev-watcher running?`,
		)
	}
	const manifest = (await response.json()) as Omit<
		MdxDevManifestModule,
		'modulesDir' | 'moduleMtimes'
	>
	const moduleMtimes = Object.fromEntries(
		Object.keys(manifest.documents).map((key) => [key, Date.now()]),
	)
	return {
		...manifest,
		modulesDir,
		moduleMtimes,
	}
}

async function getDevManifest() {
	if (import.meta.env.DEV) {
		return readDevManifestFromDisk()
	}
	if (!manifestPromise) {
		manifestPromise = import('virtual:mdx-dev-manifest').then(
			(mod) => mod.default as MdxDevManifestModule,
		)
	}
	return manifestPromise
}

async function ensureRuntimeBridges(env: WorkerEnv) {
	const stringEnv = getStringEnvBindings(env)
	setRuntimeEnvSource(stringEnv)
	setRuntimeBindingSource(env)

	if (!fetchMocksInstalled && stringEnv.MOCKS === 'true') {
		installDevMockFetch({
			mocksEnabled: true,
			searchWorkerUrl: stringEnv.SEARCH_WORKER_URL,
		})
		fetchMocksInstalled = true
	}

	const manifest = await getDevManifest()
	const { modulesDir, moduleMtimes: _moduleMtimes, ...contentData } = manifest
	;(globalThis as Record<symbol, unknown>)[contentDataKey] = contentData
	;(globalThis as Record<symbol, unknown>)[loadMdxModuleKey] = async (
		contentDir: string,
		slug: string,
	) => {
		const docKey = `${contentDir}/${slug}`
		const doc = contentData.documents[docKey] as
			| { moduleFile?: string }
			| undefined
		const relativePath = doc?.moduleFile ?? `${contentDir}/${slug}.mjs`
		const modulePath = `${modulesDir}/${relativePath}`.replace(/\\/g, '/')
		const cacheBust = contentData.version
		try {
			return await import(/* @vite-ignore */ `/@fs${modulePath}?t=${cacheBust}`)
		} catch (error: unknown) {
			console.error(`loadMdxModule failed for ${modulePath}`, error)
			return null
		}
	}
}

async function handleDevMediaRequest(
	request: Request,
	env: WorkerEnv,
	ctx: ExecutionContext,
) {
	const override = (env as { MEDIA_FALLBACK_ORIGIN?: string })
		.MEDIA_FALLBACK_ORIGIN
	const fallbackOrigins = override ? [override] : [PRODUCTION_MEDIA_ORIGIN]
	return handleMediaRequest(request, env as never, ctx, { fallbackOrigins })
}

async function handleEarlyRequest(
	request: Request,
	env: WorkerEnv,
	ctx: ExecutionContext,
) {
	const url = new URL(request.url)

	if (url.pathname.startsWith('/media/')) {
		return handleDevMediaRequest(request, env, ctx)
	}

	if (url.pathname === '/resources/og-image') {
		return handleOgImageRequest(request, env)
	}

	return null
}

const fetchHandler = createWorkerFetchHandler({
	redirectsText,
	ensureRuntimeBridges,
	handleEarlyRequest,
	requestHandlerMode: import.meta.env.MODE,
	cspMode: import.meta.env.DEV ? 'development' : 'production',
	errorLogLabel: 'dev-worker fetch failed',
	async getServerBuild() {
		return async () =>
			(await import('virtual:react-router/server-build')) as ServerBuild
	},
})

export default {
	...fetchHandler,
	async queue(batch: MessageBatch<unknown>, env: WorkerEnv) {
		const stringEnv = getStringEnvBindings(env)
		setRuntimeEnvSource(stringEnv)
		setRuntimeBindingSource(env)
		await consumeCallKentTranscriptionBatch(batch, {
			database: createDirectD1Database(env.APP_DB as D1Database),
		})
	},
} satisfies ExportedHandler<WorkerEnv>
