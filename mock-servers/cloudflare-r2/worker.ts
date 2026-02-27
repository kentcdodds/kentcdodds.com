import fs from 'node:fs/promises'
import path from 'node:path'

type Env = {
	R2_MOCK_CACHE_DIRECTORY?: string
}

type RequestLogEntry = {
	id: number
	method: string
	path: string
	query: string
	createdAt: string
}

type StoredObject = {
	body: Uint8Array
	contentType: string
	lastModified: string
	etag: string
	size: number
}

const requestLog: Array<RequestLogEntry> = []
let nextRequestId = 1

const bucketStores = new Map<string, Map<string, StoredObject>>()
const hydratedBuckets = new Set<string>()

export default {
	async fetch(
		request: Request,
		env: Env,
		_unusedCtx: unknown,
	): Promise<Response> {
		const url = new URL(request.url)
		const persistenceDirectory = getPersistenceDirectory(env)
		recordRequest({
			method: request.method,
			path: url.pathname,
			query: url.search,
		})

		if (url.pathname === '/__mocks/meta') {
			return jsonResponse({
				service: 'cloudflare-r2',
				description: 'Mock Cloudflare R2 S3-compatible worker',
				dashboard: '/__mocks',
				themeSupport: ['light', 'dark'],
				responsive: true,
				requestCount: requestLog.length,
			})
		}

		if (url.pathname === '/__mocks/requests') {
			return jsonResponse({ requests: [...requestLog].reverse() })
		}

		if (url.pathname === '/__mocks/reset' && request.method === 'POST') {
			requestLog.length = 0
			nextRequestId = 1
			bucketStores.clear()
			hydratedBuckets.clear()
			const preserveDisk = url.searchParams.get('preserveDisk') === 'true'
			if (persistenceDirectory && !preserveDisk) {
				await clearPersistenceDirectory(persistenceDirectory)
			}
			return jsonResponse({ success: true })
		}

		if (url.pathname === '/__mocks') {
			return htmlResponse(renderDashboard())
		}

		const { bucket, key } = parsePathStyleBucketAndKey(url.pathname)
		if (!bucket) {
			return xmlResponse(
				errorXml({
					code: 'InvalidRequest',
					message: 'Missing bucket path segment.',
				}),
				400,
			)
		}
		const store = getOrCreateBucketStore(bucket)
		try {
			await hydrateBucketStoreFromDisk({
				store,
				bucket,
				persistenceDirectory,
			})
		} catch (error: unknown) {
			logPersistenceWarning('hydrate failed', error)
		}

		if (request.method === 'GET' && url.searchParams.get('list-type') === '2') {
			const prefix = url.searchParams.get('prefix') ?? ''
			const keys = [...store.keys()]
				.filter((entry) => entry.startsWith(prefix))
				.sort((left, right) => left.localeCompare(right))
			return xmlResponse(listObjectsV2Xml({ bucket, prefix, keys, store }), 200)
		}

		if (request.method === 'DELETE') {
			if (key) {
				store.delete(key)
				if (persistenceDirectory) {
					await deleteStoredObjectFromDisk({
						bucket,
						key,
						persistenceDirectory,
					})
				}
			}
			return new Response(null, { status: 204 })
		}

		if (request.method === 'PUT') {
			if (!key) {
				return xmlResponse(
					errorXml({
						code: 'InvalidRequest',
						message: 'Missing object key.',
					}),
					400,
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
			if (persistenceDirectory) {
				try {
					await writeStoredObjectToDisk({
						bucket,
						key,
						object: {
							body: bytes,
							contentType,
							etag,
							lastModified,
							size: bytes.byteLength,
						},
						persistenceDirectory,
					})
				} catch (error: unknown) {
					logPersistenceWarning('write failed', error)
				}
			}
			return new Response(null, {
				status: 200,
				headers: {
					etag: `"${etag}"`,
					'last-modified': lastModified,
				},
			})
		}

		if (request.method === 'HEAD') {
			if (!key) {
				return xmlResponse(
					errorXml({
						code: 'NoSuchKey',
						message: 'Missing object key.',
					}),
					404,
				)
			}
			let object = store.get(key)
			if (!object && persistenceDirectory) {
				const persistedObject = await readStoredObjectFromDisk({
					bucket,
					key,
					persistenceDirectory,
				})
				if (persistedObject) {
					store.set(key, persistedObject)
					object = persistedObject
				}
			}
			if (!object) {
				return xmlResponse(
					errorXml({
						code: 'NoSuchKey',
						message: 'The specified key does not exist.',
					}),
					404,
				)
			}
			return new Response(null, {
				status: 200,
				headers: {
					'content-type': object.contentType,
					'content-length': String(object.size),
					etag: `"${object.etag}"`,
					'last-modified': object.lastModified,
					'cache-control': 'no-store',
				},
			})
		}

		if (request.method === 'GET') {
			if (!key) {
				return xmlResponse(
					errorXml({
						code: 'NoSuchKey',
						message: 'Missing object key.',
					}),
					404,
				)
			}
			let object = store.get(key)
			if (!object && persistenceDirectory) {
				const persistedObject = await readStoredObjectFromDisk({
					bucket,
					key,
					persistenceDirectory,
				})
				if (persistedObject) {
					store.set(key, persistedObject)
					object = persistedObject
				}
			}
			if (!object) {
				return xmlResponse(
					errorXml({
						code: 'NoSuchKey',
						message: 'The specified key does not exist.',
					}),
					404,
				)
			}
			const range = parseRange(
				request.headers.get('range'),
				object.size,
			)
			if (range) {
				const chunk = object.body.slice(range.start, range.end + 1)
				return new Response(new Blob([new Uint8Array(chunk)]), {
					status: 206,
					headers: {
						'content-type': object.contentType,
						'content-length': String(chunk.byteLength),
						'content-range': `bytes ${range.start}-${range.end}/${object.size}`,
						'accept-ranges': 'bytes',
						etag: `"${object.etag}"`,
						'last-modified': object.lastModified,
						'cache-control': 'no-store',
					},
				})
			}

			return new Response(new Blob([new Uint8Array(object.body)]), {
				status: 200,
				headers: {
					'content-type': object.contentType,
					'content-length': String(object.size),
					'accept-ranges': 'bytes',
					etag: `"${object.etag}"`,
					'last-modified': object.lastModified,
					'cache-control': 'no-store',
				},
			})
		}

		return xmlResponse(
			errorXml({
				code: 'MethodNotAllowed',
				message: `Unsupported method ${request.method}`,
			}),
			405,
		)
	},
}

function parsePathStyleBucketAndKey(pathname: string) {
	const trimmed = pathname.replace(/^\/+/, '')
	const [bucketRaw, ...rest] = trimmed.split('/')
	const bucket = bucketRaw ? decodeURIComponent(bucketRaw) : null
	const key = rest.length > 0 ? decodeURIComponent(rest.join('/')) : null
	return { bucket, key }
}

function getOrCreateBucketStore(bucket: string) {
	let store = bucketStores.get(bucket)
	if (!store) {
		store = new Map<string, StoredObject>()
		bucketStores.set(bucket, store)
	}
	return store
}

function getPersistenceDirectory(env: Env) {
	const configuredDirectory =
		env.R2_MOCK_CACHE_DIRECTORY?.trim() ||
		readProcessEnv('R2_MOCK_CACHE_DIRECTORY') ||
		'/tmp/mock-r2-cache'
	return resolveAbsolutePath(configuredDirectory)
}

function resolveAbsolutePath(targetPath: string) {
	if (!targetPath) return null
	if (path.isAbsolute(targetPath)) return targetPath
	return path.join(process.cwd(), targetPath)
}

function readProcessEnv(key: string) {
	try {
		return process.env[key]
	} catch {
		return undefined
	}
}

function logPersistenceWarning(message: string, error: unknown) {
	console.warn(`[cloudflare-r2-mock] ${message}`, error)
}

function getBucketDirectoryPath({
	persistenceDirectory,
	bucket,
}: {
	persistenceDirectory: string
	bucket: string
}) {
	return path.join(persistenceDirectory, encodePathSegment(bucket))
}

function getObjectBodyPath({
	persistenceDirectory,
	bucket,
	key,
}: {
	persistenceDirectory: string
	bucket: string
	key: string
}) {
	const keySegments = key
		.split('/')
		.filter(Boolean)
		.map((segment) => encodePathSegment(segment))
	return path.join(
		getBucketDirectoryPath({ persistenceDirectory, bucket }),
		...keySegments,
	)
}

function getObjectMetadataPath(paths: { objectBodyPath: string }) {
	return `${paths.objectBodyPath}.metadata.json`
}

function encodePathSegment(value: string) {
	return encodeURIComponent(value)
}

function decodePathSegment(value: string) {
	return decodeURIComponent(value)
}

async function writeStoredObjectToDisk({
	persistenceDirectory,
	bucket,
	key,
	object,
}: {
	persistenceDirectory: string
	bucket: string
	key: string
	object: StoredObject
}) {
	const objectBodyPath = getObjectBodyPath({ persistenceDirectory, bucket, key })
	const objectMetadataPath = getObjectMetadataPath({ objectBodyPath })
	await fs.mkdir(path.dirname(objectBodyPath), { recursive: true })
	await fs.writeFile(objectBodyPath, object.body)
	await fs.writeFile(
		objectMetadataPath,
		JSON.stringify(
			{
				contentType: object.contentType,
				lastModified: object.lastModified,
				etag: object.etag,
			},
			null,
			2,
		),
	)
}

async function readStoredObjectFromDisk({
	persistenceDirectory,
	bucket,
	key,
}: {
	persistenceDirectory: string
	bucket: string
	key: string
}) {
	const objectBodyPath = getObjectBodyPath({ persistenceDirectory, bucket, key })
	const objectMetadataPath = getObjectMetadataPath({ objectBodyPath })
	const [bodyBuffer, metadataBuffer] = await Promise.all([
		fs.readFile(objectBodyPath).catch(() => null),
		fs.readFile(objectMetadataPath, 'utf8').catch(() => null),
	])
	if (!bodyBuffer || !metadataBuffer) return null
	let metadata: {
		contentType?: string
		lastModified?: string
		etag?: string
	}
	try {
		metadata = JSON.parse(metadataBuffer) as {
			contentType?: string
			lastModified?: string
			etag?: string
		}
	} catch {
		return null
	}
	const body = new Uint8Array(bodyBuffer)
	return {
		body,
		contentType: metadata.contentType || 'application/octet-stream',
		lastModified: metadata.lastModified || new Date().toUTCString(),
		etag: metadata.etag || md5HexBytes(body),
		size: body.byteLength,
	} satisfies StoredObject
}

async function deleteStoredObjectFromDisk({
	persistenceDirectory,
	bucket,
	key,
}: {
	persistenceDirectory: string
	bucket: string
	key: string
}) {
	const objectBodyPath = getObjectBodyPath({ persistenceDirectory, bucket, key })
	const objectMetadataPath = getObjectMetadataPath({ objectBodyPath })
	await Promise.all([
		fs.unlink(objectBodyPath).catch(() => {}),
		fs.unlink(objectMetadataPath).catch(() => {}),
	])
}

async function clearPersistenceDirectory(persistenceDirectory: string) {
	await fs.rm(persistenceDirectory, { recursive: true, force: true }).catch(() => {})
}

async function hydrateBucketStoreFromDisk({
	store,
	persistenceDirectory,
	bucket,
}: {
	store: Map<string, StoredObject>
	persistenceDirectory: string | null
	bucket: string
}) {
	if (!persistenceDirectory) return
	const hydrationId = `${persistenceDirectory}::${bucket}`
	if (hydratedBuckets.has(hydrationId)) return
	hydratedBuckets.add(hydrationId)

	const bucketDirectory = getBucketDirectoryPath({ persistenceDirectory, bucket })
	const metadataPaths = await collectMetadataPaths(bucketDirectory)
	for (const metadataPath of metadataPaths) {
		const objectBodyPath = metadataPath.slice(
			0,
			'.metadata.json'.length * -1,
		)
		const relativeObjectPath = path.relative(bucketDirectory, objectBodyPath)
		if (!relativeObjectPath || relativeObjectPath.startsWith('..')) continue
		const key = relativeObjectPath
			.split(path.sep)
			.map((segment) => decodePathSegment(segment))
			.join('/')
		const object = await readStoredObjectFromDisk({
			persistenceDirectory,
			bucket,
			key,
		})
		if (!object) continue
		store.set(key, object)
	}
}

async function collectMetadataPaths(directoryPath: string): Promise<Array<string>> {
	const entries = await fs.readdir(directoryPath, { withFileTypes: true }).catch(() => [])
	const metadataPaths: Array<string> = []
	for (const entry of entries) {
		const entryPath = path.join(directoryPath, entry.name)
		if (entry.isDirectory()) {
			metadataPaths.push(...(await collectMetadataPaths(entryPath)))
			continue
		}
		if (entry.isFile() && entry.name.endsWith('.metadata.json')) {
			metadataPaths.push(entryPath)
		}
	}
	return metadataPaths
}

function parseRange(value: string | null, size: number) {
	if (!value) return null
	const match = /^bytes=(?<start>\d+)-(?<end>\d+)$/i.exec(value)
	const start = Number(match?.groups?.start)
	const end = Number(match?.groups?.end)
	if (!Number.isFinite(start) || !Number.isFinite(end)) return null
	if (start < 0 || end < start || start >= size) return null
	return { start, end: Math.min(end, size - 1) }
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
	const now = new Date().toISOString()
	const contents = keys
		.map((key) => {
			const object = store.get(key)
			const etag = object?.etag ?? md5HexString(key)
			const size = object?.size ?? 0
			return `
  <Contents>
    <Key>${xmlEscape(key)}</Key>
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

function errorXml({ code, message }: { code: string; message: string }) {
	return `<?xml version="1.0" encoding="UTF-8"?>
<Error>
  <Code>${xmlEscape(code)}</Code>
  <Message>${xmlEscape(message)}</Message>
  <Resource></Resource>
  <RequestId>MOCKREQUESTID</RequestId>
</Error>`
}

function xmlEscape(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;')
}

function md5HexBytes(bytes: Uint8Array) {
	return md5HexString(new TextDecoder().decode(bytes))
}


function md5HexString(value: string) {
	const hashed = simpleHash(value)
	return Array.from(hashed)
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('')
}

function simpleHash(text: string) {
	const bytes = new TextEncoder().encode(text)
	const hash = new Uint8Array(16)
	for (let index = 0; index < bytes.length; index += 1) {
		const value = bytes[index] ?? 0
		hash[index % hash.length] = (hash[index % hash.length]! + value + index) % 256
	}
	return hash
}

function recordRequest({
	method,
	path,
	query,
}: {
	method: string
	path: string
	query: string
}) {
	requestLog.push({
		id: nextRequestId++,
		method,
		path,
		query,
		createdAt: new Date().toISOString(),
	})
	if (requestLog.length > 500) {
		requestLog.shift()
	}
}

function jsonResponse(data: unknown, status = 200) {
	return new Response(JSON.stringify(data, null, 2), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'cache-control': 'no-store',
		},
	})
}

function xmlResponse(body: string, status: number) {
	return new Response(body, {
		status,
		headers: {
			'content-type': 'application/xml; charset=utf-8',
			'cache-control': 'no-store',
		},
	})
}

function htmlResponse(html: string) {
	return new Response(html, {
		headers: {
			'content-type': 'text/html; charset=utf-8',
			'cache-control': 'no-store',
		},
	})
}

function renderDashboard() {
	const rows = [...requestLog]
		.reverse()
		.slice(0, 80)
		.map(
			(entry) => `<tr>
      <td>${entry.id}</td>
      <td>${escapeHtml(entry.method)}</td>
      <td>${escapeHtml(entry.path + entry.query)}</td>
      <td>${escapeHtml(entry.createdAt)}</td>
    </tr>`,
		)
		.join('\n')
	return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cloudflare R2 Mock Dashboard</title>
    <style>
      :root { color-scheme: light dark; --bg: #fff; --fg: #0f172a; --muted: #64748b; --border: #cbd5e1; }
      @media (prefers-color-scheme: dark) { :root { --bg: #0b1120; --fg: #e2e8f0; --muted: #94a3b8; --border: #334155; } }
      body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: var(--bg); color: var(--fg); }
      .layout { padding: 1rem; max-width: 1100px; margin: 0 auto; }
      .summary { color: var(--muted); }
      .toolbar { display: flex; gap: 0.5rem; margin: 1rem 0; flex-wrap: wrap; }
      button { border: 1px solid var(--border); background: transparent; color: inherit; border-radius: 0.5rem; padding: 0.5rem 0.75rem; cursor: pointer; }
      table { width: 100%; border-collapse: collapse; border: 1px solid var(--border); }
      th, td { border-bottom: 1px solid var(--border); padding: 0.5rem; text-align: left; }
      @media (max-width: 720px) { table, thead, tbody, tr, th, td { display: block; } thead { display: none; } }
    </style>
  </head>
  <body>
    <main class="layout">
      <h1>Cloudflare R2 Mock Dashboard</h1>
      <p class="summary">S3-compatible request history for path-style routes (<code>/:bucket/:key</code>).</p>
      <div class="toolbar">
        <button id="refresh" type="button">Refresh</button>
        <button id="reset" type="button">Reset state</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Method</th>
            <th>Path</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="4">No requests yet.</td></tr>'}
        </tbody>
      </table>
    </main>
    <script>
      document.getElementById('refresh')?.addEventListener('click', () => window.location.reload())
      document.getElementById('reset')?.addEventListener('click', async () => {
        await fetch('/__mocks/reset', { method: 'POST' })
        window.location.reload()
      })
    </script>
  </body>
</html>`
}

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;')
}
