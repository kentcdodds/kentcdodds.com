import * as sharedReact from 'react'
import * as sharedJsxRuntime from 'react/jsx-runtime'
import {
	createRequestHandler,
	type AppLoadContext,
	type ServerBuild,
} from 'react-router'

export { sharedReact, sharedJsxRuntime }

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
import { setRuntimeEnvSource, getEnv } from '../../../site/app/utils/env.server.ts'
import {
	setRuntimeBindingSource,
	type RuntimeBindingSource,
} from '../../../site/app/utils/runtime-bindings.server.ts'
import { applySecurityHeaders } from './csp.ts'
import {
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
} from '../../../site/server/redirects-core.ts'
import redirectsText from '../../../site/server/_redirects.txt'
import {
	maybeConvertHtmlResponseToMarkdown,
	requestPrefersMarkdown,
} from '../../../site/server/markdown-negotiation.ts'

const ISOLATE_ID = crypto.randomUUID()

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
let cachedRequestHandler: SiteRequestHandler | null = null

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
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
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
	setRuntimeEnvSource(getStringEnvBindings(env))
	setRuntimeBindingSource(env)

	const contentDataKey = Symbol.for('kentcdodds.contentData')
	const loadMdxModuleKey = Symbol.for('kentcdodds.loadMdxModule')

	if (!contentDataPromise) {
		contentDataPromise = import('site-content-data.json').then(
			(mod) => mod.default,
		)
	}
	const contentData = await contentDataPromise
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
}

function getWorkerAllowedActionOrigins(request: Request) {
	const requestHost = new URL(request.url).host
	return Array.from(new Set([...getEnv().allowedActionOrigins, requestHost]))
}

async function getSiteRequestHandler(
	request: Request,
): Promise<SiteRequestHandler> {
	if (cachedRequestHandler) return cachedRequestHandler
	const build = (await import(
		'../../../site/build/server/index.js'
	)) as unknown as ServerBuild
	cachedRequestHandler = createRequestHandler(
		{
			...build,
			allowedActionOrigins: getWorkerAllowedActionOrigins(request),
		},
		'production',
	) as SiteRequestHandler
	return cachedRequestHandler
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

async function runPreRouterPipeline(
	request: Request,
	env: WorkerEnv,
): Promise<Response | null> {
	const url = new URL(request.url)
	const host = getHost(request)
	const proto = request.headers.get('X-Forwarded-Proto') ?? 'https'

	if (url.pathname === '/img/social' && request.method === 'GET') {
		return redirectResponse(oldImgSocialUrl, 302)
	}

	if (url.pathname === '/__metronome' && request.method === 'POST') {
		return new Response('Metronome is deprecated and no longer in use.', {
			status: 503,
		})
	}

	if (isBogusCrawlerPath(url.pathname)) {
		return new Response('Not found', { status: 404 })
	}

	if (host === 'www.kentcdodds.com') {
		return redirectResponse(`https://kentcdodds.com${url.pathname}${url.search}`)
	}
	if (host === 'blog.kentcdodds.com') {
		const blogPath = url.pathname === '/' ? '' : url.pathname
		return redirectResponse(
			`https://kentcdodds.com/blog${blogPath}${url.search}`,
		)
	}

	if (proto === 'http') {
		return redirectResponse(`https://${host}${url.pathname}${url.search}`)
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
		return redirectResponse(redirectDestination, 307)
	}

	if (url.pathname.endsWith('/') && url.pathname.length > 1) {
		const safepath = url.pathname.slice(0, -1).replace(/\/+/g, '/')
		return redirectResponse(`${safepath}${url.search}`)
	}

	const mocks = getStringEnvBindings(env).MOCKS === 'true'
	const rateLimit = checkRateLimit(request, { mocks })
	if (!rateLimit.allowed) {
		return createRateLimitedResponse(request, rateLimit)
	}

	if (url.pathname === '/redirect.html' && request.method === 'GET') {
		const cspNonce = createCspNonce()
		const headers = new Headers({
			'content-type': 'text/html; charset=utf-8',
		})
		applySecurityHeaders({ headers, request, cspNonce })
		applyRateLimitHeaders(headers, rateLimit)
		return new Response(getRickRollHtml(cspNonce), { headers })
	}

	if (
		url.pathname.startsWith('/.well-known/') &&
		request.method === 'OPTIONS'
	) {
		return new Response(null, {
			status: 204,
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
				'Access-Control-Allow-Headers':
					request.headers.get('Access-Control-Request-Headers') ?? '*',
			},
		})
	}

	return null
}

function appendVaryAccept(headers: Headers) {
	const vary = headers.get('vary')
	if (!vary) {
		headers.set('vary', 'Accept')
		return
	}
	const values = new Set(
		vary
			.split(',')
			.map((entry) => entry.trim())
			.filter(Boolean),
	)
	values.add('Accept')
	headers.set('vary', Array.from(values).join(', '))
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

		const preRouterResponse = await runPreRouterPipeline(request, env)
		if (preRouterResponse) {
			const headers = new Headers(preRouterResponse.headers)
			headers.set('X-Isolate-Id', ISOLATE_ID)
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
		if (
			requestPrefersMarkdown((types) => {
				const accepts = acceptHeader
					.split(',')
					.map((part) => part.trim().split(';')[0]?.trim().toLowerCase())
					.filter(Boolean)
				for (const type of types.map((t) => t.toLowerCase())) {
					if (accepts.includes(type)) return type
				}
				return false
			})
		) {
			response = await maybeConvertHtmlResponseToMarkdown(response)
		}

		const headers = new Headers(response.headers)
		applySecurityHeaders({ headers, request, cspNonce })
		const mocks = getStringEnvBindings(env).MOCKS === 'true'
		const rateLimit = checkRateLimit(request, { mocks })
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
		headers.set('X-Isolate-Id', ISOLATE_ID)
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
			console.error('app-worker fetch failed', error)
			return new Response('Internal Server Error', { status: 500 })
		}
	},
}
