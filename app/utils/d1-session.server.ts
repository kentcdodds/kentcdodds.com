const BOOKMARK_HEADER = 'x-d1-bookmark'
const BOOKMARK_COOKIE = 'd1-bookmark'

type D1SessionFactory = {
	withSession: (bookmark?: string) => unknown
}

type D1SessionBookmarkReader = {
	getBookmark: () => string | null | undefined
}

export function readD1Bookmark(request: Request) {
	const headerBookmark = request.headers.get(BOOKMARK_HEADER)?.trim()
	if (headerBookmark) return headerBookmark

	const cookieHeader = request.headers.get('Cookie')
	if (!cookieHeader) return null
	for (const item of cookieHeader.split(';')) {
		const [name, ...valueParts] = item.trim().split('=')
		if (name !== BOOKMARK_COOKIE) continue
		const rawValue = valueParts.join('=')
		if (!rawValue) continue
		const decoded = safeDecodeURIComponent(rawValue).trim()
		if (decoded) return decoded
	}
	return null
}

export function withD1Session(db: unknown, bookmark: string | null) {
	if (!isD1SessionFactory(db)) return db
	if (bookmark) return db.withSession(bookmark)
	return db.withSession()
}

export function getD1Bookmark(dbSession: unknown) {
	if (!isD1SessionBookmarkReader(dbSession)) return null
	const bookmark = dbSession.getBookmark()
	if (typeof bookmark !== 'string') return null
	const trimmed = bookmark.trim()
	return trimmed.length ? trimmed : null
}

export function applyD1Bookmark(response: Response, bookmark: string | null) {
	if (!bookmark) return response

	const headers = new Headers(response.headers)
	headers.set(BOOKMARK_HEADER, bookmark)
	headers.append(
		'Set-Cookie',
		`${BOOKMARK_COOKIE}=${encodeURIComponent(bookmark)}; Path=/; HttpOnly; Secure; SameSite=Lax`,
	)

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	})
}

function isD1SessionFactory(value: unknown): value is D1SessionFactory {
	return (
		typeof value === 'object' &&
		value !== null &&
		'withSession' in value &&
		typeof value.withSession === 'function'
	)
}

function isD1SessionBookmarkReader(
	value: unknown,
): value is D1SessionBookmarkReader {
	return (
		typeof value === 'object' &&
		value !== null &&
		'getBookmark' in value &&
		typeof value.getBookmark === 'function'
	)
}

function safeDecodeURIComponent(value: string) {
	try {
		return decodeURIComponent(value)
	} catch {
		return value
	}
}
