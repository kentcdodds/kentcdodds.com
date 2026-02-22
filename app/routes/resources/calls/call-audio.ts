import { createReadableStreamFromReadable } from '@react-router/node'
import { prisma } from '#app/utils/prisma.server.ts'
import { requireUser } from '#app/utils/session.server.ts'
import {
	getAudioBuffer,
	getAudioStream,
	parseBase64DataUrl,
} from '#app/utils/call-kent-audio-storage.server.ts'
import { type Route } from './+types/call-audio'

function parseRangeHeader(rangeHeader: string, size: number) {
	const match = rangeHeader.match(/^bytes=(?<start>\d*)-(?<end>\d*)$/)
	const startRaw = match?.groups?.start ?? null
	const endRaw = match?.groups?.end ?? null
	if (startRaw === null || endRaw === null) return null
	if (!startRaw && !endRaw) return null

	// Suffix range: bytes=-500
	if (!startRaw) {
		const suffixLength = Number(endRaw)
		if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null
		const start = Math.max(0, size - suffixLength)
		const end = size - 1
		return { start, end }
	}

	const start = Number(startRaw)
	const end = endRaw ? Number(endRaw) : size - 1
	if (!Number.isFinite(start) || !Number.isFinite(end)) return null
	if (start < 0 || end < start) return null
	if (start >= size) return null
	return { start, end: Math.min(end, size - 1) }
}

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
			base64: true, // legacy fallback
		},
	})
	if (!call) throw new Response('Not found', { status: 404 })

	let contentType = call.audioContentType ?? 'application/octet-stream'
	let size = call.audioSize ?? null

	const rangeHeader = request.headers.get('range')
	if (call.audioKey) {
		// R2-backed
		if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) {
			// Size should always be present for R2-backed audio; keep a safe fallback.
			const buffer = await getAudioBuffer({ key: call.audioKey! })
			size = buffer.byteLength
			const range = rangeHeader ? parseRangeHeader(rangeHeader, size) : null
			const body = range ? buffer.subarray(range.start, range.end + 1) : buffer
			return new Response(body, {
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

		const range = rangeHeader ? parseRangeHeader(rangeHeader, size) : null
		const { body } = await getAudioStream({
			key: call.audioKey,
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

	// Legacy DB-backed base64 audio
	if (!call.base64) throw new Response('Not found', { status: 404 })
	const parsed = parseBase64DataUrl(call.base64)
	contentType = parsed.contentType
	size = parsed.buffer.byteLength
	const range = rangeHeader ? parseRangeHeader(rangeHeader, size) : null
	const body = range ? parsed.buffer.subarray(range.start, range.end + 1) : parsed.buffer
	return new Response(body, {
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

