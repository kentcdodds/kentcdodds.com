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

const imageIdToSourcePath = new Map(
	Object.values(imagesManifest.assets).map((asset) => [asset.id, asset.sourcePath]),
)
const videoIdToSourcePath = new Map(
	Object.values(videosManifest.assets).map((asset) => [asset.id, asset.sourcePath]),
)

const mockMediaImageBase64 =
	'UklGRhoBAABXRUJQVlA4IA4BAABwCgCdASpkAEMAPqVInUq5sy+hqvqpuzAUiWcG+BsvrZQel/iYPLGE154ZiYwzeF8UJRAKZ0oAzLdTpjlp8qBuGwW1ntMTe6iQZbxzyP4gBeg7X7SH7NwyBcUDAAD+8MrTwbAD8OLmsoaL1QDPwEE+GrfqLQPn6xkgFHCB8lyjV3K2RvcQ7pSvgA87LOVuDtMrtkm+tTV0x1RcIe4Uvb6J+yygkV48DSejuyrMWrYgoZyjkf/0/L9+bAZgCam6+oHqjBSWTq5jF7wzBxYwfoGY7OdYZOdeGb4euuuLaCzDHz/QRbDCaIsJWJW3Jo4bkbz44AI/8UfFTGX4tMTRcKLXTDIviU+/u7UnlVaDQAA='

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
			if (request.method === 'HEAD') {
				return new Response(null, {
					status: 200,
					headers: {
						'content-type': url.pathname.startsWith('/stream/')
							? 'video/mp4'
							: 'image/webp',
						'cache-control': 'no-store',
					},
				})
			}
			return new Response(decodeBase64(mockMediaImageBase64), {
				status: 200,
				headers: {
					'content-type': url.pathname.startsWith('/stream/')
						? 'video/mp4'
						: 'image/webp',
					'cache-control': 'no-store',
				},
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

function normalizeSourcePath(sourcePath: string) {
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

function hasAllowedExtension(filePath: string, extensions: Set<string>) {
	const extension = filePath.includes('.')
		? `.${filePath.split('.').pop()?.toLowerCase() ?? ''}`
		: ''
	return extensions.has(extension)
}

function decodeBase64(value: string) {
	const binary = atob(value)
	const bytes = new Uint8Array(binary.length)
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index)
	}
	return bytes
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
