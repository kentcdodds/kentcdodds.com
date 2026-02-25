import { prisma } from '#app/utils/prisma.server.ts'
import { requireAdminUser } from '#app/utils/session.server.ts'
import { type Route } from './+types/draft-status-stream'

const statusPollIntervalMs = 1500
const heartbeatIntervalMs = 20_000
const streamEncoder = new TextEncoder()

type DraftStatusPayload = {
	status: string
	step: string
	errorMessage: string | null
}

async function getDraftStatus(callId: string) {
	return prisma.callKentEpisodeDraft.findUnique({
		where: { callId },
		select: {
			status: true,
			step: true,
			errorMessage: true,
		},
	})
}

function toServerEventPayload(payload: DraftStatusPayload) {
	return streamEncoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
}

export async function loader({ request }: Route.LoaderArgs) {
	await requireAdminUser(request)
	const url = new URL(request.url)
	const callId = url.searchParams.get('callId')
	if (!callId) throw new Response('callId is required', { status: 400 })

	const initialStatus = await getDraftStatus(callId)
	if (!initialStatus) throw new Response('Not found', { status: 404 })

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			let isClosed = false
			let pollTimer: ReturnType<typeof setInterval> | null = null
			let heartbeatTimer: ReturnType<typeof setInterval> | null = null
			let lastSentStatus = ''

			const closeStream = () => {
				if (isClosed) return
				isClosed = true
				if (pollTimer) clearInterval(pollTimer)
				if (heartbeatTimer) clearInterval(heartbeatTimer)
				request.signal.removeEventListener('abort', closeStream)
				controller.close()
			}

			const pushStatus = (status: DraftStatusPayload) => {
				if (isClosed) return
				const serializedStatus = JSON.stringify(status)
				if (serializedStatus === lastSentStatus) return
				lastSentStatus = serializedStatus
				controller.enqueue(toServerEventPayload(status))
			}

			const publishStatus = async () => {
				if (isClosed) return
				const latestStatus = await getDraftStatus(callId)
				if (!latestStatus) {
					closeStream()
					return
				}
				pushStatus(latestStatus)
				if (latestStatus.status !== 'PROCESSING') {
					closeStream()
				}
			}

			pushStatus(initialStatus)
			if (initialStatus.status === 'PROCESSING') {
				pollTimer = setInterval(() => void publishStatus(), statusPollIntervalMs)
				heartbeatTimer = setInterval(() => {
					if (isClosed) return
					controller.enqueue(streamEncoder.encode(': keepalive\n\n'))
				}, heartbeatIntervalMs)
				request.signal.addEventListener('abort', closeStream)
				return
			}

			closeStream()
		},
		cancel() {
			// Cleanup is handled by closeStream when the request aborts.
		},
	})

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
		},
	})
}
