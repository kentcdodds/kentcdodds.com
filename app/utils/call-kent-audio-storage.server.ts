import { Readable } from 'node:stream'
import {
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3'
import { getEnv } from '#app/utils/env.server.ts'

type PutAudioResult = {
	key: string
	contentType: string
	size: number
}

type GetAudioStreamResult = {
	body: ReadableStream<Uint8Array>
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

let _r2Client: S3Client | null = null
let _r2ClientConfig: {
	endpoint: string
	accessKeyId: string
	secretAccessKey: string
} | null = null

function getR2Client() {
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
		return _r2Client
	}

	_r2ClientConfig = { endpoint, accessKeyId, secretAccessKey }
	_r2Client = new S3Client({
		region: 'auto',
		endpoint,
		forcePathStyle: true,
		credentials: { accessKeyId, secretAccessKey },
	})
	return _r2Client
}

function createR2Store({ bucket }: { bucket: string }): AudioStore {
	const client = getR2Client()
	return {
		async put({ key, body, contentType }) {
			await client.send(
				new PutObjectCommand({
					Bucket: bucket,
					Key: key,
					Body: body,
					ContentType: contentType,
				}),
			)
			return { key, contentType, size: body.byteLength }
		},
		async getStream({ key, range }) {
			const res = await client.send(
				new GetObjectCommand({
					Bucket: bucket,
					Key: key,
					Range: range ? `bytes=${range.start}-${range.end}` : undefined,
				}),
			)
			const body = res.Body
			return { body: toWebReadableStream(body) }
		},
		async head({ key }) {
			const res = await client.send(
				new HeadObjectCommand({
					Bucket: bucket,
					Key: key,
				}),
			)
			const size = res.ContentLength
			if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) {
				throw new Error('Unexpected audio ContentLength')
			}
			const contentType =
				typeof res.ContentType === 'string' && res.ContentType.trim()
					? res.ContentType.trim()
					: null
			return { size, contentType }
		},
		async delete({ key }) {
			await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
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
	return readStreamIntoBuffer(body)
}

function toWebReadableStream(body: unknown): ReadableStream<Uint8Array> {
	if (body instanceof ReadableStream) {
		return body as ReadableStream<Uint8Array>
	}
	if (
		body &&
		typeof body === 'object' &&
		'transformToWebStream' in body &&
		typeof body.transformToWebStream === 'function'
	) {
		return body.transformToWebStream() as ReadableStream<Uint8Array>
	}
	if (body instanceof Readable) {
		return Readable.toWeb(body) as ReadableStream<Uint8Array>
	}
	throw new Error('Unexpected R2 response body type')
}

async function readStreamIntoBuffer(stream: ReadableStream<Uint8Array>) {
	const reader = stream.getReader()
	const chunks: Array<Uint8Array> = []
	let totalLength = 0

	while (true) {
		const { done, value } = await reader.read()
		if (done) break
		if (!value) continue
		chunks.push(value)
		totalLength += value.byteLength
	}

	const merged = new Uint8Array(totalLength)
	let offset = 0
	for (const chunk of chunks) {
		merged.set(chunk, offset)
		offset += chunk.byteLength
	}
	return Buffer.from(merged.buffer, merged.byteOffset, merged.byteLength)
}
