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
import {
	appendAgentDiscoveryHeaders,
	shouldAppendAgentDiscoveryHeaders,
} from '#app/utils/agent-discovery.ts'
import { ensurePrimary } from '#app/utils/litefs-js.server.ts'
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
	if (responseStatusCode >= 500) {
		// if we had an error, let's just send this over to the primary and see
		// if it can handle it.
		await ensurePrimary()
	}

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

	responseHeaders.append(
		'Link',
		'<https://res.cloudinary.com>; rel="preconnect"',
	)
	if (shouldAppendAgentDiscoveryHeaders(request)) {
		appendAgentDiscoveryHeaders(responseHeaders)
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

async function serveTheBots(...args: DocRequestArgs) {
	const [
		request,
		responseStatusCode,
		responseHeaders,
		reactRouterContext,
		loadContext,
	] = args
	const nonce = loadContext.cspNonce ? String(loadContext.cspNonce) : ''
	const { controller, clearAbortTimeout } = createAbortTimeout()
	let stream: Awaited<ReturnType<typeof renderToReadableStream>>
	try {
		stream = await renderToReadableStream(
			<NonceProvider value={nonce}>
				<ServerRouter
					context={reactRouterContext}
					url={request.url}
					nonce={nonce}
				/>
			</NonceProvider>,
			{ nonce, signal: controller.signal },
		)
		// Use allReady to wait for the entire document to be ready.
		await stream.allReady
	} catch (error) {
		Sentry.captureException(error)
		throw error
	} finally {
		clearAbortTimeout()
	}
	responseHeaders.set('Content-Type', 'text/html; charset=UTF-8')
	return new Response(transformDataEvtAttributes(stream, nonce), {
		status: responseStatusCode,
		headers: responseHeaders,
	})
}

async function serveBrowsers(...args: DocRequestArgs) {
	const [
		request,
		responseStatusCode,
		responseHeaders,
		reactRouterContext,
		loadContext,
	] = args
	const nonce = loadContext.cspNonce ? String(loadContext.cspNonce) : ''
	let didError = false
	const { controller, clearAbortTimeout } = createAbortTimeout()
	let stream: Awaited<ReturnType<typeof renderToReadableStream>>
	try {
		stream = await renderToReadableStream(
			<NonceProvider value={nonce}>
				<ServerRouter
					context={reactRouterContext}
					url={request.url}
					nonce={nonce}
				/>
			</NonceProvider>,
			{
				nonce,
				signal: controller.signal,
				onError(err: unknown) {
					didError = true
					console.error(err)
					Sentry.captureException(err)
				},
			},
		)
	} catch (error) {
		Sentry.captureException(error)
		throw error
	}
	responseHeaders.set('Content-Type', 'text/html; charset=UTF-8')
	return new Response(
		transformDataEvtAttributes(stream, nonce, clearAbortTimeout),
		{
			status: didError ? 500 : responseStatusCode,
			headers: responseHeaders,
		},
	)
}

function createAbortTimeout() {
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), ABORT_DELAY)
	return {
		controller,
		clearAbortTimeout() {
			clearTimeout(timeoutId)
		},
	}
}

function transformDataEvtAttributes(
	stream: ReadableStream,
	nonce: string,
	onDone?: () => void,
) {
	// React won't render the onload prop, which blurrable image marks as data-evt-*.
	return stream
		.pipeThrough(new TextDecoderStream())
		.pipeThrough(
			new TransformStream({
				transform(chunk: string, controller) {
					controller.enqueue(chunk.replace(/data-evt-/g, `nonce="${nonce}" `))
				},
				flush() {
					onDone?.()
				},
			}),
		)
		.pipeThrough(new TextEncoderStream())
}

export async function handleDataRequest(response: Response) {
	if (response.status >= 500) {
		await ensurePrimary()
	}

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
