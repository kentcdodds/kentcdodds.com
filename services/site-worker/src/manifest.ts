export type MdxManifest = {
	version: string
	r2Key: string
}

export type MdxManifestStore = {
	get(key: string): Promise<string | null>
}

const MANIFEST_KEY = 'mdx-manifest:current'
const MANIFEST_TTL_MS = 15_000

type ManifestCache = {
	manifest: MdxManifest | null
	fetchedAt: number
}

let manifestCache: ManifestCache | undefined

export function clearManifestCache() {
	manifestCache = undefined
}

export async function readMdxManifest(
	contentKv: MdxManifestStore,
	{ bypassCache = false }: { bypassCache?: boolean } = {},
): Promise<MdxManifest | null> {
	const now = Date.now()
	if (
		!bypassCache &&
		manifestCache &&
		now - manifestCache.fetchedAt < MANIFEST_TTL_MS
	) {
		return manifestCache.manifest
	}

	const raw = await contentKv.get(MANIFEST_KEY)
	if (!raw) {
		manifestCache = { manifest: null, fetchedAt: now }
		return null
	}

	let parsed: MdxManifest
	try {
		parsed = JSON.parse(raw) as MdxManifest
	} catch {
		manifestCache = { manifest: null, fetchedAt: now }
		return null
	}

	if (
		typeof parsed.version !== 'string' ||
		typeof parsed.r2Key !== 'string' ||
		!parsed.version ||
		!parsed.r2Key
	) {
		manifestCache = { manifest: null, fetchedAt: now }
		return null
	}

	manifestCache = { manifest: parsed, fetchedAt: now }
	return parsed
}

export function shouldBypassManifestCache(request: Request) {
	return (
		request.method === 'POST' &&
		new URL(request.url).pathname === '/action/refresh-cache'
	)
}
