import { Readable } from 'node:stream'
import { createReadableStreamFromReadable } from '@react-router/node'
import {
	getAudioBuffer,
	getAudioStream,
	parseHttpByteRangeHeader,
} from '#app/utils/call-kent-audio-storage.server.ts'

type DraftAudioResponseOptions = {
	request: Request
	key: string
	contentType: string | null
	size: number | null
	defaultContentType: string
}

export async function createDraftAudioResponse({
	request,
	key,
	contentType,
	size,
	defaultContentType,
}: DraftAudioResponseOptions) {
	const rangeHeader = request.headers.get('range')
	const resolvedContentType = contentType ?? defaultContentType

	if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) {
		const buffer = await getAudioBuffer({ key })
		const totalSize = buffer.byteLength
		const range = rangeHeader
			? parseHttpByteRangeHeader(rangeHeader, totalSize)
			: null
		const body = range ? buffer.subarray(range.start, range.end + 1) : buffer
		const stream = Readable.from(body)
		return new Response(createReadableStreamFromReadable(stream), {
			status: range ? 206 : 200,
			headers: {
				'Content-Type': resolvedContentType,
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

	const range = rangeHeader ? parseHttpByteRangeHeader(rangeHeader, size) : null
	const { body } = await getAudioStream({
		key,
		range: range ?? undefined,
	})
	return new Response(createReadableStreamFromReadable(body), {
		status: range ? 206 : 200,
		headers: {
			'Content-Type': resolvedContentType,
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
