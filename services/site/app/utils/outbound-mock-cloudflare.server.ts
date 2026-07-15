import { createHash, randomUUID } from 'node:crypto'
import {
	handleCallKentAudioProcessorEvent,
	type CallKentAudioProcessorEvent,
} from './call-kent-audio-processor-callback.server.ts'
import {
	getAudioBuffer,
	putEpisodeDraftAudioFromBuffer,
	putEpisodeDraftCallerSegmentAudioFromBuffer,
	putEpisodeDraftResponseSegmentAudioFromBuffer,
} from './call-kent-audio-storage.server.ts'

const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4'

type CloudflareApiEnvelope<T> = {
	success: boolean
	errors: Array<{ code: number; message: string }>
	messages: Array<{ code: number; message: string }>
	result: T
}

type CallKentQueueEnvelope = {
	content_type?: string
	body?: {
		draftId?: string
		callAudioKey?: string
		responseAudioKey?: string
	}
}

function jsonOk<T>(result: T, init?: { status?: number }) {
	const body: CloudflareApiEnvelope<T> = {
		success: true,
		errors: [],
		messages: [],
		result,
	}
	return Response.json(body, { status: init?.status ?? 200 })
}

function jsonError(status: number, message: string, code = 10000) {
	const body: CloudflareApiEnvelope<null> = {
		success: false,
		errors: [{ code, message }],
		messages: [],
		result: null,
	}
	return Response.json(body, { status })
}

function getBearerToken(request: Request) {
	const raw = request.headers.get('authorization') ?? ''
	const match = /^\s*bearer\s+(?<token>.+?)\s*$/iu.exec(raw)
	const token = match?.groups?.token?.trim()
	return token || null
}

function shouldMockCloudflare(request: Request) {
	const token = getBearerToken(request)
	return Boolean(token && token.startsWith('MOCK'))
}

function clamp(n: number, min: number, max: number) {
	return Math.min(max, Math.max(min, n))
}

function concatUint8Arrays(parts: Array<Uint8Array>) {
	const total = parts.reduce((sum, part) => sum + part.length, 0)
	const out = new Uint8Array(total)
	let offset = 0
	for (const part of parts) {
		out.set(part, offset)
		offset += part.length
	}
	return out
}

function modelFromWorkersAiGatewayPathname(pathname: string) {
	const marker = '/workers-ai/'
	const index = pathname.indexOf(marker)
	if (index === -1) return null
	const raw = pathname.slice(index + marker.length)
	if (!raw) return null
	// `raw` may include slashes (e.g. @cf/google/embeddinggemma-300m) or be a
	// single encoded segment.
	return decodeURIComponent(raw)
}

function makePcm16SineWaveWav({
	durationSeconds,
	frequencyHz,
	sampleRate = 8000,
	amplitude = 0.25,
}: {
	durationSeconds: number
	frequencyHz: number
	sampleRate?: number
	amplitude?: number
}) {
	const safeDuration = clamp(durationSeconds, 0.25, 30)
	const numSamples = Math.floor(safeDuration * sampleRate)
	const bytesPerSample = 2
	const dataSize = numSamples * bytesPerSample
	const buffer = new ArrayBuffer(44 + dataSize)
	const view = new DataView(buffer)
	const writeString = (offset: number, value: string) => {
		for (let i = 0; i < value.length; i++) {
			view.setUint8(offset + i, value.charCodeAt(i))
		}
	}
	writeString(0, 'RIFF')
	view.setUint32(4, 36 + dataSize, true)
	writeString(8, 'WAVE')
	writeString(12, 'fmt ')
	view.setUint32(16, 16, true)
	view.setUint16(20, 1, true)
	view.setUint16(22, 1, true)
	view.setUint32(24, sampleRate, true)
	view.setUint32(28, sampleRate * bytesPerSample, true)
	view.setUint16(32, bytesPerSample, true)
	view.setUint16(34, 16, true)
	writeString(36, 'data')
	view.setUint32(40, dataSize, true)
	const twoPiF = 2 * Math.PI * frequencyHz
	const scale = Math.max(0, Math.min(1, amplitude)) * 32_767
	for (let i = 0; i < numSamples; i++) {
		const t = i / sampleRate
		const sample = Math.round(Math.sin(twoPiF * t) * scale)
		view.setInt16(44 + i * 2, sample, true)
	}
	return new Uint8Array(buffer)
}

function frequencyFromSpeakerAndText(speaker: string, text: string) {
	const hash = createHash('sha256')
		.update(`${speaker}:${text.slice(0, 64)}`, 'utf8')
		.digest()
	const byte = hash[0] ?? 0
	// 220Hz..880Hz
	return 220 + Math.round((byte / 255) * 660)
}

function isCallKentQueueMessage(value: unknown): value is {
	draftId: string
	callAudioKey: string
	responseAudioKey: string
} {
	if (!value || typeof value !== 'object') return false
	const candidate = value as {
		draftId?: unknown
		callAudioKey?: unknown
		responseAudioKey?: unknown
	}
	return (
		typeof candidate.draftId === 'string' &&
		candidate.draftId.length > 0 &&
		typeof candidate.callAudioKey === 'string' &&
		candidate.callAudioKey.length > 0 &&
		typeof candidate.responseAudioKey === 'string' &&
		candidate.responseAudioKey.length > 0
	)
}

function isEmbeddingsRequestBody(body: Record<string, unknown> | null) {
	return Array.isArray(body?.text)
}

async function dispatchCallKentAudioProcessorEvent(
	event: CallKentAudioProcessorEvent,
) {
	// Dev workerd cannot await nested localhost callback POSTs during queue enqueue
	// (same-isolate deadlock). Mirror production mocks by dispatching in-process instead.
	await handleCallKentAudioProcessorEvent(event)
}

async function processCallKentAudioQueueMessage({
	draftId,
	callAudioKey,
	responseAudioKey,
}: {
	draftId: string
	callAudioKey: string
	responseAudioKey: string
}) {
	try {
		await dispatchCallKentAudioProcessorEvent({
			type: 'audio_generation_started',
			draftId,
			attempt: 1,
		})
		const [callAudio, responseAudio] = await Promise.all([
			getAudioBuffer({ key: callAudioKey }),
			getAudioBuffer({ key: responseAudioKey }),
		])
		const episodeAudio = concatUint8Arrays([callAudio, responseAudio])
		const [episodeStored, callerStored, responseStored] = await Promise.all([
			putEpisodeDraftAudioFromBuffer({ draftId, mp3: episodeAudio }),
			putEpisodeDraftCallerSegmentAudioFromBuffer({ draftId, mp3: callAudio }),
			putEpisodeDraftResponseSegmentAudioFromBuffer({
				draftId,
				mp3: responseAudio,
			}),
		])
		await dispatchCallKentAudioProcessorEvent({
			type: 'audio_generation_completed',
			draftId,
			episodeAudioKey: episodeStored.key,
			episodeAudioContentType: episodeStored.contentType,
			episodeAudioSize: episodeStored.size,
			callerSegmentAudioKey: callerStored.key,
			responseSegmentAudioKey: responseStored.key,
			attempt: 1,
		})
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error)
		await dispatchCallKentAudioProcessorEvent({
			type: 'audio_generation_failed',
			draftId,
			errorMessage: message,
			attempt: 1,
		})
	}
}

async function handleWorkersAiGateway(request: Request, url: URL) {
	if (!shouldMockCloudflare(request)) return null
	if (request.method !== 'POST') return null

	const model =
		modelFromWorkersAiGatewayPathname(url.pathname) ?? 'unknown-model'
	const contentType = (request.headers.get('content-type') ?? '').toLowerCase()

	// Transcription requests in-app are raw MP3 bytes (`audio/mpeg`).
	if (contentType.includes('audio/')) {
		return jsonOk({
			text: `Mock transcription (${model}): hello from Workers AI.`,
		})
	}

	let body: Record<string, unknown> | null = null
	try {
		body = (await request.json()) as Record<string, unknown>
	} catch {
		body = null
	}

	const lowerModel = model.toLowerCase()

	// Text-to-speech (e.g. @cf/deepgram/aura-2-en, @cf/myshell-ai/melotts).
	if (
		lowerModel.includes('deepgram/aura') ||
		lowerModel.includes('aura-') ||
		lowerModel.includes('melotts') ||
		lowerModel.includes('text-to-speech') ||
		lowerModel.includes('text_to_speech')
	) {
		const text =
			typeof body?.text === 'string'
				? body.text
				: typeof body?.prompt === 'string'
					? body.prompt
					: ''
		if (!text.trim()) {
			return jsonError(
				400,
				`Mock Workers AI expected JSON body { text: string } for TTS (model: ${model}).`,
				10001,
			)
		}
		const speaker =
			typeof body?.speaker === 'string' && body.speaker.trim()
				? body.speaker.trim()
				: 'luna'
		const frequencyHz = frequencyFromSpeakerAndText(speaker, text)
		const wav = makePcm16SineWaveWav({
			durationSeconds: 6,
			frequencyHz,
		})
		return new Response(wav, {
			status: 200,
			headers: {
				'Content-Type': 'audio/wav',
				'Cache-Control': 'no-store',
			},
		})
	}

	// Text generation / chat models (used for Call Kent metadata generation).
	const messagesRaw = body?.messages
	const hasMessages = Array.isArray(messagesRaw) && messagesRaw.length > 0
	const promptRaw = body?.prompt
	const hasPrompt = typeof promptRaw === 'string' && promptRaw.trim().length > 0
	if (hasMessages || hasPrompt) {
		const startMarker = '<<<TRANSCRIPT>>>'
		const endMarker = '<<<END TRANSCRIPT>>>'
		const messagesText = hasMessages
			? (messagesRaw as Array<{ content?: unknown }>)
					.map((entry) =>
						typeof entry?.content === 'string' ? entry.content : '',
					)
					.filter(Boolean)
					.join('\n\n')
			: ''
		const promptText = hasPrompt ? String(promptRaw) : ''
		const combined = `${messagesText}\n\n${promptText}`.trim()
		const startIdx = combined.indexOf(startMarker)
		const endIdx =
			startIdx === -1
				? -1
				: combined.indexOf(endMarker, startIdx + startMarker.length)
		if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
			const transcript = combined
				.slice(startIdx + startMarker.length, endIdx)
				.trim()
			const formatted = transcript
				.replace(/\r\n/g, '\n')
				.replace(/\n{0,2}---\n{0,2}/g, '\n\n---\n\n')
				.replace(/([.!?])\s+(?=[A-Z0-9])/g, '$1\n\n')
				.replace(/\n{3,}/g, '\n\n')
				.trim()
			return jsonOk({ response: formatted })
		}

		return jsonOk({
			response: JSON.stringify({
				title: `Mock Call Kent episode title (${model})`,
				description:
					'Mock description generated by Workers AI. This is a placeholder used in local mocks.',
				keywords: 'call kent, mock, podcast, workers ai, transcript',
			}),
		})
	}

	// Embeddings ({ text: string[] }) stay in the MSW layer (vector-store coupling).
	// Return null so the MSW bridge can handle them; workerd leaves them unhandled.
	if (isEmbeddingsRequestBody(body)) return null

	return jsonError(
		400,
		`Mock Workers AI received unsupported request for model: ${model}`,
		10001,
	)
}

async function handleCloudflareQueue(request: Request, url: URL) {
	if (!shouldMockCloudflare(request)) return null
	if (request.method !== 'POST') return null
	if (
		!url.pathname.includes('/queues/') ||
		!url.pathname.endsWith('/messages')
	) {
		return null
	}

	let payload: CallKentQueueEnvelope | null = null
	try {
		payload = (await request.json()) as CallKentQueueEnvelope
	} catch {
		return jsonError(400, 'Invalid JSON body for Queue messages endpoint.')
	}

	const message = payload?.body
	if (
		payload?.content_type !== 'json' ||
		!message ||
		!isCallKentQueueMessage(message)
	) {
		return jsonError(
			400,
			'Expected queue message body with draftId, callAudioKey, and responseAudioKey.',
		)
	}

	// Await in-process so enqueue is deterministic for tests and workerd (same-isolate).
	await processCallKentAudioQueueMessage(message)

	return jsonOk({ message_id: randomUUID() })
}

export async function maybeHandleCloudflareMockFetch(request: Request) {
	const url = new URL(request.url)

	if (
		url.origin === CLOUDFLARE_API_BASE ||
		url.hostname === 'api.cloudflare.com'
	) {
		const queue = await handleCloudflareQueue(request, url)
		if (queue) return queue
	}

	if (url.hostname === 'gateway.ai.cloudflare.com') {
		return handleWorkersAiGateway(request, url)
	}

	return null
}
