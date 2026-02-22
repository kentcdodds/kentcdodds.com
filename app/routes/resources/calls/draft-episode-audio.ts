import { Readable } from 'node:stream'
import { createReadableStreamFromReadable } from '@react-router/node'
import {
	getAudioBuffer,
	getAudioStream,
	parseBase64DataUrl,
} from '#app/utils/call-kent-audio-storage.server.ts'
import { prisma } from '#app/utils/prisma.server.ts'
import { requireAdminUser } from '#app/utils/session.server.ts'
import { type Route } from './+types/draft-episode-audio'

function parseRangeHeader(rangeHeader: string, size: number) {
	const match = rangeHeader.match(/^bytes=(?<start>\d*)-(?<end>\d*)$/)
	const startRaw = match?.groups?.start ?? null
	const endRaw = match?.groups?.end ?? null
	if (startRaw === null || endRaw === null) return null
	if (!startRaw && !endRaw) return null

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
	await requireAdminUser(request)
	const url = new URL(request.url)
	const callId = url.searchParams.get('callId')
	if (!callId) throw new Response('callId is required', { status: 400 })

	const draft = await prisma.callKentEpisodeDraft.findUnique({
		where: { callId },
		select: {
			episodeAudioKey: true,
			episodeAudioContentType: true,
			episodeAudioSize: true,
			episodeBase64: true, // legacy fallback
		},
	})
	if (!draft) throw new Response('Not found', { status: 404 })

	const rangeHeader = request.headers.get('range')

	if (draft.episodeAudioKey) {
		const contentType = draft.episodeAudioContentType ?? 'audio/mpeg'
		const size = draft.episodeAudioSize

		if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) {
			const buffer = await getAudioBuffer({ key: draft.episodeAudioKey })
			const totalSize = buffer.byteLength
			const range = rangeHeader ? parseRangeHeader(rangeHeader, totalSize) : null
			const body = range ? buffer.subarray(range.start, range.end + 1) : buffer
			const stream = Readable.from(body)
			return new Response(createReadableStreamFromReadable(stream), {
				status: range ? 206 : 200,
				headers: {
					'Content-Type': contentType,
					'Accept-Ranges': 'bytes',
					...(range
						? {
								'Content-Range': `bytes ${range.start}-${range.end}/${totalSize}`,
								'Content-Length': String(range.end - range.start + 1),
							}
						: { 'Content-Length': String(totalSize) }),
					'Cache-Control': 'private, max-age=3600',
				},
			})
		}

		const range = rangeHeader ? parseRangeHeader(rangeHeader, size) : null
		const { body } = await getAudioStream({
			key: draft.episodeAudioKey,
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

	if (!draft.episodeBase64) throw new Response('Not found', { status: 404 })
	const parsed = parseBase64DataUrl(draft.episodeBase64)
	const contentType = parsed.contentType
	const size = parsed.buffer.byteLength
	const range = rangeHeader ? parseRangeHeader(rangeHeader, size) : null
	const body = range ? parsed.buffer.subarray(range.start, range.end + 1) : parsed.buffer
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

