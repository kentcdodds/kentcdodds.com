import { createHash } from 'node:crypto'
import imagesManifestData from '../../content/data/media-manifests/images.json'
import videosManifestData from '../../content/data/media-manifests/videos.json'

type MediaManifestAsset = {
	id: string
	checksum: string
	sourcePath: string
	uploadedAt: string
}

type MediaManifest = {
	version: number
	assets: Record<string, MediaManifestAsset>
}

type Env = {
	ASSETS?: {
		fetch(request: Request): Promise<Response>
	}
	MEDIA_PROXY_BASE_URL?: string
	MEDIA_PROXY_CACHE_BASE_URL?: string
	MEDIA_PROXY_CACHE_BUCKET?: string
	MEDIA_R2_PROXY_BASE_URL?: string
	MEDIA_R2_BUCKET?: string
	MEDIA_R2_ENDPOINT?: string
}

type ProxyConfig = {
	baseUrl: string
	strategy: 'path' | 'object-key'
}

type RequestLogEntry = {
	id: number
	method: string
	path: string
	query: string
	createdAt: string
}

const requestLog: Array<RequestLogEntry> = []
let nextRequestId = 1

const imageExtensions = new Set([
	'.png',
	'.jpg',
	'.jpeg',
	'.gif',
	'.webp',
	'.avif',
	'.svg',
])

const videoExtensions = new Set(['.mp4', '.mov', '.m4v', '.webm'])

const imagesManifest = imagesManifestData as MediaManifest
const videosManifest = videosManifestData as MediaManifest

const imageIdToSourcePath = new Map<string, string>()
const imageIdToKey = new Map<string, string>()
for (const [key, asset] of Object.entries(imagesManifest.assets)) {
	imageIdToSourcePath.set(asset.id, asset.sourcePath)
	imageIdToKey.set(asset.id, key)
}

const videoIdToSourcePath = new Map<string, string>()
const videoIdToKey = new Map<string, string>()
for (const [key, asset] of Object.entries(videosManifest.assets)) {
	videoIdToSourcePath.set(asset.id, asset.sourcePath)
	videoIdToKey.set(asset.id, key)
}

export default {
	async fetch(request: Request, env: Env = {}): Promise<Response> {
		const url = new URL(request.url)
		recordRequest({
			method: request.method,
			path: url.pathname,
			query: url.search,
		})

		if (url.pathname === '/__mocks/meta') {
			return jsonResponse({
				service: 'media-images',
				description: 'Mock media image worker',
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
			return jsonResponse({ success: true })
		}

		if (url.pathname === '/__mocks') {
			return htmlResponse(renderDashboard())
		}

		if (
			(url.pathname.startsWith('/images/') ||
				url.pathname.startsWith('/social/') ||
				url.pathname.startsWith('/artwork/call-kent') ||
				url.pathname.startsWith('/stream/')) &&
			(request.method === 'GET' || request.method === 'HEAD')
		) {
			const repoMediaResponse = await tryServeRepoMediaAsset({ request, url, env })
			if (repoMediaResponse) return repoMediaResponse
			const remoteProxyResponse = await tryServeRemoteMediaAsset({
				request,
				url,
				env,
			})
			if (remoteProxyResponse) return remoteProxyResponse
			return buildWireframeFallbackResponse({
				pathname: url.pathname,
				method: request.method,
			})
		}

		return jsonResponse(
			{
				error: `Unhandled mock request: ${request.method} ${url.pathname}`,
			},
			404,
		)
	},
}

async function tryServeRepoMediaAsset({
	request,
	url,
	env,
}: {
	request: Request
	url: URL
	env: Env
}) {
	if (!env.ASSETS) return null
	const paths = getCandidateAssetPaths(url.pathname)
	for (const assetPath of paths) {
		const response = await env.ASSETS.fetch(
			new Request(
				new URL(`/${assetPath.replace(/^\/+/, '')}`, url.origin),
				{ method: request.method },
			),
		)
		if (!response.ok) continue
		const headers = new Headers(response.headers)
		headers.set('cache-control', 'no-store')
		return new Response(
			request.method === 'HEAD' ? null : await response.arrayBuffer(),
			{
				status: response.status,
				headers,
			},
		)
	}
	return null
}

async function tryServeRemoteMediaAsset({
	request,
	url,
	env,
}: {
	request: Request
	url: URL
	env: Env
}) {
	const proxyConfig = resolveMediaProxyConfig(env)
	if (!proxyConfig) return null
	const proxyCacheBaseUrl = buildMediaProxyCacheBaseUrl(env)
	if (proxyConfig.strategy === 'path') {
		const cacheObjectKey = buildProxyCacheObjectKey({
			objectKey: normalizeCachePathKey(url.pathname),
			query: url.search,
		})
		if (proxyCacheBaseUrl) {
			const cachedResponse = await tryServeProxyCacheAsset({
				method: request.method,
				baseUrl: proxyCacheBaseUrl,
				objectKey: cacheObjectKey,
			})
			if (cachedResponse) return cachedResponse
		}

		const proxyUrl = buildProxyPathUrl({
			baseUrl: proxyConfig.baseUrl,
			pathname: url.pathname,
			query: url.search,
		})
		let response: Response
		try {
			response = await fetch(new Request(proxyUrl, { method: request.method }))
		} catch {
			return null
		}
		if (!response.ok) return null
		const responseBytes =
			request.method === 'HEAD'
				? null
				: new Uint8Array(await response.arrayBuffer())
		const responseContentType =
			response.headers.get('content-type')?.trim() ??
			'application/octet-stream'
		if (proxyCacheBaseUrl && responseBytes) {
			void writeProxyCacheAsset({
				baseUrl: proxyCacheBaseUrl,
				objectKey: cacheObjectKey,
				contentType: responseContentType,
				bytes: responseBytes,
			})
		}
		const headers = new Headers(response.headers)
		headers.set('cache-control', 'no-store')
		return new Response(request.method === 'HEAD' ? null : responseBytes, {
			status: response.status,
			headers,
		})
	}

	const keys = getCandidateAssetProxyKeys(url.pathname)
	for (const key of keys) {
		const normalizedKey = key.replace(/^\/+/, '')
		const cacheObjectKey = buildProxyCacheObjectKey({
			objectKey: normalizedKey,
			query: url.search,
		})
		if (proxyCacheBaseUrl) {
			const cachedResponse = await tryServeProxyCacheAsset({
				method: request.method,
				baseUrl: proxyCacheBaseUrl,
				objectKey: cacheObjectKey,
			})
			if (cachedResponse) return cachedResponse
		}
		const proxyUrl = buildProxyObjectUrl({
			baseUrl: proxyConfig.baseUrl,
			objectKey: normalizedKey,
			query: url.search,
		})
		let response: Response
		try {
			response = await fetch(
				new Request(proxyUrl, { method: request.method }),
			)
		} catch {
			continue
		}
		if (!response.ok) continue
		const responseBytes =
			request.method === 'HEAD'
				? null
				: new Uint8Array(await response.arrayBuffer())
		const responseContentType =
			response.headers.get('content-type')?.trim() ??
			'application/octet-stream'
		if (proxyCacheBaseUrl && responseBytes) {
			void writeProxyCacheAsset({
				baseUrl: proxyCacheBaseUrl,
				objectKey: cacheObjectKey,
				contentType: responseContentType,
				bytes: responseBytes,
			})
		}
		const headers = new Headers(response.headers)
		headers.set('cache-control', 'no-store')
		return new Response(
			request.method === 'HEAD' ? null : responseBytes,
			{
				status: response.status,
				headers,
			},
		)
	}
	return null
}

function resolveMediaProxyConfig(env: Env): ProxyConfig | null {
	const directMediaProxyBaseUrl =
		env.MEDIA_PROXY_BASE_URL ?? readProcessEnv('MEDIA_PROXY_BASE_URL')
	if (directMediaProxyBaseUrl?.trim()) {
		return {
			baseUrl: directMediaProxyBaseUrl.trim().replace(/\/+$/, ''),
			strategy: 'path',
		}
	}

	const r2ProxyBaseUrl =
		env.MEDIA_R2_PROXY_BASE_URL ?? readProcessEnv('MEDIA_R2_PROXY_BASE_URL')
	if (r2ProxyBaseUrl?.trim()) {
		return {
			baseUrl: r2ProxyBaseUrl.trim().replace(/\/+$/, ''),
			strategy: 'object-key',
		}
	}

	const derivedR2ProxyBaseUrl = buildPathStyleR2BaseUrl(env)
	if (derivedR2ProxyBaseUrl) {
		return {
			baseUrl: derivedR2ProxyBaseUrl,
			strategy: 'object-key',
		}
	}

	return null
}

function getCandidateAssetPaths(pathname: string) {
	const paths = new Set<string>()
	const normalizedPath = pathname.replace(/\/+$/, '')
	if (normalizedPath.startsWith('/images/')) {
		const imageId = decodeURIComponent(normalizedPath.slice('/images/'.length))
		for (const path of resolveImageSourcePaths(imageId)) {
			paths.add(path)
		}
	}
	if (normalizedPath.startsWith('/stream/')) {
		const streamId = decodeURIComponent(normalizedPath.slice('/stream/'.length))
		for (const path of resolveVideoSourcePaths(streamId)) {
			paths.add(path)
		}
	}
	return [...paths]
}

function getCandidateAssetProxyKeys(pathname: string) {
	const normalizedPath = pathname.replace(/\/+$/, '')
	if (normalizedPath.startsWith('/images/')) {
		const imageId = decodeURIComponent(normalizedPath.slice('/images/'.length))
		return resolveImageProxyKeys(imageId)
	}
	if (normalizedPath.startsWith('/stream/')) {
		const streamId = decodeURIComponent(normalizedPath.slice('/stream/'.length))
		return resolveVideoProxyKeys(streamId)
	}
	return []
}

function normalizeSourcePath(sourcePath: string) {
	if (sourcePath.startsWith('r2://')) return ''
	return sourcePath.replace(/^\/+/, '').replace(/^content\//, '')
}

function resolveImageSourcePaths(imageId: string) {
	const normalizedId = imageId.replace(/^\/+/, '').replace(/^content\//, '')
	const paths = new Set<string>()
	const fromKey = imagesManifest.assets[normalizedId]?.sourcePath
	if (fromKey) paths.add(normalizeSourcePath(fromKey))
	const fromId = imageIdToSourcePath.get(normalizedId)
	if (fromId) paths.add(normalizeSourcePath(fromId))
	if (hasAllowedExtension(normalizedId, imageExtensions)) {
		paths.add(normalizedId)
	}
	return [...paths]
}

function resolveImageProxyKeys(imageId: string) {
	const normalizedId = imageId.replace(/^\/+/, '').replace(/^content\//, '')
	const keys = new Set<string>()
	keys.add(normalizedId)
	const mappedKey = imageIdToKey.get(normalizedId)
	if (mappedKey) keys.add(mappedKey)
	return [...keys]
}

function resolveVideoSourcePaths(streamId: string) {
	const normalizedId = streamId.replace(/^\/+/, '').replace(/^content\//, '')
	const baseId = normalizedId.replace(/\.mp4$/i, '')
	const paths = new Set<string>()
	const candidates = [normalizedId, baseId]
	for (const candidate of candidates) {
		const fromKey = videosManifest.assets[candidate]?.sourcePath
		if (fromKey) paths.add(normalizeSourcePath(fromKey))
		const fromId = videoIdToSourcePath.get(candidate)
		if (fromId) paths.add(normalizeSourcePath(fromId))
		if (hasAllowedExtension(candidate, videoExtensions)) {
			paths.add(candidate)
		}
	}
	return [...paths]
}

function resolveVideoProxyKeys(streamId: string) {
	const normalizedId = streamId.replace(/^\/+/, '').replace(/^content\//, '')
	const baseId = normalizedId.replace(/\.mp4$/i, '')
	const keys = new Set<string>()
	for (const candidate of [normalizedId, baseId]) {
		keys.add(candidate)
		const mappedKey = videoIdToKey.get(candidate)
		if (mappedKey) keys.add(mappedKey)
	}
	const withMp4 = new Set<string>()
	for (const key of keys) {
		withMp4.add(key)
		if (!/\.[a-z0-9]+$/i.test(key)) {
			withMp4.add(`${key}.mp4`)
		}
	}
	return [...withMp4]
}

function hasAllowedExtension(filePath: string, extensions: Set<string>) {
	const extension = filePath.includes('.')
		? `.${filePath.split('.').pop()?.toLowerCase() ?? ''}`
		: ''
	return extensions.has(extension)
}

function buildPathStyleR2BaseUrl(env: Env) {
	const bucket =
		env.MEDIA_R2_BUCKET?.trim() ??
		readProcessEnv('MEDIA_R2_BUCKET') ??
		readProcessEnv('R2_BUCKET')
	const endpoint =
		env.MEDIA_R2_ENDPOINT?.trim() ??
		readProcessEnv('MEDIA_R2_ENDPOINT') ??
		readProcessEnv('R2_ENDPOINT')
	if (!bucket || !endpoint) return null
	return `${endpoint.replace(/\/+$/, '')}/${bucket}`
}

function buildMediaProxyCacheBaseUrl(env: Env) {
	const explicitCacheBaseUrl =
		env.MEDIA_PROXY_CACHE_BASE_URL?.trim() ??
		readProcessEnv('MEDIA_PROXY_CACHE_BASE_URL')
	if (explicitCacheBaseUrl) {
		return explicitCacheBaseUrl.replace(/\/+$/, '')
	}

	const bucket =
		env.MEDIA_PROXY_CACHE_BUCKET?.trim() ??
		readProcessEnv('MEDIA_PROXY_CACHE_BUCKET') ??
		'mock-media-cache'
	const endpoint =
		env.MEDIA_R2_ENDPOINT?.trim() ??
		readProcessEnv('MEDIA_R2_ENDPOINT') ??
		readProcessEnv('R2_ENDPOINT')
	if (!bucket || !endpoint) return null
	return `${endpoint.replace(/\/+$/, '')}/${bucket}`
}

function buildProxyCacheObjectKey({
	objectKey,
	query,
}: {
	objectKey: string
	query: string
}) {
	if (!query) return objectKey
	const queryHash = createHash('sha256').update(query).digest('hex').slice(0, 16)
	return `${objectKey}.__q_${queryHash}`
}

function buildProxyObjectUrl({
	baseUrl,
	objectKey,
	query,
}: {
	baseUrl: string
	objectKey: string
	query: string
}) {
	const encodedObjectKey = objectKey
		.split('/')
		.filter(Boolean)
		.map((segment) => encodeURIComponent(segment))
		.join('/')
	const resolvedUrl = new URL(`${baseUrl.replace(/\/+$/, '')}/${encodedObjectKey}`)
	if (query) {
		resolvedUrl.search = query
	}
	return resolvedUrl.toString()
}

function buildProxyPathUrl({
	baseUrl,
	pathname,
	query,
}: {
	baseUrl: string
	pathname: string
	query: string
}) {
	const resolvedUrl = new URL(`${baseUrl.replace(/\/+$/, '')}${pathname}`)
	if (query) {
		resolvedUrl.search = query
	}
	return resolvedUrl.toString()
}

function normalizeCachePathKey(pathname: string) {
	const normalizedPath = pathname.replace(/^\/+/, '')
	return normalizedPath || 'index'
}

async function tryServeProxyCacheAsset({
	method,
	baseUrl,
	objectKey,
}: {
	method: string
	baseUrl: string
	objectKey: string
}) {
	let response: Response
	try {
		response = await fetch(
			new Request(
				buildProxyObjectUrl({
					baseUrl,
					objectKey,
					query: '',
				}),
				{ method },
			),
		)
	} catch {
		return null
	}
	if (!response.ok) return null
	const headers = new Headers(response.headers)
	headers.set('cache-control', 'no-store')
	return new Response(
		method === 'HEAD' ? null : await response.arrayBuffer(),
		{
			status: response.status,
			headers,
		},
	)
}

async function writeProxyCacheAsset({
	baseUrl,
	objectKey,
	contentType,
	bytes,
}: {
	baseUrl: string
	objectKey: string
	contentType: string
	bytes: Uint8Array
}) {
	const cacheBody = new Uint8Array(bytes)
	try {
		await fetch(
			new Request(
				buildProxyObjectUrl({
					baseUrl,
					objectKey,
					query: '',
				}),
				{
					method: 'PUT',
					headers: {
						'content-type': contentType,
					},
					body: cacheBody,
				},
			),
		)
	} catch {
		// best effort cache write
	}
}

function readProcessEnv(key: string) {
	try {
		return process.env[key]
	} catch {
		return undefined
	}
}

function buildWireframeFallbackResponse({
	pathname,
	method,
}: {
	pathname: string
	method: string
}) {
	const payload = new TextEncoder().encode(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" role="img" aria-label="media placeholder">
<rect width="1200" height="675" fill="#f1f5f9"/>
<rect x="40" y="40" width="1120" height="595" fill="none" stroke="#94a3b8" stroke-width="8"/>
<rect x="120" y="120" width="360" height="240" fill="#cbd5e1"/>
<rect x="540" y="140" width="540" height="24" fill="#94a3b8"/>
<rect x="540" y="190" width="480" height="24" fill="#cbd5e1"/>
<rect x="540" y="240" width="520" height="24" fill="#cbd5e1"/>
<rect x="120" y="410" width="960" height="18" fill="#cbd5e1"/>
<rect x="120" y="450" width="900" height="18" fill="#cbd5e1"/>
<rect x="120" y="490" width="820" height="18" fill="#cbd5e1"/>
<text x="120" y="580" fill="#64748b" font-family="ui-sans-serif,system-ui,sans-serif" font-size="36">media unavailable offline: placeholder</text>
</svg>`,
	)
	return new Response(method === 'HEAD' ? null : payload, {
		status: 200,
		headers: {
			'content-type': pathname.startsWith('/stream/')
				? 'image/svg+xml'
				: 'image/svg+xml',
			'cache-control': 'no-store',
		},
	})
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
	if (requestLog.length > 200) {
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
		.slice(0, 50)
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
    <title>Media Images Mock Dashboard</title>
    <style>
      :root { color-scheme: light dark; --bg: #fff; --fg: #0f172a; --muted: #64748b; --border: #cbd5e1; }
      @media (prefers-color-scheme: dark) { :root { --bg: #0b1120; --fg: #e2e8f0; --muted: #94a3b8; --border: #334155; } }
      body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: var(--bg); color: var(--fg); }
      .layout { padding: 1rem; max-width: 1000px; margin: 0 auto; }
      .summary { color: var(--muted); }
      .toolbar { display: flex; gap: 0.5rem; margin: 1rem 0; flex-wrap: wrap; }
      button { border: 1px solid var(--border); background: transparent; color: inherit; border-radius: 0.5rem; padding: 0.5rem 0.75rem; cursor: pointer; }
      table { width: 100%; border-collapse: collapse; border: 1px solid var(--border); }
      th, td { border-bottom: 1px solid var(--border); padding: 0.5rem; text-align: left; }
      @media (max-width: 700px) { table, thead, tbody, tr, th, td { display: block; } thead { display: none; } }
    </style>
  </head>
  <body>
    <main class="layout">
      <h1>Media Images Mock Dashboard</h1>
      <p class="summary">Serves placeholder image/video responses for media URLs.</p>
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
