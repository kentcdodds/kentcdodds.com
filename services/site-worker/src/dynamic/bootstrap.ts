import * as sharedReact from 'react'
import * as sharedJsxRuntime from 'react/jsx-runtime'
import {
	createRequestHandler,
	type AppLoadContext,
	type ServerBuild,
} from 'react-router'

const sharedReactGlobalKey = Symbol.for('kentcdodds.sharedReact')
const sharedJsxRuntimeGlobalKey = Symbol.for('kentcdodds.sharedJsxRuntime')

function publishSharedReactGlobals() {
	;(globalThis as Record<symbol, unknown>)[sharedReactGlobalKey] = sharedReact
	;(globalThis as Record<symbol, unknown>)[sharedJsxRuntimeGlobalKey] =
		sharedJsxRuntime
}

publishSharedReactGlobals()
import {
	beginCacheRequestStats,
	endCacheRequestStats,
	formatCacheRequestStatsHeader,
} from '../../../site/app/utils/cache-request-stats.server.ts'
import {
	setRuntimeEnvSource,
	getEnv,
} from '../../../site/app/utils/env.server.ts'
import {
	setRuntimeBindingSource,
	type RuntimeBindingSource,
} from '../../../site/app/utils/runtime-bindings.server.ts'
import { applySecurityHeaders } from './csp.ts'
import { formatColdStartTiming } from '../cold-start-timing.ts'
import {
	type RateLimitResult,
	applyRateLimitHeaders,
	checkRateLimit,
	createRateLimitedResponse,
	getAgentSearchHintHeaders,
} from './rate-limiting.ts'
import {
	getRickRollHtml,
	matchRedirect,
	oldImgSocialUrl,
	parseRedirectsString,
} from '../../../site/app/utils/redirects-core.server.ts'
import redirectsText from '../../../site/other/_redirects.txt'

let isolateId: string | undefined

function getIsolateId() {
	if (!isolateId) isolateId = crypto.randomUUID()
	return isolateId
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

type MarkdownNegotiation =
	typeof import('../../../site/app/utils/markdown-negotiation.server.ts')
let markdownNegotiationPromise: Promise<MarkdownNegotiation> | undefined

function getMarkdownNegotiation() {
	if (!markdownNegotiationPromise) {
		markdownNegotiationPromise = import(
			'../../../site/app/utils/markdown-negotiation.server.ts'
		)
	}
	return markdownNegotiationPromise
}

type WorkerEnv = RuntimeBindingSource & Record<string, unknown>

type SiteRequestHandler = (
	request: Request,
	loadContext?: AppLoadContext,
) => Promise<Response>

const parsedRedirects = parseRedirectsString(redirectsText)

const bogusCrawlerCallPathEndings = new Set([
	'Express.js',
	'Next.js',
	'React.js',
	'index.js',
	'meta.json',
	'u003e',
])

let contentDataPromise: Promise<unknown> | null = null
let bridgesInitialized = false
let firstRequestTimings: Record<string, number> | null = null

function getHost(request: Request) {
	const url = new URL(request.url)
	return (
		request.headers.get('X-Forwarded-Host') ??
		request.headers.get('host') ??
		url.host
	)
}

function isBogusCrawlerPath(pathname: string) {
	if (pathname.includes('/node_modules/')) return true
	if (!pathname.startsWith('/calls/')) return false
	const lastSegment = pathname.slice(pathname.lastIndexOf('/') + 1)
	return bogusCrawlerCallPathEndings.has(lastSegment)
}

function createCspNonce() {
	const bytes = new Uint8Array(16)
	crypto.getRandomValues(bytes)
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
		'',
	)
}

function getStringEnvBindings(env: WorkerEnv) {
	return Object.fromEntries(
		Object.entries(env).filter((entry): entry is [string, string] => {
			return typeof entry[1] === 'string'
		}),
	)
}

async function ensureRuntimeBridges(env: WorkerEnv) {
	if (bridgesInitialized) return
	const bridgesStartedAt = performance.now()
	setRuntimeEnvSource(getStringEnvBindings(env))
	setRuntimeBindingSource(env)

	const contentDataKey = Symbol.for('kentcdodds.contentData')
	const loadMdxModuleKey = Symbol.for('kentcdodds.loadMdxModule')

	if (!contentDataPromise) {
		contentDataPromise = import('site-content-data.json').then(
			(mod) => mod.default,
		)
	}
	const contentImportStartedAt = performance.now()
	const contentData = await contentDataPromise
	const contentImportMs = performance.now() - contentImportStartedAt
	;(globalThis as Record<symbol, unknown>)[contentDataKey] = contentData
	;(globalThis as Record<symbol, unknown>)[loadMdxModuleKey] = async (
		contentDir: string,
		slug: string,
	) => {
		try {
			return await import(`mdx/${contentDir}/${slug}.js`)
		} catch (error: unknown) {
			console.error(
				`loadMdxModule failed for mdx/${contentDir}/${slug}.js`,
				error,
			)
			return null
		}
	}
	bridgesInitialized = true
	if (!firstRequestTimings) {
		firstRequestTimings = {
			bridges: performance.now() - bridgesStartedAt,
			contentImport: contentImportMs,
		}
	}
}

function getWorkerAllowedActionOrigins(request: Request) {
	const requestHost = new URL(request.url).host
	return Array.from(new Set([...getEnv().allowedActionOrigins, requestHost]))
}

// Handlers are cached per request host: allowedActionOrigins includes the
// request host, so a single cached handler would pin action origin checks to
// whichever host happened to arrive first (e.g. the warmup cron's internal
// host), breaking POSTs from the real public host on that isolate.
const requestHandlersByHost = new Map<string, SiteRequestHandler>()
const MAX_CACHED_REQUEST_HANDLERS = 10
let cachedServerBuild: ServerBuild | null = null

async function getSiteRequestHandler(
	request: Request,
): Promise<SiteRequestHandler> {
	const host = new URL(request.url).host
	const cached = requestHandlersByHost.get(host)
	if (cached) return cached

	if (!cachedServerBuild) {
		const handlerImportStartedAt = performance.now()
		cachedServerBuild = (await import(
			// @ts-ignore -- generated by `npm run build:site --workspace site-worker`;
			// absent in environments (like CI validate) that typecheck without building.
			'../../../site/build/server/index.js'
		)) as unknown as ServerBuild
		if (firstRequestTimings) {
			firstRequestTimings.handlerImport =
				performance.now() - handlerImportStartedAt
		}
	}

	const handler = createRequestHandler(
		{
			...cachedServerBuild,
			allowedActionOrigins: getWorkerAllowedActionOrigins(request),
		},
		'production',
	) as SiteRequestHandler
	requestHandlersByHost.set(host, handler)
	for (const key of requestHandlersByHost.keys()) {
		if (requestHandlersByHost.size <= MAX_CACHED_REQUEST_HANDLERS) break
		if (key !== host) requestHandlersByHost.delete(key)
	}
	return handler
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

async function handleSiteRequest(
	request: Request,
	env: WorkerEnv,
	ctx: ExecutionContext,
): Promise<Response> {
	const startedAt = Date.now()
	const requestStartedAt = performance.now()
	const cacheStats = beginCacheRequestStats()
	try {
		await ensureRuntimeBridges(env)

		const preRouter = await runPreRouterPipeline(request, env)
		const preRouterResponse = preRouter.response
		if (preRouterResponse) {
			const headers = new Headers(preRouterResponse.headers)
			headers.set('X-Isolate-Id', getIsolateId())
			headers.set('X-Cache-Stats', formatCacheRequestStatsHeader(cacheStats))
			if (firstRequestTimings) {
				headers.set(
					'X-Cold-Start-Timing',
					formatColdStartTiming({
						...firstRequestTimings,
						request: performance.now() - requestStartedAt,
					}),
				)
				firstRequestTimings = null
			}
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
		const handlerStartedAt = performance.now()
		const handler = await getSiteRequestHandler(request)
		const handlerReadyMs = performance.now() - handlerStartedAt
		let response = await handler(request, {
			cloudflare: { env, ctx },
			cspNonce,
		} as AppLoadContext)
		const handlerServeMs = performance.now() - handlerStartedAt - handlerReadyMs

		const url = new URL(request.url)
		const acceptHeader = request.headers.get('Accept') ?? ''
		if (requestPrefersMarkdown(acceptHeader)) {
			const { maybeConvertHtmlResponseToMarkdown } =
				await getMarkdownNegotiation()
			response = await maybeConvertHtmlResponseToMarkdown(response)
		}

		const headers = new Headers(response.headers)
		applySecurityHeaders({ headers, request, cspNonce })
		// Reuse the pre-router rate-limit result so a request only consumes one
		// quota unit (checkRateLimit increments the window on every call).
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
		headers.set('X-Isolate-Id', getIsolateId())
		headers.set('X-Cache-Stats', formatCacheRequestStatsHeader(cacheStats))
		if (firstRequestTimings) {
			headers.set(
				'X-Cold-Start-Timing',
				formatColdStartTiming({
					...firstRequestTimings,
					handlerReady: handlerReadyMs,
					handlerServe: handlerServeMs,
					request: performance.now() - requestStartedAt,
				}),
			)
			firstRequestTimings = null
		}

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
			console.error('app-worker fetch failed', error)
			return new Response('Internal Server Error', { status: 500 })
		}
	},
}
