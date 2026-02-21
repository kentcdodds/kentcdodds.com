import { Readable } from 'node:stream'
import {
	GetObjectCommand,
	ListObjectsV2Command,
	type ListObjectsV2CommandOutput,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3'
import {
	DEFAULT_IGNORE_LIST_KEY,
	getIgnoreListKey,
	isDocIdIgnored,
	matchesIgnorePattern,
	type SemanticSearchIgnoreList,
} from '#other/semantic-search/ignore-list-patterns.ts'

export {
	DEFAULT_IGNORE_LIST_KEY,
	getIgnoreListKey,
	isDocIdIgnored,
	matchesIgnorePattern,
}
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

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0
}

export type SemanticSearchAdminStore = {
	source: 'r2' | 'fixtures'
	bucket: string
	ignoreListKey: string
	listManifestKeys: () => Promise<string[]>
	getManifest: (key: string) => Promise<SemanticSearchManifest | null>
	putManifest: (key: string, value: SemanticSearchManifest) => Promise<void>
	getIgnoreList: () => Promise<SemanticSearchIgnoreList>
	putIgnoreList: (value: SemanticSearchIgnoreList) => Promise<void>
}

function getR2Bucket() {
	return process.env.R2_BUCKET ?? 'kcd-semantic-search'
}

function getR2ConfigFromEnv() {
	const endpoint = process.env.R2_ENDPOINT
	const accessKeyId = process.env.R2_ACCESS_KEY_ID
	const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
	return { endpoint, accessKeyId, secretAccessKey }
}

export function isR2S3Configured() {
	const { endpoint, accessKeyId, secretAccessKey } = getR2ConfigFromEnv()
	return Boolean(
		isNonEmptyString(endpoint) &&
		isNonEmptyString(accessKeyId) &&
		isNonEmptyString(secretAccessKey),
	)
}

let _r2Client: S3Client | null = null
let _r2ClientConfig:
	| { endpoint: string; accessKeyId: string; secretAccessKey: string }
	| null = null

export function invalidateR2Client() {
	_r2Client = null
	_r2ClientConfig = null
}

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
	const ignoreListKey = getIgnoreListKey()

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

const FIXTURE_R2_OBJECTS: Record<string, unknown> = {
	'manifests/repo-content.json': {
		version: 1,
		docs: {
			'blog:super-simple-start-to-remix': {
				type: 'blog',
				url: '/blog/super-simple-start-to-remix',
				title: 'Super Simple Start to Remix',
				chunks: [
					{
						id: 'blog:super-simple-start-to-remix:chunk:0',
						hash: 'fixture-hash-blog-0',
						snippet: 'Fixture snippet: this represents indexed blog content…',
						chunkIndex: 0,
						chunkCount: 2,
					},
					{
						id: 'blog:super-simple-start-to-remix:chunk:1',
						hash: 'fixture-hash-blog-1',
						snippet: 'Fixture snippet: second chunk…',
						chunkIndex: 1,
						chunkCount: 2,
					},
				],
			},
			'page:uses': {
				type: 'page',
				url: '/uses',
				title: 'Uses',
				chunks: [
					{
						id: 'page:uses:chunk:0',
						hash: 'fixture-hash-page-0',
						snippet: 'Fixture snippet: page content…',
						chunkIndex: 0,
						chunkCount: 1,
					},
				],
			},
		},
	},
	'manifests/podcasts.json': {
		version: 1,
		docs: {
			'ck:s01e01': {
				type: 'ck',
				url: '/calls/1/1',
				title: 'Fixture Call Kent Episode',
				sourceUpdatedAt: '2026-02-01T00:00:00.000Z',
				chunks: [
					{
						id: 'ck:s01e01:chunk:0',
						hash: 'fixture-hash-ck-0',
						snippet: 'Fixture snippet: podcast summary…',
						chunkIndex: 0,
						chunkCount: 1,
					},
				],
			},
		},
	},
	'manifests/youtube-PLV5CVI1eNcJgNqzNwcs4UKrlJdhfDjshf.json': {
		version: 1,
		docs: {
			'youtube:dQw4w9WgXcQ': {
				type: 'youtube',
				url: '/youtube?video=dQw4w9WgXcQ',
				title: 'Fixture YouTube Video',
				sourceUpdatedAt: '2026-02-01',
				transcriptSource: 'manual',
				chunks: [
					{
						id: 'youtube:dQw4w9WgXcQ:chunk:0',
						hash: 'fixture-hash-yt-0',
						snippet: 'Fixture snippet: transcript chunk…',
						chunkIndex: 0,
						chunkCount: 3,
					},
					{
						id: 'youtube:dQw4w9WgXcQ:chunk:1',
						hash: 'fixture-hash-yt-1',
						snippet: 'Fixture snippet: another transcript chunk…',
						chunkIndex: 1,
						chunkCount: 3,
					},
					{
						id: 'youtube:dQw4w9WgXcQ:chunk:2',
						hash: 'fixture-hash-yt-2',
						snippet: 'Fixture snippet: third transcript chunk…',
						chunkIndex: 2,
						chunkCount: 3,
					},
				],
			},
		},
	},
	[DEFAULT_IGNORE_LIST_KEY]: {
		version: 1,
		updatedAt: '2026-02-20T00:00:00.000Z',
		patterns: [],
	},
}

const isProd = process.env.NODE_ENV === 'production'
let _fixtureStore: SemanticSearchAdminStore | null = null
function createFixtureAdminStore(): SemanticSearchAdminStore {
	if (isProd && _fixtureStore) return _fixtureStore

	const bucket = getR2Bucket()
	const ignoreListKey = getIgnoreListKey()
	const objects = new Map<string, unknown>(
		Object.entries(FIXTURE_R2_OBJECTS).map(([k, v]) => [k, structuredClone(v)]),
	)

	const store: SemanticSearchAdminStore = {
		source: 'fixtures',
		bucket,
		ignoreListKey,
		listManifestKeys: async () => {
			return [...objects.keys()]
				.filter((k) => k.startsWith(DEFAULT_MANIFEST_PREFIX))
				.filter((k) => k.endsWith('.json'))
				.filter((k) => k !== ignoreListKey)
				.sort((a, b) => a.localeCompare(b))
		},
		getManifest: async (key) => {
			const value = objects.get(key)
			return value ? (structuredClone(value) as SemanticSearchManifest) : null
		},
		putManifest: async (key, value) => {
			objects.set(key, structuredClone(value))
		},
		getIgnoreList: async () => {
			const value = objects.get(ignoreListKey)
			return value
				? (structuredClone(value) as SemanticSearchIgnoreList)
				: getDefaultIgnoreList()
		},
		putIgnoreList: async (value) => {
			objects.set(ignoreListKey, structuredClone(value))
		},
	}
	if (isProd) _fixtureStore = store
	return store
}

export function getSemanticSearchAdminStore(): {
	store: SemanticSearchAdminStore | null
	configured: boolean
	message?: string
} {
	if (isR2S3Configured()) {
		return { store: createR2AdminStore(), configured: true }
	}
	if (process.env.MOCKS === 'true') {
		return {
			store: createFixtureAdminStore(),
			configured: true,
			message:
				'Using fixture semantic-search manifests (read-only). Set R2_ENDPOINT/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY to use real R2.',
		}
	}
	return {
		store: null,
		configured: false,
		message:
			'R2 is not configured. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY to enable /search/admin.',
	}
}
