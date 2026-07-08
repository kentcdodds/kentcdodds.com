import { randomUUID } from 'node:crypto'
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

function json(data: unknown, init?: ResponseInit) {
	return Response.json(data, init)
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

function concatUint8Arrays(parts: Uint8Array[]) {
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
	return decodeURIComponent(pathname.slice(index + marker.length))
}

function makePcm16SineWaveWav({
	durationSeconds,
	frequencyHz,
}: {
	durationSeconds: number
	frequencyHz: number
}) {
	const sampleRate = 16_000
	const numSamples = Math.floor(sampleRate * durationSeconds)
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
	for (let i = 0; i < numSamples; i++) {
		const t = i / sampleRate
		const sample = Math.sin(2 * Math.PI * frequencyHz * t) * 0.2
		view.setInt16(44 + i * 2, Math.floor(sample * 32_767), true)
	}
	return new Uint8Array(buffer)
}

async function dispatchCallKentAudioProcessorEvent(
	event: CallKentAudioProcessorEvent,
) {
	// Dev workerd cannot await nested localhost callback POSTs during queue enqueue
	// (same-isolate deadlock). Mirror MSW by dispatching in-process instead.
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

	if (contentType.includes('audio/')) {
		return json({
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
	if (
		lowerModel.includes('deepgram/aura') ||
		lowerModel.includes('aura-') ||
		lowerModel.includes('melotts')
	) {
		const text =
			typeof body?.text === 'string'
				? body.text
				: typeof body?.prompt === 'string'
					? body.prompt
					: ''
		if (!text.trim()) {
			return json(
				{
					success: false,
					errors: [
						{
							code: 10001,
							message: `Mock Workers AI expected JSON body { text: string } for TTS (model: ${model}).`,
						},
					],
				},
				{ status: 400 },
			)
		}
		const wav = makePcm16SineWaveWav({
			durationSeconds: 6,
			frequencyHz: 440,
		})
		return new Response(wav, {
			status: 200,
			headers: {
				'Content-Type': 'audio/wav',
				'Cache-Control': 'no-store',
			},
		})
	}

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
			return json({ response: formatted })
		}

		return json({
			response: JSON.stringify({
				title: `Mock Call Kent episode title (${model})`,
				description:
					'Mock description generated by Workers AI. This is a placeholder used in local mocks.',
				keywords: 'call kent, mock, podcast, workers ai, transcript',
			}),
		})
	}

	return json({
		success: false,
		errors: [
			{
				code: 10001,
				message: `Mock Workers AI received unsupported request for model: ${model}`,
			},
		],
	}, { status: 400 })
}

async function handleCloudflareQueue(request: Request, url: URL) {
	if (!shouldMockCloudflare(request)) return null
	if (request.method !== 'POST') return null
	if (!url.pathname.includes('/queues/') || !url.pathname.endsWith('/messages')) {
		return null
	}

	type QueuePayload = {
		content_type?: string
		body?: {
			draftId?: string
			callAudioKey?: string
			responseAudioKey?: string
		}
	}

	let payload: QueuePayload | null = null
	try {
		payload = (await request.json()) as QueuePayload
	} catch {
		return json({ success: false, errors: [{ code: 10001, message: 'Invalid JSON' }] }, { status: 400 })
	}

	const message = payload?.body
	if (
		payload?.content_type !== 'json' ||
		!message?.draftId ||
		!message.callAudioKey ||
		!message.responseAudioKey
	) {
		return json(
			{
				success: false,
				errors: [
					{
						code: 10001,
						message:
							'Expected queue message body with draftId, callAudioKey, and responseAudioKey.',
					},
				],
			},
			{ status: 400 },
		)
	}

	await processCallKentAudioQueueMessage({
		draftId: message.draftId!,
		callAudioKey: message.callAudioKey!,
		responseAudioKey: message.responseAudioKey!,
	})

	return json({ success: true, result: { message_id: randomUUID() } })
}

export async function maybeHandleCloudflareMockFetch(request: Request) {
	const url = new URL(request.url)

	if (url.origin === CLOUDFLARE_API_BASE || url.hostname === 'api.cloudflare.com') {
		const queue = await handleCloudflareQueue(request, url)
		if (queue) return queue
	}

	if (url.hostname === 'gateway.ai.cloudflare.com') {
		return handleWorkersAiGateway(request, url)
	}

	return null
}
