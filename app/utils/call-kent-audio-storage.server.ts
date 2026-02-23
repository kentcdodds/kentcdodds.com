import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3'
import fsExtra from 'fs-extra'

type PutAudioResult = {
	key: string
	contentType: string
	size: number
}

type GetAudioStreamResult = {
	body: Readable
}

type AudioStore = {
	put: (args: {
		key: string
		body: Uint8Array
		contentType: string
	}) => Promise<PutAudioResult>
	getStream: (args: { key: string; range?: { start: number; end: number } }) => Promise<GetAudioStreamResult>
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

function getCacheRoot() {
	return path.join(process.cwd(), '.cache', 'cloudflare-r2')
}

function parseBase64DataUrl(dataUrl: string): { buffer: Buffer; contentType: string } {
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
	return process.env.CALL_KENT_R2_BUCKET
}

function getR2ConfigFromEnv() {
	const endpoint = process.env.R2_ENDPOINT
	const accessKeyId = process.env.R2_ACCESS_KEY_ID
	const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
	return { endpoint, accessKeyId, secretAccessKey }
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0
}

let _r2Client: S3Client | null = null
let _r2ClientConfig:
	| { endpoint: string; accessKeyId: string; secretAccessKey: string }
	| null = null

function getR2Client() {
	const { endpoint, accessKeyId, secretAccessKey } = getR2ConfigFromEnv()
	if (!isNonEmptyString(endpoint)) throw new Error('R2_ENDPOINT is required')
	if (!isNonEmptyString(accessKeyId)) throw new Error('R2_ACCESS_KEY_ID is required')
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

function createDiskStore({ bucket }: { bucket: string }): AudioStore {
	return {
		async put({ key, body, contentType }) {
			const fullPath = path.join(getCacheRoot(), bucket, key)
			fsExtra.ensureDirSync(path.dirname(fullPath))
			await fs.promises.writeFile(fullPath, body)
			return { key, contentType, size: body.byteLength }
		},
		async getStream({ key, range }) {
			const fullPath = path.join(getCacheRoot(), bucket, key)
			const stream = fs.createReadStream(
				fullPath,
				range ? { start: range.start, end: range.end } : undefined,
			)
			return { body: stream }
		},
		async delete({ key }) {
			const fullPath = path.join(getCacheRoot(), bucket, key)
			await fsExtra.remove(fullPath)
		},
	}
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
			if (!(body instanceof Readable)) {
				throw new Error('Unexpected R2 response body type')
			}
			return { body }
		},
		async delete({ key }) {
			await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
		},
	}
}

function getStore(): { store: AudioStore; bucket: string; source: 'r2' | 'disk' } {
	const bucket = getCallKentBucketName()
	// In local dev/CI we prefer disk to keep everything self-contained.
	if (process.env.MOCKS === 'true') {
		return { store: createDiskStore({ bucket }), bucket, source: 'disk' }
	}

	// Not mocked: always use R2 and fail fast if env vars are missing.
	return { store: createR2Store({ bucket }), bucket, source: 'r2' }
}

export function getCallAudioKey(callId: string, contentType: string) {
	const ext = extFromContentType(contentType)
	return `call-kent/calls/${callId}/call${ext}`
}

export function getEpisodeDraftAudioKey(draftId: string) {
	return `call-kent/drafts/${draftId}/episode.mp3`
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

export async function deleteAudioObject({ key }: { key: string }) {
	const { store } = getStore()
	await store.delete({ key })
}

export async function getAudioBuffer({ key }: { key: string }) {
	const { body } = await getAudioStream({ key })
	const chunks: Buffer[] = []
	for await (const chunk of body) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
	}
	return Buffer.concat(chunks)
}

export { parseBase64DataUrl }

