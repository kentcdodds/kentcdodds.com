import {
	createReadableStreamFromReadable,
	writeReadableStreamToWritable,
} from '@react-router/node'
import onHeaders from 'on-headers'
import type {
	NextFunction,
	Request as ExpressRequest,
	Response as ExpressResponse,
} from 'express'
import {
	createRequestHandler as createReactRouterRequestHandler,
	type AppLoadContext,
	type RouterContextProvider,
	type ServerBuild,
	type UNSAFE_MiddlewareEnabled,
} from 'react-router'

const localServerModuleExtension = import.meta.url.includes('/server-build/')
	? '.js'
	: '.ts'
const markdownNegotiationSpecifier = `./markdown-negotiation${localServerModuleExtension}`

const { maybeConvertHtmlResponseToMarkdown, requestPrefersMarkdown } =
	(await import(
		markdownNegotiationSpecifier
	)) as typeof import('./markdown-negotiation.ts')

type MaybePromise<T> = T | Promise<T>

type GetLoadContextFunction = (
	req: ExpressRequest,
	res: ExpressResponse,
) => UNSAFE_MiddlewareEnabled extends true
	? MaybePromise<RouterContextProvider>
	: MaybePromise<AppLoadContext>

type ExpressRequestHandler = (
	req: ExpressRequest,
	res: ExpressResponse,
	next: NextFunction,
) => Promise<void>

const preflightAllowedMethods = 'GET,HEAD,PUT,PATCH,POST,DELETE'

function handleOptionsPreflight(req: ExpressRequest, res: ExpressResponse) {
	if (req.method !== 'OPTIONS') return false
	if (!req.header('Access-Control-Request-Method')) return false

	onHeaders(res, () => {
		res.vary('Origin')
		res.vary('Access-Control-Request-Method')
		res.vary('Access-Control-Request-Headers')
	})
	res.header('Access-Control-Allow-Methods', preflightAllowedMethods)
	res.header(
		'Access-Control-Allow-Headers',
		req.header('Access-Control-Request-Headers') || '*',
	)
	res.sendStatus(204)
	return true
}

function createRemixHeaders(requestHeaders: ExpressRequest['headers']) {
	const headers = new Headers()
	for (const [key, values] of Object.entries(requestHeaders)) {
		if (!values) continue

		if (Array.isArray(values)) {
			for (const value of values) {
				headers.append(key, value)
			}
			continue
		}

		headers.set(key, values)
	}
	return headers
}

function createRemixRequest(req: ExpressRequest, res: ExpressResponse) {
	const [, forwardedPortString] = req.get('X-Forwarded-Host')?.split(':') ?? []
	const [, hostPortString] = req.get('host')?.split(':') ?? []
	const forwardedPort = Number.parseInt(forwardedPortString ?? '', 10)
	const hostPort = Number.parseInt(hostPortString ?? '', 10)
	const port = Number.isSafeInteger(forwardedPort)
		? forwardedPort
		: Number.isSafeInteger(hostPort)
			? hostPort
			: ''
	const resolvedHost = `${req.hostname}${port ? `:${port}` : ''}`
	const url = new URL(`${req.protocol}://${resolvedHost}${req.originalUrl}`)
	let controller: AbortController | null = new AbortController()
	const init: RequestInit & { duplex?: 'half' } = {
		method: req.method,
		headers: createRemixHeaders(req.headers),
		signal: controller.signal,
	}

	res.on('finish', () => {
		controller = null
	})
	res.on('close', () => {
		controller?.abort()
	})

	if (req.method !== 'GET' && req.method !== 'HEAD') {
		init.body = createReadableStreamFromReadable(req)
		init.duplex = 'half'
	}

	return new Request(url.href, init)
}

async function sendResponse(
	res: ExpressResponse,
	response: globalThis.Response,
) {
	res.statusMessage = response.statusText
	res.status(response.status)

	for (const [key, value] of response.headers.entries()) {
		if (key.toLowerCase() === 'set-cookie') continue
		res.append(key, value)
	}
	for (const cookie of getSetCookieHeaders(response.headers)) {
		res.append('Set-Cookie', cookie)
	}

	const contentType = response.headers.get('content-type')
	const shouldVaryOnAccept =
		response.ok && Boolean(contentType?.match(/\btext\/(html|markdown)\b/i))
	if (shouldVaryOnAccept) {
		res.vary('Accept')
	}

	if (response.headers.get('content-type')?.match(/text\/event-stream/i)) {
		res.flushHeaders()
	}

	if (response.body) {
		await writeReadableStreamToWritable(response.body, res)
		return
	}

	res.end()
}

function getSetCookieHeaders(headers: Headers) {
	return typeof headers.getSetCookie === 'function'
		? headers.getSetCookie()
		: []
}

function createRequestHandlerWithMarkdown({
	build,
	getLoadContext,
	mode = process.env.NODE_ENV,
}: {
	build: ServerBuild | (() => ServerBuild | Promise<ServerBuild>)
	getLoadContext?: GetLoadContextFunction
	mode?: string
}): ExpressRequestHandler {
	const handleRequest = createReactRouterRequestHandler(build, mode)

	return async (
		req: ExpressRequest,
		res: ExpressResponse,
		next: NextFunction,
	) => {
		try {
			if (handleOptionsPreflight(req, res)) return

			const request = createRemixRequest(req, res)
			const loadContext = await getLoadContext?.(req, res)
			let response = await handleRequest(request, loadContext)

			if (requestPrefersMarkdown(req.accepts.bind(req))) {
				response = await maybeConvertHtmlResponseToMarkdown(response)
			}

			await sendResponse(res, response)
		} catch (error) {
			next(error)
		}
	}
}

export { createRequestHandlerWithMarkdown, getSetCookieHeaders }
