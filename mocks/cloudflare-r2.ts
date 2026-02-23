import { createHash } from 'node:crypto'
import {
	http,
	HttpResponse,
	passthrough,
	type HttpHandler,
} from 'msw'

type StoredObject = {
	body: Uint8Array
	contentType: string
	lastModified: string
	etag: string
	size: number
}

// Seed a handful of objects so `/search/admin` is usable in local mocks without
// requiring real R2 access.
const FIXTURE_MANIFEST_OBJECTS: Record<string, unknown> = {
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
						snippet: 'Fixture snippet: this represents indexed blog content...',
						chunkIndex: 0,
						chunkCount: 2,
					},
					{
						id: 'blog:super-simple-start-to-remix:chunk:1',
						hash: 'fixture-hash-blog-1',
						snippet: 'Fixture snippet: second chunk...',
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
						snippet: 'Fixture snippet: page content...',
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
						snippet: 'Fixture snippet: podcast summary...',
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
						snippet: 'Fixture snippet: transcript chunk...',
						chunkIndex: 0,
						chunkCount: 3,
					},
					{
						id: 'youtube:dQw4w9WgXcQ:chunk:1',
						hash: 'fixture-hash-yt-1',
						snippet: 'Fixture snippet: another transcript chunk...',
						chunkIndex: 1,
						chunkCount: 3,
					},
					{
						id: 'youtube:dQw4w9WgXcQ:chunk:2',
						hash: 'fixture-hash-yt-2',
						snippet: 'Fixture snippet: third transcript chunk...',
						chunkIndex: 2,
						chunkCount: 3,
					},
				],
			},
		},
	},
}

// Keyed by bucket -> object key.
const bucketStores = new Map<string, Map<string, StoredObject>>()

function utf8Bytes(input: string) {
	return new TextEncoder().encode(input)
}

function md5Hex(input: string) {
	return createHash('md5').update(input, 'utf8').digest('hex')
}

function md5HexBytes(input: Uint8Array) {
	return createHash('md5').update(input).digest('hex')
}

function xmlEscape(value: string) {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;')
}

function errorXml({ code, message }: { code: string; message: string }) {
	return `<?xml version="1.0" encoding="UTF-8"?>
<Error>
  <Code>${xmlEscape(code)}</Code>
  <Message>${xmlEscape(message)}</Message>
  <Resource></Resource>
  <RequestId>MOCKREQUESTID</RequestId>
</Error>`
}

function listObjectsV2Xml({
	bucket,
	prefix,
	keys,
	store,
}: {
	bucket: string
	prefix: string
	keys: string[]
	store: Map<string, StoredObject>
}) {
	// S3 ListObjectsV2 returns ISO-8601 timestamps in the XML payload.
	const now = new Date().toISOString()
	const contents = keys
		.map((k) => {
			const obj = store.get(k)
			const etag = obj?.etag ?? md5Hex(k)
			const size = obj?.size ?? 0
			return `
  <Contents>
    <Key>${xmlEscape(k)}</Key>
    <LastModified>${xmlEscape(now)}</LastModified>
    <ETag>"${xmlEscape(etag)}"</ETag>
    <Size>${size}</Size>
    <StorageClass>STANDARD</StorageClass>
  </Contents>`
		})
		.join('')

	return `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Name>${xmlEscape(bucket)}</Name>
  <Prefix>${xmlEscape(prefix)}</Prefix>
  <KeyCount>${keys.length}</KeyCount>
  <MaxKeys>1000</MaxKeys>
  <IsTruncated>false</IsTruncated>${contents}
</ListBucketResult>`
}

function accessKeyFromAwsV4AuthorizationHeader(raw: string | null) {
	if (!raw) return null
	// AWS4-HMAC-SHA256 Credential=<accessKeyId>/<date>/<region>/<service>/aws4_request, ...
	const match = /\bCredential=(?<accessKey>[^/,\s]+)\//i.exec(raw)
	const accessKey = match?.groups?.accessKey?.trim()
	return accessKey || null
}

function shouldMockR2(request: Request) {
	// Align with other mocks: only intercept when the request explicitly opts in.
	// For AWS SDK v3, access key id appears in the SigV4 Authorization header.
	const accessKey = accessKeyFromAwsV4AuthorizationHeader(
		request.headers.get('authorization'),
	)
	return Boolean(accessKey && accessKey.startsWith('MOCK'))
}

function getOrCreateBucketStore(bucket: string) {
	let store = bucketStores.get(bucket)
	if (!store) {
		store = new Map<string, StoredObject>()
		const semanticSearchBucket = process.env.R2_BUCKET?.trim() || null
		if (semanticSearchBucket && bucket === semanticSearchBucket) {
			const ignoreListKey =
				(typeof process.env.SEMANTIC_SEARCH_IGNORE_LIST_KEY === 'string' &&
				process.env.SEMANTIC_SEARCH_IGNORE_LIST_KEY.trim()
					? process.env.SEMANTIC_SEARCH_IGNORE_LIST_KEY.trim()
					: 'manifests/ignore-list.json')

			const now = new Date().toUTCString()
			for (const [key, value] of Object.entries(FIXTURE_MANIFEST_OBJECTS)) {
				const json = JSON.stringify(value, null, 2)
				const body = utf8Bytes(json)
				store.set(key, {
					body,
					contentType: 'application/json; charset=utf-8',
					lastModified: now,
					etag: md5HexBytes(body),
					size: body.byteLength,
				})
			}
			// This can be missing and the app will fall back, but seeding it keeps the
			// UX consistent and allows PUT/GET cycles in mocks.
			const ignoreListJson = JSON.stringify(
				{ version: 1, updatedAt: now, patterns: [] },
				null,
				2,
			)
			const ignoreListBody = utf8Bytes(ignoreListJson)
			store.set(ignoreListKey, {
				body: ignoreListBody,
				contentType: 'application/json; charset=utf-8',
				lastModified: now,
				etag: md5HexBytes(ignoreListBody),
				size: ignoreListBody.byteLength,
			})
		}

		bucketStores.set(bucket, store)
	}
	return store
}

function parsePathStyleBucketAndKey(pathname: string) {
	const trimmed = pathname.replace(/^\/+/, '')
	const [bucket, ...rest] = trimmed.split('/')
	const key = rest.length ? rest.join('/') : null
	return {
		bucket: bucket ? decodeURIComponent(bucket) : null,
		key: key ? decodeURIComponent(key) : null,
	}
}

function isR2Host(url: URL) {
	return /(^|\.)r2\.cloudflarestorage\.com$/i.test(url.hostname)
}

export const cloudflareR2Handlers: Array<HttpHandler> = [
	http.all(/https?:\/\/[^/]*r2\.cloudflarestorage\.com\/.*/, async ({ request }) => {
		const url = new URL(request.url)
		if (!isR2Host(url)) return passthrough()
		if (!shouldMockR2(request)) return passthrough()

		const { bucket, key } = parsePathStyleBucketAndKey(url.pathname)
		if (!bucket) return passthrough()

		const store = getOrCreateBucketStore(bucket)

		// ListObjectsV2: GET /:bucket?list-type=2&prefix=...
		if (request.method === 'GET' && url.searchParams.get('list-type') === '2') {
			const prefix = url.searchParams.get('prefix') ?? ''
			const keys = [...store.keys()]
				.filter((k) => k.startsWith(prefix))
				.sort((a, b) => a.localeCompare(b))
			return new HttpResponse(listObjectsV2Xml({ bucket, prefix, keys, store }), {
				status: 200,
				headers: {
					'Content-Type': 'application/xml; charset=utf-8',
					'Cache-Control': 'no-store',
				},
			})
		}

		// DeleteObject: DELETE /:bucket/:key
		if (request.method === 'DELETE') {
			if (key) store.delete(key)
			return new HttpResponse('', { status: 204 })
		}

		// GetObject: GET /:bucket/:key
		if (request.method === 'GET') {
			if (!key) {
				return new HttpResponse(errorXml({ code: 'NoSuchKey', message: 'Missing Key' }), {
					status: 404,
					headers: { 'Content-Type': 'application/xml; charset=utf-8' },
				})
			}
			const obj = store.get(key)
			if (!obj) {
				return new HttpResponse(
					errorXml({ code: 'NoSuchKey', message: 'The specified key does not exist.' }),
					{
						status: 404,
						headers: { 'Content-Type': 'application/xml; charset=utf-8' },
					},
				)
			}
			const range = request.headers.get('range')
			if (range) {
				const match = /^bytes=(?<start>\d+)-(?<end>\d+)$/i.exec(range)
				const start = match?.groups?.start ? Number(match.groups.start) : NaN
				const end = match?.groups?.end ? Number(match.groups.end) : NaN
				if (
					Number.isFinite(start) &&
					Number.isFinite(end) &&
					start >= 0 &&
					end >= start &&
					start < obj.size
				) {
					const safeEnd = Math.min(end, obj.size - 1)
					const chunk = obj.body.slice(start, safeEnd + 1)
					return new HttpResponse(chunk, {
						status: 206,
						headers: {
							'Content-Type': obj.contentType,
							'Content-Length': String(chunk.byteLength),
							'Content-Range': `bytes ${start}-${safeEnd}/${obj.size}`,
							'Accept-Ranges': 'bytes',
							ETag: `"${obj.etag}"`,
							'Last-Modified': obj.lastModified,
							'Cache-Control': 'no-store',
						},
					})
				}
			}
			return new HttpResponse(obj.body, {
				status: 200,
				headers: {
					'Content-Type': obj.contentType,
					'Content-Length': String(obj.size),
					'Accept-Ranges': 'bytes',
					ETag: `"${obj.etag}"`,
					'Last-Modified': obj.lastModified,
					'Cache-Control': 'no-store',
				},
			})
		}

		// PutObject: PUT /:bucket/:key
		if (request.method === 'PUT') {
			if (!key) {
				return new HttpResponse(
					errorXml({ code: 'InvalidRequest', message: 'Missing Key' }),
					{
						status: 400,
						headers: { 'Content-Type': 'application/xml; charset=utf-8' },
					},
				)
			}
			const bytes = new Uint8Array(await request.arrayBuffer())
			const contentType =
				(request.headers.get('content-type') ?? '').trim() ||
				'application/octet-stream'
			const etag = md5HexBytes(bytes)
			const lastModified = new Date().toUTCString()
			store.set(key, {
				body: bytes,
				contentType,
				etag,
				lastModified,
				size: bytes.byteLength,
			})
			return new HttpResponse('', {
				status: 200,
				headers: {
					ETag: `"${etag}"`,
					'Last-Modified': lastModified,
				},
			})
		}

		return passthrough()
	}),
]

