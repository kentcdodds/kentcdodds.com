import { AwsClient } from 'aws4fetch'
import { XMLParser } from 'fast-xml-parser'
import { getEnv } from '#app/utils/env.server.ts'
import {
	isDocIdIgnored,
	matchesIgnorePattern,
	type SemanticSearchIgnoreList,
} from '../../../../other/semantic-search/ignore-list-patterns.ts'
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
	chunks: Array<SemanticSearchManifestChunk>
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

type R2ClientHandle = {
	client: AwsClient
	endpoint: string
}

const listObjectsXmlParser = new XMLParser({
	ignoreAttributes: true,
	processEntities: true,
	trimValues: true,
})

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

let _r2Client: AwsClient | null = null
let _r2ClientConfig: {
	endpoint: string
	accessKeyId: string
	secretAccessKey: string
} | null = null

function getR2Client(): R2ClientHandle {
	const { endpoint, accessKeyId, secretAccessKey } = getR2ConfigFromEnv()

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

function r2BucketUrl({
	endpoint,
	bucket,
}: {
	endpoint: string
	bucket: string
}) {
	const base = endpoint.replace(/\/+$/, '')
	return `${base}/${encodeS3PathSegment(bucket)}`
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

function asArray<T>(value: T | Array<T> | undefined | null): Array<T> {
	if (value == null) return []
	return Array.isArray(value) ? value : [value]
}

function isTruthyXmlBoolean(value: unknown) {
	return value === true || value === 'true' || value === 1 || value === '1'
}

export function parseListObjectsV2Xml(xml: string): {
	keys: Array<string>
	isTruncated: boolean
	nextContinuationToken: string | undefined
} {
	const parsed = listObjectsXmlParser.parse(xml) as {
		ListBucketResult?: {
			Contents?: { Key?: unknown } | Array<{ Key?: unknown }>
			IsTruncated?: unknown
			NextContinuationToken?: unknown
		}
	}
	const result = parsed.ListBucketResult
	if (!result) {
		return {
			keys: [],
			isTruncated: false,
			nextContinuationToken: undefined,
		}
	}

	const keys = asArray(result.Contents)
		.map((item) => item?.Key)
		.filter((key): key is string => typeof key === 'string' && key.length > 0)

	const nextContinuationToken =
		typeof result.NextContinuationToken === 'string' &&
		result.NextContinuationToken.trim()
			? result.NextContinuationToken.trim()
			: undefined

	return {
		keys,
		isTruncated: isTruthyXmlBoolean(result.IsTruncated),
		nextContinuationToken,
	}
}

async function getJsonFromR2<T>({
	client,
	endpoint,
	bucket,
	key,
}: {
	client: AwsClient
	endpoint: string
	bucket: string
	key: string
}): Promise<T | null> {
	const response = await client.fetch(r2ObjectUrl({ endpoint, bucket, key }), {
		method: 'GET',
	})
	if (response.status === 404) return null
	await throwIfR2Failed(response, 'GetObject')
	const text = await response.text()
	if (!text.trim()) return null
	return JSON.parse(text) as T
}

async function putJsonToR2({
	client,
	endpoint,
	bucket,
	key,
	value,
}: {
	client: AwsClient
	endpoint: string
	bucket: string
	key: string
	value: unknown
}) {
	const body = JSON.stringify(value, null, 2)
	const response = await client.fetch(r2ObjectUrl({ endpoint, bucket, key }), {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
		body,
	})
	await throwIfR2Failed(response, 'PutObject')
}

async function listKeysFromR2({
	client,
	endpoint,
	bucket,
	prefix,
}: {
	client: AwsClient
	endpoint: string
	bucket: string
	prefix: string
}) {
	const keys: Array<string> = []
	let token: string | undefined = undefined
	for (let page = 0; page < 25; page++) {
		const url = new URL(r2BucketUrl({ endpoint, bucket }))
		url.searchParams.set('list-type', '2')
		url.searchParams.set('prefix', prefix)
		if (token) url.searchParams.set('continuation-token', token)

		const response = await client.fetch(url, { method: 'GET' })
		await throwIfR2Failed(response, 'ListObjectsV2')
		const xml = await response.text()
		const pageResult = parseListObjectsV2Xml(xml)
		keys.push(...pageResult.keys)
		if (!pageResult.isTruncated) break
		token = pageResult.nextContinuationToken
		if (!token) break
	}
	return keys
}

function getDefaultIgnoreList(): SemanticSearchIgnoreList {
	return { version: 1, patterns: [] }
}

function createR2AdminStore(): SemanticSearchAdminStore {
	const { client, endpoint } = getR2Client()
	const bucket = getR2Bucket()
	const ignoreListKey = getEnv().SEMANTIC_SEARCH_IGNORE_LIST_KEY

	return {
		source: 'r2',
		bucket,
		ignoreListKey,
		listManifestKeys: async () => {
			const keys = await listKeysFromR2({
				client,
				endpoint,
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
				endpoint,
				bucket,
				key,
			})
		},
		putManifest: async (key, value) => {
			await putJsonToR2({ client, endpoint, bucket, key, value })
		},
		getIgnoreList: async () => {
			return (
				(await getJsonFromR2<SemanticSearchIgnoreList>({
					client,
					endpoint,
					bucket,
					key: ignoreListKey,
				})) ?? getDefaultIgnoreList()
			)
		},
		putIgnoreList: async (value) => {
			await putJsonToR2({ client, endpoint, bucket, key: ignoreListKey, value })
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
