import * as Sentry from '@sentry/react-router'
import chalk from 'chalk'
import { isbot } from 'isbot'
import { renderToReadableStream } from 'react-dom/server'
import {
	ServerRouter,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	type HandleDocumentRequestFunction,
} from 'react-router'
import { routes as otherRoutes } from './other-routes.server.ts'
import { getEnv, getPublicEnv, init } from './utils/env.server.ts'
import { NonceProvider } from './utils/nonce-provider.ts'

init()
global.ENV = getPublicEnv()

const ABORT_DELAY = 5000

type DocRequestArgs = Parameters<HandleDocumentRequestFunction>

export default async function handleDocumentRequest(...args: DocRequestArgs) {
	const [
		request,
		responseStatusCode,
		responseHeaders,
		reactRouterContext,
		loadContext,
	] = args
	const env = getEnv()

	for (const handler of otherRoutes) {
		const otherRouteResponse = await handler(request, reactRouterContext)
		if (otherRouteResponse) return otherRouteResponse
	}

	if (env.NODE_ENV !== 'production') {
		responseHeaders.set('Cache-Control', 'no-store')
	}

	if (env.NODE_ENV === 'production' && env.SENTRY_DSN) {
		responseHeaders.append('Document-Policy', 'js-profiling')
	}

	const mediaOrigin = getUrlOrigin(env.CLOUDINARY_BASE_URL)
	if (mediaOrigin) {
		responseHeaders.append('Link', `<${mediaOrigin}>; rel="preconnect"`)
	}

	// If the request is from a bot, we want to wait for the full
	// response to render before sending it to the client. This
	// ensures that bots can see the full page content.
	if (isbot(request.headers.get('user-agent'))) {
		return serveTheBots(
			request,
			responseStatusCode,
			responseHeaders,
			reactRouterContext,
			loadContext,
		)
	}

	return serveBrowsers(
		request,
		responseStatusCode,
		responseHeaders,
		reactRouterContext,
		loadContext,
	)
}

function serveTheBots(...args: DocRequestArgs) {
	const [
		request,
		responseStatusCode,
		responseHeaders,
		reactRouterContext,
		loadContext,
	] = args
	const nonce = loadContext.cspNonce ? String(loadContext.cspNonce) : ''
	return renderDocumentResponse({
		request,
		responseStatusCode,
		responseHeaders,
		reactRouterContext,
		nonce,
		waitForAllReady: true,
	})
}

function serveBrowsers(...args: DocRequestArgs) {
	const [
		request,
		responseStatusCode,
		responseHeaders,
		reactRouterContext,
		loadContext,
	] = args
	const nonce = loadContext.cspNonce ? String(loadContext.cspNonce) : ''
	return renderDocumentResponse({
		request,
		responseStatusCode,
		responseHeaders,
		reactRouterContext,
		nonce,
		waitForAllReady: false,
	})
}

export async function handleDataRequest(response: Response) {
	return response
}

export function handleError(
	error: unknown,
	{ request }: LoaderFunctionArgs | ActionFunctionArgs,
): void {
	// Skip capturing if the request is aborted as Remix docs suggest
	// Ref: https://remix.run/docs/en/main/file-conventions/entry.server#handleerror
	if (request.signal.aborted) {
		return
	}
	if (error instanceof Error) {
		console.error(chalk.red(error.stack))
		Sentry.captureException(error)
	} else {
		console.error(chalk.red(error))
		Sentry.captureException(error)
	}
}

async function renderDocumentResponse({
	request,
	responseStatusCode,
	responseHeaders,
	reactRouterContext,
	nonce,
	waitForAllReady,
}: {
	request: Request
	responseStatusCode: number
	responseHeaders: Headers
	reactRouterContext: Parameters<typeof ServerRouter>[0]['context']
	nonce: string
	waitForAllReady: boolean
}) {
	let didError = false
	const abortController = new AbortController()
	const stream = await renderToReadableStream(
		<NonceProvider value={nonce}>
			<ServerRouter context={reactRouterContext} url={request.url} nonce={nonce} />
		</NonceProvider>,
		{
			nonce,
			signal: abortController.signal,
			onError(error: unknown) {
				didError = true
				console.error(error)
			},
		},
	)
	setTimeout(() => abortController.abort(), ABORT_DELAY)

	if (waitForAllReady) {
		await stream.allReady
	}

	responseHeaders.set('Content-Type', 'text/html; charset=UTF-8')
	const transformedBody = stream.pipeThrough(createNonceTransformStream(nonce))
	return new Response(transformedBody, {
		status: waitForAllReady ? responseStatusCode : didError ? 500 : responseStatusCode,
		headers: responseHeaders,
	})
}

function getUrlOrigin(urlString: string) {
	try {
		return new URL(urlString).origin
	} catch {
		return null
	}
}

function createNonceTransformStream(nonce: string) {
	const encoder = new TextEncoder()
	const decoder = new TextDecoder()
	return new TransformStream<Uint8Array, Uint8Array>({
		transform(chunk, controller) {
			const text = decoder.decode(chunk, { stream: true })
			const replaced = text.replace(/data-evt-/g, `nonce="${nonce}" `)
			controller.enqueue(encoder.encode(replaced))
		},
		flush(controller) {
			const text = decoder.decode()
			if (!text) return
			const replaced = text.replace(/data-evt-/g, `nonce="${nonce}" `)
			controller.enqueue(encoder.encode(replaced))
		},
	})
}
