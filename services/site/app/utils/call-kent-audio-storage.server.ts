import { Readable } from 'node:stream'
import { AwsClient } from 'aws4fetch'
import { getEnv } from '#app/utils/env.server.ts'

type PutAudioResult = {
	key: string
	contentType: string
	size: number
}

type GetAudioStreamResult = {
	body: Readable
}

type HeadAudioResult = {
	size: number
	contentType: string | null
}

type AudioStore = {
	put: (args: {
		key: string
		body: Uint8Array
		contentType: string
	}) => Promise<PutAudioResult>
	getStream: (args: {
		key: string
		range?: { start: number; end: number }
	}) => Promise<GetAudioStreamResult>
	head: (args: { key: string }) => Promise<HeadAudioResult>
	delete: (args: { key: string }) => Promise<void>
}

type R2ClientHandle = {
	client: AwsClient
	endpoint: string
}

export function parseHttpByteRangeHeader(rangeHeader: string, size: number) {
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

function parseBase64DataUrl(dataUrl: string): {
	buffer: Buffer
	contentType: string
} {
	// MediaRecorder often emits data URLs like:
	// `data:audio/webm;codecs=opus;base64,...`
	const match = dataUrl.match(/^data:(?<type>.+?);base64,(?<data>.+)$/)
	const contentType = match?.groups?.type
	const base64 = match?.groups?.data
	if (!contentType || !base64) {
		throw new Error('Invalid base64 data URL')
	}
	return { buffer: Buffer.from(base64, 'base64'), contentType }
}

function extFromContentType(contentType: string) {
	const ct = contentType.toLowerCase()
	if (ct.includes('audio/webm')) return '.webm'
	if (ct.includes('audio/mpeg') || ct.includes('audio/mp3')) return '.mp3'
	if (ct.includes('audio/wav')) return '.wav'
	if (ct.includes('audio/ogg')) return '.ogg'
	return ''
}

function getCallKentBucketName() {
	return getEnv().CALL_KENT_R2_BUCKET
}

function getR2ConfigFromEnv() {
	const env = getEnv()
	const endpoint = env.R2_ENDPOINT
	const accessKeyId = env.R2_ACCESS_KEY_ID
	const secretAccessKey = env.R2_SECRET_ACCESS_KEY
	return { endpoint, accessKeyId, secretAccessKey }
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0
}

function isWebReadableStream(
	value: unknown,
): value is ReadableStream<Uint8Array> {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as { getReader?: unknown }).getReader === 'function'
	)
}

export function toAudioReadable(body: unknown): Readable {
	if (body instanceof Readable) return body
	if (isWebReadableStream(body)) {
		return Readable.fromWeb(body as Parameters<typeof Readable.fromWeb>[0])
	}
	if (
		typeof body === 'object' &&
		body !== null &&
		typeof (body as { transformToWebStream?: unknown }).transformToWebStream ===
			'function'
	) {
		const stream = (
			body as { transformToWebStream(): ReadableStream<Uint8Array> }
		).transformToWebStream()
		return Readable.fromWeb(stream as Parameters<typeof Readable.fromWeb>[0])
	}
	throw new Error('Unexpected R2 response body type')
}

function encodeS3PathSegment(segment: string) {
	return encodeURIComponent(segment).replace(
		/[!'()*]/g,
		(char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
	)
}

function r2ObjectUrl({
	endpoint,
	bucket,
	key,
}: {
	endpoint: string
	bucket: string
	key: string
}) {
	const base = endpoint.replace(/\/+$/, '')
	const encodedKey = key.split('/').map(encodeS3PathSegment).join('/')
	return `${base}/${encodeS3PathSegment(bucket)}/${encodedKey}`
}

function bodyInitFromBytes(bytes: Uint8Array): BodyInit {
	return bytes.buffer.slice(
		bytes.byteOffset,
		bytes.byteOffset + bytes.byteLength,
	) as ArrayBuffer
}

async function throwIfR2Failed(response: Response, operation: string) {
	if (response.ok) return
	const detail = (await response.text().catch(() => '')).trim()
	throw new Error(
		detail
			? `R2 ${operation} failed: ${response.status} ${detail}`
			: `R2 ${operation} failed: ${response.status}`,
	)
}

let _r2Client: AwsClient | null = null
let _r2ClientConfig: {
	endpoint: string
	accessKeyId: string
	secretAccessKey: string
} | null = null

function getR2Client(): R2ClientHandle {
	const { endpoint, accessKeyId, secretAccessKey } = getR2ConfigFromEnv()
	if (!isNonEmptyString(endpoint)) throw new Error('R2_ENDPOINT is required')
	if (!isNonEmptyString(accessKeyId))
		throw new Error('R2_ACCESS_KEY_ID is required')
	if (!isNonEmptyString(secretAccessKey))
		throw new Error('R2_SECRET_ACCESS_KEY is required')

	if (
		_r2Client &&
		_r2ClientConfig &&
		_r2ClientConfig.endpoint === endpoint &&
		_r2ClientConfig.accessKeyId === accessKeyId &&
		_r2ClientConfig.secretAccessKey === secretAccessKey
	) {
		return { client: _r2Client, endpoint }
	}

	_r2ClientConfig = { endpoint, accessKeyId, secretAccessKey }
	_r2Client = new AwsClient({
		accessKeyId,
		secretAccessKey,
		service: 's3',
		region: 'auto',
	})
	return { client: _r2Client, endpoint }
}

function createR2Store({ bucket }: { bucket: string }): AudioStore {
	const { client, endpoint } = getR2Client()
	return {
		async put({ key, body, contentType }) {
			const response = await client.fetch(
				r2ObjectUrl({ endpoint, bucket, key }),
				{
					method: 'PUT',
					headers: { 'Content-Type': contentType },
					body: bodyInitFromBytes(body),
				},
			)
			await throwIfR2Failed(response, 'PutObject')
			return { key, contentType, size: body.byteLength }
		},
		async getStream({ key, range }) {
			const headers: Record<string, string> = {}
			if (range) headers.Range = `bytes=${range.start}-${range.end}`
			const response = await client.fetch(
				r2ObjectUrl({ endpoint, bucket, key }),
				{
					method: 'GET',
					headers,
				},
			)
			await throwIfR2Failed(response, 'GetObject')
			if (!response.body) throw new Error('Unexpected R2 response body type')
			return { body: toAudioReadable(response.body) }
		},
		async head({ key }) {
			const response = await client.fetch(
				r2ObjectUrl({ endpoint, bucket, key }),
				{ method: 'HEAD' },
			)
			await throwIfR2Failed(response, 'HeadObject')
			const size = Number(response.headers.get('content-length'))
			if (!Number.isFinite(size) || size <= 0) {
				throw new Error('Unexpected audio ContentLength')
			}
			const rawContentType = response.headers.get('content-type')
			const contentType =
				typeof rawContentType === 'string' && rawContentType.trim()
					? rawContentType.trim()
					: null
			return { size, contentType }
		},
		async delete({ key }) {
			const response = await client.fetch(
				r2ObjectUrl({ endpoint, bucket, key }),
				{ method: 'DELETE' },
			)
			await throwIfR2Failed(response, 'DeleteObject')
		},
	}
}

function getStore(): {
	store: AudioStore
	bucket: string
	source: 'r2'
} {
	const bucket = getCallKentBucketName()
	return { store: createR2Store({ bucket }), bucket, source: 'r2' }
}

export function getCallAudioKey(callId: string, contentType: string) {
	const ext = extFromContentType(contentType)
	return `call-kent/calls/${callId}/call${ext}`
}

export function getEpisodeDraftAudioKey(draftId: string) {
	return `call-kent/drafts/${draftId}/episode.mp3`
}

export function getEpisodeDraftResponseAudioKey(
	draftId: string,
	contentType: string,
) {
	const ext = extFromContentType(contentType)
	return `call-kent/drafts/${draftId}/response${ext}`
}

export function getEpisodeDraftCallerSegmentAudioKey(draftId: string) {
	return `call-kent/drafts/${draftId}/caller-segment.mp3`
}

export function getEpisodeDraftResponseSegmentAudioKey(draftId: string) {
	return `call-kent/drafts/${draftId}/response-segment.mp3`
}

export async function putCallAudioFromDataUrl({
	callId,
	dataUrl,
}: {
	callId: string
	dataUrl: string
}): Promise<PutAudioResult> {
	const { buffer, contentType } = parseBase64DataUrl(dataUrl)
	const { store } = getStore()
	const key = getCallAudioKey(callId, contentType)
	return await store.put({ key, body: buffer, contentType })
}

export async function putCallAudioFromBuffer({
	callId,
	audio,
	contentType,
}: {
	callId: string
	audio: Uint8Array
	contentType: string
}): Promise<PutAudioResult> {
	const { store } = getStore()
	const key = getCallAudioKey(callId, contentType)
	return await store.put({ key, body: audio, contentType })
}

export async function putEpisodeDraftAudioFromBuffer({
	draftId,
	mp3,
}: {
	draftId: string
	mp3: Uint8Array
}): Promise<PutAudioResult> {
	const { store } = getStore()
	const key = getEpisodeDraftAudioKey(draftId)
	return await store.put({ key, body: mp3, contentType: 'audio/mpeg' })
}

export async function putEpisodeDraftResponseAudioFromBuffer({
	draftId,
	audio,
	contentType,
}: {
	draftId: string
	audio: Uint8Array
	contentType: string
}): Promise<PutAudioResult> {
	const { store } = getStore()
	const key = getEpisodeDraftResponseAudioKey(draftId, contentType)
	return await store.put({ key, body: audio, contentType })
}

export async function putEpisodeDraftCallerSegmentAudioFromBuffer({
	draftId,
	mp3,
}: {
	draftId: string
	mp3: Uint8Array
}): Promise<PutAudioResult> {
	const { store } = getStore()
	const key = getEpisodeDraftCallerSegmentAudioKey(draftId)
	return await store.put({ key, body: mp3, contentType: 'audio/mpeg' })
}

export async function putEpisodeDraftResponseSegmentAudioFromBuffer({
	draftId,
	mp3,
}: {
	draftId: string
	mp3: Uint8Array
}): Promise<PutAudioResult> {
	const { store } = getStore()
	const key = getEpisodeDraftResponseSegmentAudioKey(draftId)
	return await store.put({ key, body: mp3, contentType: 'audio/mpeg' })
}

export async function getAudioStream({
	key,
	range,
}: {
	key: string
	range?: { start: number; end: number }
}): Promise<GetAudioStreamResult> {
	const { store } = getStore()
	return await store.getStream({ key, range })
}

export async function headAudioObject({ key }: { key: string }) {
	const { store } = getStore()
	return await store.head({ key })
}

export async function deleteAudioObject({ key }: { key: string }) {
	const { store } = getStore()
	await store.delete({ key })
}

export async function getAudioBuffer({ key }: { key: string }) {
	const { body } = await getAudioStream({ key })
	const chunks: Array<Buffer> = []
	for await (const chunk of body) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
	}
	return Buffer.concat(chunks)
}

export { parseBase64DataUrl }
