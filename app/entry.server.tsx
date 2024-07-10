import { PassThrough, Transform } from 'stream'
import {
	ActionFunctionArgs,
	LoaderFunctionArgs,
	createReadableStreamFromReadable,
	type HandleDocumentRequestFunction,
} from '@remix-run/node'
import { RemixServer } from '@remix-run/react'
import * as Sentry from '@sentry/remix'
import { isbot } from 'isbot'
import { renderToPipeableStream } from 'react-dom/server'
import { routes as otherRoutes } from './other-routes.server.ts'
import { getEnv } from './utils/env.server.ts'
import { NonceProvider } from './utils/nonce-provider.ts'
import { ensurePrimary } from '~/utils/cjs/litefs-js.server.js'
import chalk from 'chalk'

global.ENV = getEnv()

const ABORT_DELAY = 5000

// NOTE: we've got a patch-package on Remix that adds the loadContext argument
// so we can access the cspNonce in the entry. Hopefully this gets supported:
// https://github.com/remix-run/remix/discussions/4603
type DocRequestArgs = Parameters<HandleDocumentRequestFunction>

export default async function handleDocumentRequest(...args: DocRequestArgs) {
	const [
		request,
		responseStatusCode,
		responseHeaders,
		remixContext,
		loadContext,
	] = args
	if (responseStatusCode >= 500) {
		// if we had an error, let's just send this over to the primary and see
		// if it can handle it.
		await ensurePrimary()
	}

	for (const handler of otherRoutes) {
		const otherRouteResponse = await handler(request, remixContext)
		if (otherRouteResponse) return otherRouteResponse
	}

	if (process.env.NODE_ENV !== 'production') {
		responseHeaders.set('Cache-Control', 'no-store')
	}

	if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
		responseHeaders.append('Document-Policy', 'js-profiling')
	}

	responseHeaders.append(
		'Link',
		'<https://res.cloudinary.com>; rel="preconnect"',
	)

	// If the request is from a bot, we want to wait for the full
	// response to render before sending it to the client. This
	// ensures that bots can see the full page content.
	if (isbot(request.headers.get('user-agent'))) {
		return serveTheBots(
			request,
			responseStatusCode,
			responseHeaders,
			remixContext,
			loadContext,
		)
	}

	return serveBrowsers(
		request,
		responseStatusCode,
		responseHeaders,
		remixContext,
		loadContext,
	)
}

function serveTheBots(...args: DocRequestArgs) {
	const [
		request,
		responseStatusCode,
		responseHeaders,
		remixContext,
		loadContext,
	] = args
	const nonce = loadContext.cspNonce ? String(loadContext.cspNonce) : ''
	return new Promise((resolve, reject) => {
		const stream = renderToPipeableStream(
			<NonceProvider value={nonce}>
				<RemixServer
					context={remixContext}
					url={request.url}
					abortDelay={ABORT_DELAY}
				/>
			</NonceProvider>,
			{
				nonce,
				// Use onAllReady to wait for the entire document to be ready
				onAllReady() {
					responseHeaders.set('Content-Type', 'text/html; charset=UTF-8')
					const body = new PassThrough()

					// find/replace all instances of the string "data-evt-" with ""
					// this is a bit of a hack because React won't render the "onload"
					// prop, which we use for blurrable image
					const dataEvtTransform = new Transform({
						transform(chunk, encoding, callback) {
							const string = chunk.toString()
							const replaced = string.replace(/data-evt-/g, `nonce="${nonce}" `)
							callback(null, replaced)
						},
					})

					stream.pipe(dataEvtTransform).pipe(body)
					resolve(
						new Response(createReadableStreamFromReadable(body), {
							status: responseStatusCode,
							headers: responseHeaders,
						}),
					)
				},
				onShellError(err: unknown) {
					reject(err)
				},
			},
		)
		setTimeout(() => stream.abort(), ABORT_DELAY)
	})
}

function serveBrowsers(...args: DocRequestArgs) {
	const [
		request,
		responseStatusCode,
		responseHeaders,
		remixContext,
		loadContext,
	] = args
	const nonce = loadContext.cspNonce ? String(loadContext.cspNonce) : ''
	return new Promise((resolve, reject) => {
		let didError = false
		const stream = renderToPipeableStream(
			<NonceProvider value={nonce}>
				<RemixServer
					context={remixContext}
					url={request.url}
					abortDelay={ABORT_DELAY}
				/>
			</NonceProvider>,
			{
				nonce,
				// use onShellReady to wait until a suspense boundary is triggered
				onShellReady() {
					responseHeaders.set('Content-Type', 'text/html; charset=UTF-8')
					const body = new PassThrough()

					// find/replace all instances of the string "data-evt-" with ""
					// this is a bit of a hack because React won't render the "onload"
					// prop, which we use for blurrable image
					const dataEvtTransform = new Transform({
						transform(chunk, encoding, callback) {
							const string = chunk.toString()
							const replaced = string.replace(/data-evt-/g, `nonce="${nonce}" `)
							callback(null, replaced)
						},
					})

					stream.pipe(dataEvtTransform).pipe(body)
					resolve(
						new Response(createReadableStreamFromReadable(body), {
							status: didError ? 500 : responseStatusCode,
							headers: responseHeaders,
						}),
					)
				},
				onShellError(err: unknown) {
					reject(err)
				},
				onError(err: unknown) {
					didError = true
					console.error(err)
				},
			},
		)
		setTimeout(() => stream.abort(), ABORT_DELAY)
	})
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
		Sentry.captureRemixServerException(error, 'remix.server', request, true)
	} else {
		console.error(chalk.red(error))
		Sentry.captureException(error)
	}
}
