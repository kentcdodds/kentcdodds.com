import { Readable } from 'node:stream'
import { createReadableStreamFromReadable } from '@react-router/node'
import {
	getAudioBuffer,
	getAudioStream,
	parseHttpByteRangeHeader,
} from '#app/utils/call-kent-audio-storage.server.ts'
import { prisma } from '#app/utils/prisma.server.ts'
import { requireUser } from '#app/utils/session.server.ts'
import { type Route } from './+types/call-audio'

export async function loader({ request }: Route.LoaderArgs) {
	const user = await requireUser(request)
	const url = new URL(request.url)
	const callId = url.searchParams.get('callId')
	if (!callId) throw new Response('callId is required', { status: 400 })

	const isAdmin = user.role === 'ADMIN'
	const call = await prisma.call.findFirst({
		where: isAdmin ? { id: callId } : { id: callId, userId: user.id },
		select: {
			audioKey: true,
			audioContentType: true,
			audioSize: true,
		},
	})
	if (!call) throw new Response('Not found', { status: 404 })
	if (!call.audioKey) throw new Response('Not found', { status: 404 })

	const audioKey = call.audioKey
	let contentType = call.audioContentType ?? 'application/octet-stream'
	let size = call.audioSize ?? null

	const rangeHeader = request.headers.get('range')
	// R2-backed (or mock implementation when running locally with mocks).
	if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) {
		// Size should always be present for stored audio; keep a safe fallback.
		const buffer = await getAudioBuffer({ key: audioKey })
		size = buffer.byteLength
		const range = rangeHeader ? parseHttpByteRangeHeader(rangeHeader, size) : null
		const body = range ? buffer.subarray(range.start, range.end + 1) : buffer
		const stream = Readable.from(body)
		return new Response(createReadableStreamFromReadable(stream), {
			status: range ? 206 : 200,
			headers: {
				'Content-Type': contentType,
				'Accept-Ranges': 'bytes',
				...(range
					? {
							'Content-Range': `bytes ${range.start}-${range.end}/${size}`,
							'Content-Length': String(range.end - range.start + 1),
						}
					: { 'Content-Length': String(size) }),
				'Cache-Control': 'private, max-age=3600',
			},
		})
	}

	const range = rangeHeader ? parseHttpByteRangeHeader(rangeHeader, size) : null
	const { body } = await getAudioStream({
		key: audioKey,
		range: range ?? undefined,
	})
	return new Response(createReadableStreamFromReadable(body), {
		status: range ? 206 : 200,
		headers: {
			'Content-Type': contentType,
			'Accept-Ranges': 'bytes',
			...(range
				? {
						'Content-Range': `bytes ${range.start}-${range.end}/${size}`,
						'Content-Length': String(range.end - range.start + 1),
					}
				: { 'Content-Length': String(size) }),
			'Cache-Control': 'private, max-age=3600',
		},
	})
}
