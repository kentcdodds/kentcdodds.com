// maybe this'll get built-into the SDK: https://github.com/modelcontextprotocol/typescript-sdk/issues/260
import { type Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import {
	type JSONRPCMessage,
	JSONRPCMessageSchema,
} from '@modelcontextprotocol/sdk/types.js'

/**
 * Server transport for SSE using Standard Fetch: this will send messages over
 * an SSE connection and receive messages from HTTP POST requests.
 */
export class FetchSSEServerTransport implements Transport {
	#stream?: ReadableStreamDefaultController<string>
	#sessionId: string
	#endpoint: string

	onclose?: () => void
	onerror?: (error: Error) => void
	onmessage?: (message: JSONRPCMessage) => void

	/**
	 * Creates a new SSE server transport, which will direct the client to POST
	 * messages to the relative or absolute URL identified by `endpoint`.
	 */
	constructor(endpoint: string, sessionId?: string | null) {
		this.#endpoint = endpoint
		this.#sessionId = sessionId ?? crypto.randomUUID()
	}

	/**
	 * Starts processing messages on the transport.
	 * This is called by the Server class and should not be called directly.
	 */
	async start(): Promise<void> {
		if (this.#stream) {
			throw new Error(
				'FetchSSEServerTransport already started! If using Server class, note that connect() calls start() automatically.',
			)
		}
	}

	/**
	 * Handles the initial SSE connection request.
	 * This should be called from your Remix loader to establish the SSE stream.
	 */
	async handleSSERequest(request: Request): Promise<Response> {
		const stream = new ReadableStream<string>({
			start: (controller) => {
				this.#stream = controller

				// Send headers
				controller.enqueue(': ping\n\n') // Keep connection alive

				// Send the endpoint event
				controller.enqueue(
					`event: endpoint\ndata: ${encodeURI(
						this.#endpoint,
					)}?sessionId=${this.#sessionId}\n\n`,
				)

				// Handle cleanup when the connection closes
				request.signal.addEventListener('abort', () => {
					controller.close()
					this.#stream = undefined
					this.onclose?.()
				})
			},
			cancel: () => {
				this.#stream = undefined
				this.onclose?.()
			},
		})

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'Mcp-Session-Id': this.#sessionId,
			},
		})
	}

	/**
	 * Handles incoming POST messages.
	 * This should be called from your Remix action to handle incoming messages.
	 */
	async handlePostMessage(request: Request): Promise<Response> {
		if (!this.#stream) {
			const message = 'SSE connection not established'
			return new Response(message, { status: 500 })
		}

		let body: unknown
		try {
			const contentType = request.headers.get('content-type')
			if (contentType !== 'application/json') {
				throw new Error(`Unsupported content-type: ${contentType}`)
			}

			body = await request.json()
		} catch (error) {
			this.onerror?.(error as Error)
			return new Response(String(error), { status: 400 })
		}

		try {
			await this.handleMessage(body)
		} catch (error) {
			console.error(error)
			return new Response(`Invalid message: ${body}`, { status: 400 })
		}

		return new Response('Accepted', { status: 202 })
	}

	/**
	 * Handle a client message, regardless of how it arrived.
	 */
	async handleMessage(message: unknown): Promise<void> {
		let parsedMessage: JSONRPCMessage
		try {
			parsedMessage = JSONRPCMessageSchema.parse(message)
		} catch (error) {
			this.onerror?.(error as Error)
			throw error
		}

		this.onmessage?.(parsedMessage)
	}

	async close(): Promise<void> {
		this.#stream?.close()
		this.#stream = undefined
		this.onclose?.()
	}

	async send(message: JSONRPCMessage): Promise<void> {
		if (!this.#stream) {
			throw new Error('Not connected')
		}

		// Send the message through the event stream
		this.#stream.enqueue(`event: message\ndata: ${JSON.stringify(message)}\n\n`)
	}

	/**
	 * Returns the session ID for this transport.
	 * This can be used to route incoming POST requests.
	 */
	get sessionId(): string {
		return this.#sessionId
	}
}
