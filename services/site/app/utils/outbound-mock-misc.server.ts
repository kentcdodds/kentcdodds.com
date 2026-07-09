function json(data: unknown, init?: ResponseInit) {
	return Response.json(data, init)
}

export async function maybeHandleMiscMockFetch(request: Request) {
	const url = new URL(request.url)

	if (
		url.hostname === 'verifyright.co' &&
		request.method === 'GET' &&
		/^\/verify\/[^/]+$/.test(url.pathname)
	) {
		return json({ status: true })
	}

	if (
		url.hostname === 'www.gravatar.com' &&
		request.method === 'HEAD' &&
		/^\/avatar\/[^/]+$/.test(url.pathname)
	) {
		return new Response(null, { status: 404 })
	}

	return null
}
