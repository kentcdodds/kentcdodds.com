import { z } from 'zod'
import { createLexicalSearchService, type LexicalSearchService } from './lexical-search-service'
import { type Env } from './env'

const queryRequestSchema = z.object({
	query: z.string().trim().min(1),
	topK: z.number().int().min(1).max(100),
})

const deleteRequestSchema = z.object({
	kind: z.enum(['source', 'doc', 'chunk']),
	id: z.string().trim().min(1),
})

const syncRequestSchema = z.object({
	force: z.boolean().optional(),
})

function json(data: unknown, init?: ResponseInit) {
	return Response.json(data, init)
}

function getPathSegments(request: Request) {
	return new URL(request.url).pathname.split('/').filter(Boolean)
}

function isAuthorized(request: Request, env: Env) {
	return (
		request.headers.get('Authorization') ===
		`Bearer ${env.LEXICAL_SEARCH_WORKER_TOKEN}`
	)
}

function unauthorized() {
	return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
}

function methodNotAllowed() {
	return json({ ok: false, error: 'Method not allowed' }, { status: 405 })
}

function parseLimitParam(value: string | null) {
	const parsed = Number(value ?? 100)
	if (!Number.isFinite(parsed)) return 100
	return Math.max(1, Math.min(500, Math.floor(parsed)))
}

export async function handleRequest({
	request,
	env,
	service = createLexicalSearchService(env),
}: {
	request: Request
	env: Env
	service?: LexicalSearchService
}) {
	const url = new URL(request.url)
	const segments = getPathSegments(request)

	if (url.pathname === '/health') {
		return json({ ok: true })
	}

	if (!isAuthorized(request, env)) {
		return unauthorized()
	}

	try {
		if (url.pathname === '/query') {
			if (request.method !== 'POST') return methodNotAllowed()
			const body = await request.json().catch(() => null)
			if (body === null) {
				return json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
			}
			const parsed = queryRequestSchema.parse(body)
			const results = await service.query(parsed)
			return json({ ok: true, results })
		}

		if (url.pathname === '/admin/stats') {
			if (request.method !== 'GET') return methodNotAllowed()
			const stats = await service.getStats()
			return json({ ok: true, stats })
		}

		if (url.pathname === '/admin/overview') {
			if (request.method !== 'GET') return methodNotAllowed()
			const overview = await service.getAdminOverview({
				query: url.searchParams.get('query') ?? '',
				sourceKey: url.searchParams.get('sourceKey') ?? '',
				type: url.searchParams.get('type') ?? '',
				limit: parseLimitParam(url.searchParams.get('limit')),
			})
			return json({ ok: true, overview })
		}

		if (url.pathname === '/admin/sync') {
			if (request.method !== 'POST') return methodNotAllowed()
			const body = await request.json().catch(() => ({}))
			const parsed = syncRequestSchema.parse(body)
			const result = await service.sync(parsed)
			return json({ ok: true, ...result })
		}

		if (url.pathname === '/admin/delete') {
			if (request.method !== 'POST') return methodNotAllowed()
			const body = await request.json()
			const parsed = deleteRequestSchema.parse(body)
			switch (parsed.kind) {
				case 'source':
					return json(await service.deleteSource(parsed.id))
				case 'doc':
					return json(await service.deleteDoc(parsed.id))
				case 'chunk':
					return json(await service.deleteChunk(parsed.id))
			}
		}

		if (segments[0] === 'admin' && segments[1] === 'source' && segments[2]) {
			if (request.method !== 'GET') return methodNotAllowed()
			return json({
				ok: true,
				detail: await service.getSourceDetail(decodeURIComponent(segments[2])),
			})
		}

		if (segments[0] === 'admin' && segments[1] === 'doc' && segments[2]) {
			if (request.method !== 'GET') return methodNotAllowed()
			return json({
				ok: true,
				detail: await service.getDocDetail(decodeURIComponent(segments[2])),
			})
		}

		if (segments[0] === 'admin' && segments[1] === 'chunk' && segments[2]) {
			if (request.method !== 'GET') return methodNotAllowed()
			return json({
				ok: true,
				detail: await service.getChunkDetail(decodeURIComponent(segments[2])),
			})
		}

		return json({ ok: false, error: 'Not found' }, { status: 404 })
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		return json({ ok: false, error: message }, { status: 500 })
	}
}

export default {
	async fetch(request: Request, env: Env) {
		return await handleRequest({ request, env })
	},
}
