type ErrorResponse = {
	ok: false
	error: string
}

type HealthResponse = {
	ok: true
}

function json(data: ErrorResponse | HealthResponse, init?: ResponseInit) {
	return Response.json(data, init)
}

function methodNotAllowed() {
	return json(
		{ ok: false, error: 'Method not allowed' },
		{ status: 405, headers: { Allow: 'GET' } },
	)
}

export async function handleRequest(request: Request) {
	const url = new URL(request.url)

	if (url.pathname === '/health') {
		if (request.method !== 'GET') return methodNotAllowed()
		return json({ ok: true })
	}

	return json({ ok: false, error: 'Not found' }, { status: 404 })
}

export default {
	async fetch(request: Request) {
		return await handleRequest(request)
	},
} satisfies ExportedHandler
