const HARD_404_PREFIXES = [
	'/build/',
	'/images/',
	'/fonts/',
	'/favicons/',
] as const

type AssetsBinding = {
	fetch(request: Request): Response | Promise<Response>
}

export function isHard404AssetPath(pathname: string) {
	return HARD_404_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function getAssetCacheControl(pathname: string) {
	if (pathname === '/build/info.json') {
		return 'no-cache'
	}
	if (pathname.startsWith('/build/') || pathname.startsWith('/fonts/')) {
		return 'public, max-age=31536000, immutable'
	}
	return 'public, max-age=604800'
}

export async function serveStaticAsset(
	request: Request,
	assets: AssetsBinding,
) {
	if (request.method !== 'GET' && request.method !== 'HEAD') {
		return null
	}

	const url = new URL(request.url)
	const response = await assets.fetch(request)

	if (response.status === 404) {
		if (isHard404AssetPath(url.pathname)) {
			return new Response('Not found', { status: 404 })
		}
		return null
	}

	const headers = new Headers(response.headers)
	headers.set('cache-control', getAssetCacheControl(url.pathname))

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	})
}
