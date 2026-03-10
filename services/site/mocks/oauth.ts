import net from 'node:net'
import {
	http,
	passthrough,
	type DefaultRequestMultipartBody,
	type HttpHandler,
} from 'msw'

export const oauthHandlers: Array<HttpHandler> = [
	// https://kcd-oauth-provider.kentcdodds.workers.dev/.well-known/oauth-authorization-server
	http.get<any, DefaultRequestMultipartBody>(
		'https://kcd-oauth-provider.kentcdodds.workers.dev/.well-known/oauth-authorization-server',
		async ({ request }) => {
			const localIsRunning = await isPortOpen('localhost', 8787)
			if (localIsRunning) {
				const newUrl = new URL(request.url)
				newUrl.protocol = 'http:'
				newUrl.host = 'localhost:8787'

				const clonedRequest = new Request(newUrl.toString(), request)
				const response = await fetch(clonedRequest)
				// Remove 'content-encoding' header if present
				const headers = new Headers(response.headers)
				headers.delete('content-encoding')

				// find/replace https://kcd-oauth-provider.kentcdodds.workers.dev/ with http://localhost:8787/ if local is running
				const body = await response.arrayBuffer()
				const text = new TextDecoder().decode(body)
				const newText = text.replaceAll(
					/https?:\/\/kcd-oauth-provider\.kentcdodds\.workers\.dev/g,
					'http://localhost:8787',
				)
				return new Response(newText, {
					status: response.status,
					headers,
				})
			}

			return passthrough()
		},
	),
	http.all<any, DefaultRequestMultipartBody>(
		'https://kcd-oauth-provider.kentcdodds.workers.dev/*',
		async ({ request }) => {
			const localIsRunning = await isPortOpen('localhost', 8787)

			if (localIsRunning) {
				const newUrl = new URL(request.url)
				newUrl.protocol = 'http:'
				newUrl.host = 'localhost:8787'

				const clonedRequest = new Request(newUrl.toString(), request)
				const response = await fetch(clonedRequest)

				// Remove 'content-encoding' header if present
				const headers = new Headers(response.headers)
				headers.delete('content-encoding')
				const body = await response.arrayBuffer()
				return new Response(body, {
					status: response.status,
					statusText: response.statusText,
					headers,
				})
			}

			return passthrough()
		},
	),
]

function isPortOpen(
	host: string,
	port: number,
	timeout = 500,
): Promise<boolean> {
	return new Promise((resolve) => {
		const socket = new net.Socket()

		const onError = () => {
			socket.destroy()
			resolve(false)
		}

		socket.setTimeout(timeout)
		socket.once('error', onError)
		socket.once('timeout', onError)

		socket.connect(port, host, () => {
			socket.end()
			resolve(true)
		})
	})
}
