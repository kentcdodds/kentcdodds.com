export const D1_BOOKMARK_COOKIE_NAME = 'kcd_d1_bookmark'
const D1_BOOKMARK_MAX_AGE_SEC = 600

export function getD1BookmarkFromRequest(request: Request): string | undefined {
	const cookieHeader = request.headers.get('cookie')
	if (!cookieHeader) return undefined
	for (const part of cookieHeader.split(';')) {
		const trimmed = part.trim()
		if (!trimmed.startsWith(`${D1_BOOKMARK_COOKIE_NAME}=`)) continue
		const value = trimmed.slice(D1_BOOKMARK_COOKIE_NAME.length + 1)
		return value ? decodeURIComponent(value) : undefined
	}
	return undefined
}

export function appendD1BookmarkCookie(
	headers: Headers,
	bookmark: string,
) {
	headers.append(
		'Set-Cookie',
		`${D1_BOOKMARK_COOKIE_NAME}=${encodeURIComponent(bookmark)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${D1_BOOKMARK_MAX_AGE_SEC}`,
	)
}

export function applyD1BookmarkCookie(
	request: Request,
	response: Response,
	bookmark: string | null | undefined,
	inboundBookmark: string | undefined,
): Response {
	if (
		!bookmark ||
		bookmark === inboundBookmark ||
		bookmark === 'first-unconstrained' ||
		bookmark === 'first-primary'
	) {
		return response
	}
	const headers = new Headers(response.headers)
	appendD1BookmarkCookie(headers, bookmark)
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	})
}
