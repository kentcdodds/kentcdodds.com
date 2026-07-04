import type { ExecutionContext } from '@cloudflare/workers-types'
import * as sharedReact from 'react'
import * as sharedJsxRuntime from 'react/jsx-runtime'
import {
	createRequestHandler,
	type AppLoadContext,
	type ServerBuild,
} from 'react-router'
import {
	beginCacheRequestStats,
	endCacheRequestStats,
	formatCacheRequestStatsHeader,
} from '#app/utils/cache-request-stats.server.ts'
import { installDevMockFetch } from '#app/utils/dev-outbound-fetch.server.ts'
import {
	setRuntimeEnvSource,
	getEnv,
} from '#app/utils/env.server.ts'
import {
	setRuntimeBindingSource,
	type RuntimeBindingSource,
} from '#app/utils/runtime-bindings.server.ts'
import {
	getRickRollHtml,
	matchRedirect,
	oldImgSocialUrl,
	parseRedirectsString,
} from '#app/utils/redirects-core.server.ts'
import { type MdxDevManifestModule } from '../other/vite-plugins/mdx-dev-manifest.ts'
import redirectsText from '../other/_redirects.txt'
import { applySecurityHeaders } from '../../site-worker/src/dynamic/csp.ts'
import {
	type RateLimitResult,
	applyRateLimitHeaders,
	checkRateLimit,
	createRateLimitedResponse,
	getAgentSearchHintHeaders,
} from '../../site-worker/src/dynamic/rate-limiting.ts'

if (import.meta.hot) {
	import.meta.hot.accept()
}

const sharedReactGlobalKey = Symbol.for('kentcdodds.sharedReact')
const sharedJsxRuntimeGlobalKey = Symbol.for('kentcdodds.sharedJsxRuntime')

function publishSharedReactGlobals() {
	;(globalThis as Record<symbol, unknown>)[sharedReactGlobalKey] = sharedReact
	;(globalThis as Record<symbol, unknown>)[sharedJsxRuntimeGlobalKey] =
		sharedJsxRuntime
}

publishSharedReactGlobals()

type WorkerEnv = RuntimeBindingSource & Record<string, unknown>

type SiteRequestHandler = (
	request: Request,
	loadContext?: AppLoadContext,
) => Promise<Response>

type MarkdownNegotiation =
	typeof import('#app/utils/markdown-negotiation.server.ts')

const parsedRedirects = parseRedirectsString(redirectsText)
const contentDataKey = Symbol.for('kentcdodds.contentData')
const loadMdxModuleKey = Symbol.for('kentcdodds.loadMdxModule')

let fetchMocksInstalled = false
let manifestPromise: Promise<MdxDevManifestModule> | null = null
let markdownNegotiationPromise: Promise<MarkdownNegotiation> | undefined

const requestHandlersByHost = new Map<string, SiteRequestHandler>()
const MAX_CACHED_REQUEST_HANDLERS = 10

function getMarkdownNegotiation() {
	if (!markdownNegotiationPromise) {
		markdownNegotiationPromise = import(
			'#app/utils/markdown-negotiation.server.ts'
		)
	}
	return markdownNegotiationPromise
}

function getStringEnvBindings(env: WorkerEnv) {
	return Object.fromEntries(
		Object.entries(env).filter((entry): entry is [string, string] => {
			return typeof entry[1] === 'string'
		}),
	)
}

function createCspNonce() {
	const bytes = new Uint8Array(16)
	crypto.getRandomValues(bytes)
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
		'',
	)
}

function getHost(request: Request) {
	const url = new URL(request.url)
	return (
		request.headers.get('X-Forwarded-Host') ??
		request.headers.get('host') ??
		url.host
	)
}

function getWorkerAllowedActionOrigins(request: Request) {
	const requestHost = new URL(request.url).host
	return Array.from(new Set([...getEnv().allowedActionOrigins, requestHost]))
}

async function readDevManifestFromDisk(): Promise<MdxDevManifestModule> {
	const { join } = await import('node:path')
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
		const doc = contentData.documents[docKey] as { moduleFile?: string } | undefined
		const relativePath = doc?.moduleFile ?? `${contentDir}/${slug}.mjs`
		const modulePath = `${modulesDir}/${relativePath}`.replace(/\\/g, '/')
		const cacheBust = contentData.version
		try {
			return await import(
				/* @vite-ignore */ `/@fs${modulePath}?t=${cacheBust}`
			)
		} catch (error: unknown) {
			console.error(`loadMdxModule failed for ${modulePath}`, error)
			return null
		}
	}
}

async function getSiteRequestHandler(
	request: Request,
): Promise<SiteRequestHandler> {
	const host = new URL(request.url).host
	const cached = requestHandlersByHost.get(host)
	if (cached) return cached

	const handler = createRequestHandler(
		async () => {
			const build = (await import(
				'virtual:react-router/server-build'
			)) as ServerBuild
			return {
				...build,
				allowedActionOrigins: getWorkerAllowedActionOrigins(request),
			}
		},
		import.meta.env.MODE,
	) as SiteRequestHandler

	requestHandlersByHost.set(host, handler)
	for (const key of requestHandlersByHost.keys()) {
		if (requestHandlersByHost.size <= MAX_CACHED_REQUEST_HANDLERS) break
		if (key !== host) requestHandlersByHost.delete(key)
	}
	return handler
}

const markdownMediaType = 'text/markdown'

function requestPrefersMarkdown(acceptHeader: string | null): boolean {
	if (!acceptHeader) return false
	const entries = acceptHeader
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean)
	let htmlQ = -1
	let markdownQ = -1
	for (const entry of entries) {
		const segments = entry.split(';').map((segment) => segment.trim())
		const type = segments[0]
		if (!type) continue
		const qParam = segments.find((segment) => segment.startsWith('q='))
		const q = qParam ? Number.parseFloat(qParam.slice(2)) : 1
		if (type === 'text/html') htmlQ = q
		if (type === markdownMediaType) markdownQ = q
	}
	if (markdownQ < 0) return false
	if (htmlQ < 0) return true
	return markdownQ >= htmlQ
}

const bogusCrawlerCallPathEndings = new Set([
	'Express.js',
	'Next.js',
	'React.js',
	'index.js',
	'meta.json',
	'u003e',
])

function isBogusCrawlerPath(pathname: string) {
	if (pathname.includes('/node_modules/')) return true
	if (!pathname.startsWith('/calls/')) return false
	const lastSegment = pathname.slice(pathname.lastIndexOf('/') + 1)
	return bogusCrawlerCallPathEndings.has(lastSegment)
}

function redirectResponse(destination: string, status = 301) {
	return new Response(null, {
		status,
		headers: { Location: destination },
	})
}

type PreRouterResult = {
	response: Response | null
	rateLimit: RateLimitResult | null
}

async function runPreRouterPipeline(
	request: Request,
	env: WorkerEnv,
): Promise<PreRouterResult> {
	const url = new URL(request.url)
	const host = getHost(request)
	const proto = request.headers.get('X-Forwarded-Proto') ?? 'https'

	if (url.pathname === '/img/social' && request.method === 'GET') {
		return { response: redirectResponse(oldImgSocialUrl, 302), rateLimit: null }
	}

	if (isBogusCrawlerPath(url.pathname)) {
		return {
			response: new Response('Not found', { status: 404 }),
			rateLimit: null,
		}
	}

	if (host === 'www.kentcdodds.com') {
		return {
			response: redirectResponse(
				`https://kentcdodds.com${url.pathname}${url.search}`,
			),
			rateLimit: null,
		}
	}
	if (host === 'blog.kentcdodds.com') {
		const blogPath = url.pathname === '/' ? '' : url.pathname
		return {
			response: redirectResponse(
				`https://kentcdodds.com/blog${blogPath}${url.search}`,
			),
			rateLimit: null,
		}
	}

	if (proto === 'http') {
		return {
			response: redirectResponse(`https://${host}${url.pathname}${url.search}`),
			rateLimit: null,
		}
	}

	const redirectDestination = matchRedirect({
		redirects: parsedRedirects,
		method: request.method,
		pathname: url.pathname,
		url: url.pathname + url.search,
		protocol: proto,
		host,
	})
	if (redirectDestination) {
		return {
			response: redirectResponse(redirectDestination, 307),
			rateLimit: null,
		}
	}

	if (url.pathname.endsWith('/') && url.pathname.length > 1) {
		const safepath = url.pathname.slice(0, -1).replace(/\/+/g, '/')
		return {
			response: redirectResponse(`${safepath}${url.search}`),
			rateLimit: null,
		}
	}

	const mocks = getStringEnvBindings(env).MOCKS === 'true'
	const rateLimit = checkRateLimit(request, { mocks })
	if (!rateLimit.allowed) {
		return {
			response: createRateLimitedResponse(request, rateLimit),
			rateLimit,
		}
	}

	if (url.pathname === '/redirect.html' && request.method === 'GET') {
		const cspNonce = createCspNonce()
		const headers = new Headers({
			'content-type': 'text/html; charset=utf-8',
		})
		applySecurityHeaders({ headers, request, cspNonce })
		applyRateLimitHeaders(headers, rateLimit)
		return {
			response: new Response(getRickRollHtml(cspNonce), { headers }),
			rateLimit,
		}
	}

	if (
		url.pathname.startsWith('/.well-known/') &&
		request.method === 'OPTIONS'
	) {
		return {
			response: new Response(null, {
				status: 204,
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
					'Access-Control-Allow-Headers':
						request.headers.get('Access-Control-Request-Headers') ?? '*',
				},
			}),
			rateLimit,
		}
	}

	return { response: null, rateLimit }
}

function appendVaryValue(headers: Headers, value: string) {
	const vary = headers.get('vary')
	if (!vary) {
		headers.set('vary', value)
		return
	}
	const values = new Set(
		vary
			.split(',')
			.map((entry) => entry.trim())
			.filter(Boolean),
	)
	values.add(value)
	headers.set('vary', Array.from(values).join(', '))
}

function appendVaryAccept(headers: Headers) {
	appendVaryValue(headers, 'Accept')
	appendVaryValue(headers, 'Accept-Encoding')
}

function shouldSkipRequestLog(request: Request, response: Response) {
	if (response.status !== 200) return false
	const url = new URL(request.url)
	const headToRoot = request.method === 'HEAD' && url.pathname === '/'
	const getToHealthcheck =
		request.method === 'GET' && url.pathname === '/healthcheck'
	return headToRoot || getToHealthcheck
}

function logRequest(request: Request, response: Response, startedAt: number) {
	if (shouldSkipRequestLog(request, response)) return
	const url = new URL(request.url)
	const host = getHost(request)
	const duration = Date.now() - startedAt
	const contentLength = response.headers.get('content-length') ?? '-'
	console.log(
		[
			request.method,
			`${host}${decodeURIComponent(url.pathname + url.search)}`,
			String(response.status),
			contentLength,
			'-',
			String(duration),
			'ms',
		].join(' '),
	)
}

async function handleSiteRequest(
	request: Request,
	env: WorkerEnv,
	ctx: ExecutionContext,
): Promise<Response> {
	const startedAt = Date.now()
	const cacheStats = beginCacheRequestStats()
	try {
		await ensureRuntimeBridges(env)

		const preRouter = await runPreRouterPipeline(request, env)
		const preRouterResponse = preRouter.response
		if (preRouterResponse) {
			const headers = new Headers(preRouterResponse.headers)
			headers.set('X-Cache-Stats', formatCacheRequestStatsHeader(cacheStats))
			logRequest(
				request,
				new Response(preRouterResponse.body, {
					status: preRouterResponse.status,
					statusText: preRouterResponse.statusText,
					headers,
				}),
				startedAt,
			)
			return new Response(preRouterResponse.body, {
				status: preRouterResponse.status,
				statusText: preRouterResponse.statusText,
				headers,
			})
		}

		const cspNonce = createCspNonce()
		const handler = await getSiteRequestHandler(request)
		let response = await handler(request, {
			cloudflare: { env, ctx },
			cspNonce,
		} as AppLoadContext)

		const url = new URL(request.url)
		const acceptHeader = request.headers.get('Accept') ?? ''
		if (requestPrefersMarkdown(acceptHeader)) {
			const { maybeConvertHtmlResponseToMarkdown } =
				await getMarkdownNegotiation()
			response = await maybeConvertHtmlResponseToMarkdown(response)
		}

		const headers = new Headers(response.headers)
		applySecurityHeaders({
			headers,
			request,
			cspNonce,
			mode: import.meta.env.DEV ? 'development' : 'production',
		})
		const mocks = getStringEnvBindings(env).MOCKS === 'true'
		const rateLimit = preRouter.rateLimit ?? checkRateLimit(request, { mocks })
		applyRateLimitHeaders(headers, rateLimit)
		if (
			rateLimit.tier === 'markdown' &&
			rateLimit.remaining <= rateLimit.limit / 2
		) {
			const hints = getAgentSearchHintHeaders(url.pathname)
			for (const [key, value] of Object.entries(hints)) {
				headers.set(key, value)
			}
		}
		if (url.pathname.startsWith('/.well-known/')) {
			headers.set('Access-Control-Allow-Origin', '*')
		}
		if (
			response.ok &&
			Boolean(headers.get('content-type')?.match(/\btext\/(html|markdown)\b/i))
		) {
			appendVaryAccept(headers)
		}
		headers.set('X-Cache-Stats', formatCacheRequestStatsHeader(cacheStats))

		const finalResponse = new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		})
		logRequest(request, finalResponse, startedAt)
		return finalResponse
	} finally {
		endCacheRequestStats()
	}
}

export default {
	async fetch(
		request: Request,
		env: WorkerEnv,
		ctx: ExecutionContext,
	): Promise<Response> {
		try {
			return await handleSiteRequest(request, env, ctx)
		} catch (error: unknown) {
			console.error('dev-worker fetch failed', error)
			return new Response('Internal Server Error', { status: 500 })
		}
	},
}
