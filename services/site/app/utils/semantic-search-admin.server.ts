import { Readable } from 'node:stream'
import {
	GetObjectCommand,
	ListObjectsV2Command,
	type ListObjectsV2CommandOutput,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3'
import { getEnv } from '#app/utils/env.server.ts'
import {
	isDocIdIgnored,
	matchesIgnorePattern,
	type SemanticSearchIgnoreList,
} from '#other/semantic-search/ignore-list-patterns.ts'
export { isDocIdIgnored, matchesIgnorePattern }
export type { SemanticSearchIgnoreList }

export type SemanticSearchManifestChunk = {
	id: string
	hash: string
	snippet: string
	chunkIndex: number
	chunkCount: number
}

export type SemanticSearchManifestDoc = {
	type: string
	url: string
	title: string
	chunks: SemanticSearchManifestChunk[]
	sourceUpdatedAt?: string
	transcriptSource?: string
}

export type SemanticSearchManifest = {
	version: number
	docs: Record<string, SemanticSearchManifestDoc>
}

export const DEFAULT_MANIFEST_PREFIX = 'manifests/'

export type SemanticSearchAdminStore = {
	source: 'r2'
	bucket: string
	ignoreListKey: string
	listManifestKeys: () => Promise<string[]>
	getManifest: (key: string) => Promise<SemanticSearchManifest | null>
	putManifest: (key: string, value: SemanticSearchManifest) => Promise<void>
	getIgnoreList: () => Promise<SemanticSearchIgnoreList>
	putIgnoreList: (value: SemanticSearchIgnoreList) => Promise<void>
}

function getR2Bucket() {
	return getEnv().R2_BUCKET
}

function getR2ConfigFromEnv() {
	const env = getEnv()
	const endpoint = env.R2_ENDPOINT
	const accessKeyId = env.R2_ACCESS_KEY_ID
	const secretAccessKey = env.R2_SECRET_ACCESS_KEY
	return { endpoint, accessKeyId, secretAccessKey }
}

let _r2Client: S3Client | null = null
let _r2ClientConfig: {
	endpoint: string
	accessKeyId: string
	secretAccessKey: string
} | null = null

function getR2Client() {
	const { endpoint, accessKeyId, secretAccessKey } = getR2ConfigFromEnv()

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

async function streamToString(body: unknown) {
	if (!body) return ''
	if (typeof body === 'string') return body
	if (body instanceof Uint8Array) return Buffer.from(body).toString('utf8')
	// AWS SDK v3 SdkStream mixin for Node adds transformToString.
	if (
		typeof body === 'object' &&
		body !== null &&
		'transformToString' in body &&
		typeof (body as any).transformToString === 'function'
	) {
		return await (body as any).transformToString('utf-8')
	}

	if (body instanceof Readable) {
		const chunks: Buffer[] = []
		for await (const chunk of body) {
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
		}
		return Buffer.concat(chunks).toString('utf8')
	}

	return String(body)
}

function isNotFoundError(error: unknown) {
	if (!error || typeof error !== 'object') return false
	const anyErr = error as any
	const name = typeof anyErr.name === 'string' ? anyErr.name : ''
	const status = anyErr?.$metadata?.httpStatusCode
	if (name === 'NoSuchKey' || name === 'NotFound') return true
	if (status === 404) return true
	const message = typeof anyErr.message === 'string' ? anyErr.message : ''
	return /NoSuchKey|not found/i.test(message)
}

async function getJsonFromR2<T>({
	client,
	bucket,
	key,
}: {
	client: S3Client
	bucket: string
	key: string
}): Promise<T | null> {
	try {
		const res = await client.send(
			new GetObjectCommand({ Bucket: bucket, Key: key }),
		)
		const text = await streamToString(res.Body)
		if (!text.trim()) return null
		return JSON.parse(text) as T
	} catch (error: unknown) {
		if (isNotFoundError(error)) return null
		throw error
	}
}

async function putJsonToR2({
	client,
	bucket,
	key,
	value,
}: {
	client: S3Client
	bucket: string
	key: string
	value: unknown
}) {
	const body = JSON.stringify(value, null, 2)
	await client.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			Body: body,
			ContentType: 'application/json; charset=utf-8',
		}),
	)
}

async function listKeysFromR2({
	client,
	bucket,
	prefix,
}: {
	client: S3Client
	bucket: string
	prefix: string
}) {
	const keys: string[] = []
	let token: string | undefined = undefined
	for (let page = 0; page < 25; page++) {
		const res: ListObjectsV2CommandOutput = await client.send(
			new ListObjectsV2Command({
				Bucket: bucket,
				Prefix: prefix,
				ContinuationToken: token,
			}),
		)
		for (const item of res.Contents ?? []) {
			const key = item.Key
			if (typeof key === 'string') keys.push(key)
		}
		if (!res.IsTruncated) break
		token = res.NextContinuationToken
		if (!token) break
	}
	return keys
}

function getDefaultIgnoreList(): SemanticSearchIgnoreList {
	return { version: 1, patterns: [] }
}

function createR2AdminStore(): SemanticSearchAdminStore {
	const client = getR2Client()
	const bucket = getR2Bucket()
	const ignoreListKey = getEnv().SEMANTIC_SEARCH_IGNORE_LIST_KEY

	return {
		source: 'r2',
		bucket,
		ignoreListKey,
		listManifestKeys: async () => {
			const keys = await listKeysFromR2({
				client,
				bucket,
				prefix: DEFAULT_MANIFEST_PREFIX,
			})
			return keys
				.filter((k) => k.endsWith('.json'))
				.filter((k) => k !== ignoreListKey)
				.sort((a, b) => a.localeCompare(b))
		},
		getManifest: async (key) => {
			return await getJsonFromR2<SemanticSearchManifest>({
				client,
				bucket,
				key,
			})
		},
		putManifest: async (key, value) => {
			await putJsonToR2({ client, bucket, key, value })
		},
		getIgnoreList: async () => {
			return (
				(await getJsonFromR2<SemanticSearchIgnoreList>({
					client,
					bucket,
					key: ignoreListKey,
				})) ?? getDefaultIgnoreList()
			)
		},
		putIgnoreList: async (value) => {
			await putJsonToR2({ client, bucket, key: ignoreListKey, value })
		},
	}
}

export function getSemanticSearchAdminStore(): {
	store: SemanticSearchAdminStore | null
	configured: boolean
	message?: string
} {
	return { store: createR2AdminStore(), configured: true }
}
