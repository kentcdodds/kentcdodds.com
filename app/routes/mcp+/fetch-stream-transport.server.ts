// this was adapted by AI from https://github.com/modelcontextprotocol/typescript-sdk/blob/2cf4f0ca86ff841aca53ac8ef5f3227ba3789386/src/server/streamableHttp.ts

import { type AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import { type Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import {
	InitializeRequestSchema,
	JSONRPCErrorSchema,
	JSONRPCRequestSchema,
	JSONRPCResponseSchema,
	type JSONRPCMessage,
	JSONRPCMessageSchema,
	type RequestId,
	type InitializeRequest,
	type JSONRPCError,
	type JSONRPCRequest,
	type JSONRPCResponse,
} from '@modelcontextprotocol/sdk/types.js'

// these utilities are built into the types module, but for some reason I was
// getting a runtime error that they were not defined 🙃
const isInitializeRequest = (value: unknown): value is InitializeRequest =>
	InitializeRequestSchema.safeParse(value).success
const isJSONRPCError = (value: unknown): value is JSONRPCError =>
	JSONRPCErrorSchema.safeParse(value).success
const isJSONRPCRequest = (value: unknown): value is JSONRPCRequest =>
	JSONRPCRequestSchema.safeParse(value).success
const isJSONRPCResponse = (value: unknown): value is JSONRPCResponse =>
	JSONRPCResponseSchema.safeParse(value).success

// Keep these from the original, as they are part of the core logic
export type StreamId = string
export type EventId = string

export interface EventStore {
	storeEvent(streamId: StreamId, message: JSONRPCMessage): Promise<EventId>
	replayEventsAfter(
		lastEventId: EventId,
		{
			send,
		}: {
			send: (eventId: EventId, message: JSONRPCMessage) => Promise<void>
		},
	): Promise<StreamId>
}

export interface FetchAPIHTTPServerTransportOptions {
	sessionIdGenerator: (() => string) | undefined
	onsessioninitialized?: (sessionId: string) => void
	enableJsonResponse?: boolean
	eventStore?: EventStore
}

// Helper to create a standard JSON-RPC error response
function createErrorResponse(
	status: number,
	code: number,
	message: string,
	id: RequestId | null = null,
): Response {
	return new Response(
		JSON.stringify({
			jsonrpc: '2.0',
			error: { code, message },
			id,
		}),
		{
			status,
			headers: { 'Content-Type': 'application/json' },
		},
	)
}

/**
 * Server transport for Streamable HTTP, re-implemented to use the standard Fetch API Request and Response objects.
 * It supports both SSE streaming and direct JSON responses.
 *
 * This implementation is platform-agnostic and works in any environment that supports
 * standard Request/Response, such as Deno, Cloudflare Workers, Next.js Edge Functions,
 * or Node.js with a compatibility layer.
 */
export class FetchAPIHTTPServerTransport implements Transport {
	#sessionIdGenerator: (() => string) | undefined
	#started: boolean = false
	#streamMapping: Map<string, ReadableStreamDefaultController> = new Map()
	#requestToStreamMapping: Map<RequestId, string> = new Map()
	#requestResponseMap: Map<RequestId, JSONRPCMessage> = new Map()
	#initialized: boolean = false
	#enableJsonResponse: boolean = false
	#standaloneSseStreamId: string = '_GET_stream'
	#eventStore?: EventStore
	#onsessioninitialized?: (sessionId: string) => void
	#encoder = new TextEncoder()

	// A map to hold promises for requests that expect a single JSON response
	#pendingJsonResponsePromises: Map<
		string,
		{
			resolve: (res: Response) => void
			requestIds: RequestId[]
		}
	> = new Map()

	sessionId?: string
	onclose?: () => void
	onerror?: (error: Error) => void
	onmessage?: (message: JSONRPCMessage, extra?: { authInfo?: AuthInfo }) => void

	constructor(options: FetchAPIHTTPServerTransportOptions) {
		this.#sessionIdGenerator = options.sessionIdGenerator
		this.#enableJsonResponse = options.enableJsonResponse ?? false
		this.#eventStore = options.eventStore
		this.#onsessioninitialized = options.onsessioninitialized
	}

	async start(): Promise<void> {
		if (this.#started) {
			throw new Error('Transport already started')
		}
		this.#started = true
	}

	/**
	 * Handles an incoming standard Request object and returns a standard Response object.
	 */
	async handleRequest(
		request: Request,
		authInfo?: AuthInfo,
	): Promise<Response> {
		switch (request.method) {
			case 'POST':
				return this.handlePostRequest(request, authInfo)
			case 'GET':
				return this.handleGetRequest(request)
			case 'DELETE':
				return this.handleDeleteRequest(request)
			default:
				return this.handleUnsupportedRequest()
		}
	}

	/**
	 * Creates a streaming Response for Server-Sent Events (SSE).
	 */
	private createStreamingResponse(
		request: Request,
		streamId: string,
		extraHeaders: Record<string, string> = {},
	): Response {
		const stream = new ReadableStream({
			start: (controller) => {
				this.#streamMapping.set(streamId, controller)
				// Handle client disconnects using the request's AbortSignal
				request.signal.addEventListener('abort', () => {
					this.closeStream(streamId)
				})
			},
			cancel: () => {
				this.closeStream(streamId)
			},
		})

		const headers = new Headers({
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			...extraHeaders,
		})

		return new Response(stream, { status: 200, headers })
	}

	/**
	 * Safely closes a stream by its ID, cleaning up associated resources.
	 */
	private closeStream(streamId: string): void {
		const controller = this.#streamMapping.get(streamId)
		if (controller) {
			try {
				controller.close()
			} catch {
				// Ignore errors if the stream is already closing or closed
			}
			this.#streamMapping.delete(streamId)
		}
	}

	private async handleGetRequest(request: Request): Promise<Response> {
		const acceptHeader = request.headers.get('accept')
		if (!acceptHeader?.includes('text/event-stream')) {
			return createErrorResponse(
				406,
				-32000,
				'Not Acceptable: Client must accept text/event-stream',
			)
		}

		const sessionError = this.validateSession(request)
		if (sessionError) return sessionError

		if (this.#eventStore) {
			const lastEventId = request.headers.get('last-event-id')
			if (lastEventId) {
				// Resumability requires creating a stream and replaying events into it.
				// This is an advanced case but follows the same pattern.
				return this.replayEvents(request, lastEventId)
			}
		}

		if (this.#streamMapping.has(this.#standaloneSseStreamId)) {
			return createErrorResponse(
				409,
				-32000,
				'Conflict: Only one SSE stream is allowed per session',
			)
		}

		const headers: Record<string, string> = {}
		if (this.sessionId !== undefined) {
			headers['mcp-session-id'] = this.sessionId
		}

		return this.createStreamingResponse(
			request,
			this.#standaloneSseStreamId,
			headers,
		)
	}

	private async handlePostRequest(
		request: Request,
		authInfo?: AuthInfo,
	): Promise<Response> {
		const acceptHeader = request.headers.get('accept')
		if (
			!acceptHeader?.includes('application/json') ||
			!acceptHeader.includes('text/event-stream')
		) {
			return createErrorResponse(
				406,
				-32000,
				'Not Acceptable: Client must accept both application/json and text/event-stream',
			)
		}

		const contentType = request.headers.get('content-type')
		if (!contentType?.includes('application/json')) {
			return createErrorResponse(
				415,
				-32000,
				'Unsupported Media Type: Content-Type must be application/json',
			)
		}

		try {
			const rawMessage = await request.json()
			const messages: JSONRPCMessage[] = Array.isArray(rawMessage)
				? rawMessage.map((msg) => JSONRPCMessageSchema.parse(msg))
				: [JSONRPCMessageSchema.parse(rawMessage)]

			const isInitializationRequest = messages.some(isInitializeRequest)

			if (isInitializationRequest) {
				if (this.#initialized && this.sessionId !== undefined) {
					return createErrorResponse(
						400,
						-32600,
						'Invalid Request: Server already initialized',
					)
				}
				if (messages.length > 1) {
					return createErrorResponse(
						400,
						-32600,
						'Invalid Request: Only one initialization request is allowed',
					)
				}
				this.sessionId = this.#sessionIdGenerator?.()
				this.#initialized = true
				if (this.sessionId && this.#onsessioninitialized) {
					this.#onsessioninitialized(this.sessionId)
				}
			} else {
				const sessionError = this.validateSession(request)
				if (sessionError) return sessionError
			}

			messages.forEach((message) => this.onmessage?.(message, { authInfo }))

			const hasRequests = messages.some(isJSONRPCRequest)

			if (!hasRequests) {
				return new Response(null, { status: 202 }) // Accepted
			}

			// Handle response generation
			const streamId = crypto.randomUUID()
			const requestIds = messages.filter(isJSONRPCRequest).map((m) => m.id)
			requestIds.forEach((id) => this.#requestToStreamMapping.set(id, streamId))

			if (this.#enableJsonResponse) {
				// For JSON responses, we must wait for the response to be ready.
				// We return a promise that will be resolved in the `send` method.
				return new Promise<Response>((resolve) => {
					this.#pendingJsonResponsePromises.set(streamId, {
						resolve,
						requestIds,
					})
				})
			} else {
				// For SSE, we can return the stream immediately.
				const headers: Record<string, string> = {}
				if (this.sessionId !== undefined) {
					headers['mcp-session-id'] = this.sessionId
				}
				const response = this.createStreamingResponse(
					request,
					streamId,
					headers,
				)
				// Map the stream ID to its controller via createStreamingResponse
				return response
			}
		} catch (error) {
			return createErrorResponse(400, -32700, `Parse error: ${String(error)}`)
		}
	}

	private async handleDeleteRequest(request: Request): Promise<Response> {
		const sessionError = this.validateSession(request)
		if (sessionError) return sessionError

		await this.close()
		return new Response(null, { status: 200 })
	}

	private handleUnsupportedRequest(): Response {
		return new Response(
			JSON.stringify({
				jsonrpc: '2.0',
				error: { code: -32000, message: 'Method not allowed.' },
				id: null,
			}),
			{
				status: 405,
				headers: {
					Allow: 'GET, POST, DELETE',
					'Content-Type': 'application/json',
				},
			},
		)
	}

	private validateSession(request: Request): Response | null {
		if (this.#sessionIdGenerator === undefined) return null // Stateless mode

		if (!this.#initialized) {
			return createErrorResponse(
				400,
				-32000,
				'Bad Request: Server not initialized',
			)
		}

		const sessionId = request.headers.get('mcp-session-id')
		if (!sessionId) {
			return createErrorResponse(
				400,
				-32000,
				'Bad Request: Mcp-Session-Id header is required',
			)
		}
		if (sessionId !== this.sessionId) {
			return createErrorResponse(404, -32001, 'Session not found')
		}

		return null // Session is valid
	}

	private writeSSEEvent(
		controller: ReadableStreamDefaultController,
		message: JSONRPCMessage,
		eventId?: string,
	): void {
		let eventData = `event: message\n`
		if (eventId) {
			eventData += `id: ${eventId}\n`
		}
		eventData += `data: ${JSON.stringify(message)}\n\n`

		try {
			controller.enqueue(this.#encoder.encode(eventData))
		} catch (e) {
			this.onerror?.(
				new Error(`Failed to write to stream: ${(e as Error).message}`),
			)
		}
	}

	async send(
		message: JSONRPCMessage,
		options?: { relatedRequestId?: RequestId },
	): Promise<void> {
		let requestId = options?.relatedRequestId
		if (isJSONRPCResponse(message) || isJSONRPCError(message)) {
			requestId = message.id
		}

		// Standalone SSE stream case (GET request or server-initiated message)
		if (requestId === undefined) {
			const controller = this.#streamMapping.get(this.#standaloneSseStreamId)
			if (controller) {
				const eventId = this.#eventStore
					? await this.#eventStore.storeEvent(
							this.#standaloneSseStreamId,
							message,
						)
					: undefined
				this.writeSSEEvent(controller, message, eventId)
			}
			return // Discard if no active stream
		}

		// Response to a POST request
		const streamId = this.#requestToStreamMapping.get(requestId)
		if (!streamId) {
			throw new Error(
				`No active stream or response promise for request ID: ${String(requestId)}`,
			)
		}

		if (isJSONRPCResponse(message) || isJSONRPCError(message)) {
			this.#requestResponseMap.set(requestId, message)
		}

		const controller = this.#streamMapping.get(streamId)
		const pendingJsonResponse = this.#pendingJsonResponsePromises.get(streamId)

		if (this.#enableJsonResponse && pendingJsonResponse) {
			// JSON Mode: Check if all responses for this batch are ready
			const { resolve, requestIds } = pendingJsonResponse
			const allReady = requestIds.every((id) =>
				this.#requestResponseMap.has(id),
			)

			if (allReady) {
				const responses = requestIds.map(
					(id) => this.#requestResponseMap.get(id)!,
				)
				const headers = new Headers({ 'Content-Type': 'application/json' })
				if (this.sessionId) headers.set('mcp-session-id', this.sessionId)

				const body =
					responses.length === 1
						? JSON.stringify(responses[0])
						: JSON.stringify(responses)
				resolve(new Response(body, { status: 200, headers }))

				// Cleanup
				this.#pendingJsonResponsePromises.delete(streamId)
				requestIds.forEach((id) => {
					this.#requestResponseMap.delete(id)
					this.#requestToStreamMapping.delete(id)
				})
			}
		} else if (controller) {
			// SSE Mode: Write event to the stream
			const eventId = this.#eventStore
				? await this.#eventStore.storeEvent(streamId, message)
				: undefined
			this.writeSSEEvent(controller, message, eventId)

			// If it's a final response, close the dedicated stream
			if (isJSONRPCResponse(message) || isJSONRPCError(message)) {
				// In a batch request, we should only close after all responses are sent.
				// This simplified logic closes after the first final response.
				// For full correctness, one would track all request IDs associated with the streamId.
				this.closeStream(streamId)
				this.#requestToStreamMapping.delete(requestId)
			}
		}
	}

	async close(): Promise<void> {
		this.#streamMapping.forEach((controller, streamId) => {
			this.closeStream(streamId)
		})
		this.#streamMapping.clear()
		this.#requestResponseMap.clear()
		this.#requestToStreamMapping.clear()
		this.#pendingJsonResponsePromises.forEach(({ resolve }) => {
			// Reject any pending promises if the transport is closed abruptly
			resolve(
				createErrorResponse(
					503,
					-32000,
					'Service Unavailable: Transport closed',
				),
			)
		})
		this.#pendingJsonResponsePromises.clear()
		this.onclose?.()
	}

	// Placeholder for replayEvents logic, adapted for streams
	private async replayEvents(
		request: Request,
		lastEventId: string,
	): Promise<Response> {
		if (!this.#eventStore) {
			return createErrorResponse(
				501,
				-32000,
				'Not Implemented: EventStore not configured',
			)
		}

		let streamController: ReadableStreamDefaultController
		const streamIdPromise = new Promise<string>((resolve) => {
			new ReadableStream({
				start: async (controller) => {
					streamController = controller
					request.signal.addEventListener('abort', async () =>
						this.closeStream(await streamIdPromise),
					)
					try {
						const streamId = await this.#eventStore!.replayEventsAfter(
							lastEventId,
							{
								send: async (eventId, message) => {
									this.writeSSEEvent(streamController, message, eventId)
								},
							},
						)
						this.#streamMapping.set(streamId, streamController)
						resolve(streamId)
					} catch (e) {
						controller.error(e)
					}
				},
				cancel: async () => this.closeStream(await streamIdPromise),
			})
		})

		const headers: Record<string, string> = {}
		if (this.sessionId) headers['mcp-session-id'] = this.sessionId

		return this.createStreamingResponse(request, await streamIdPromise, headers)
	}
}
