import { z, ZodError } from 'zod'
import {
	type SearchWorkerHealthResponse,
	SearchQueryTooLongError,
	type SearchWorkerSearchResponse,
	type SearchWorkerSyncResponse,
} from '@kcd-internal/search-shared'
import { createSearchService, type SearchService } from './search-service'
import { type Env } from './env'

const searchRequestSchema = z.object({
	query: z.string(),
	topK: z.number().int().min(1).max(15).optional(),
})

const syncRequestSchema = z.object({
	force: z.boolean().optional(),
})

function json(
	data:
		| SearchWorkerSearchResponse
		| SearchWorkerSyncResponse
		| SearchWorkerHealthResponse
		| { ok: true },
	init?: ResponseInit,
) {
	return Response.json(data, init)
}

function isAuthorized(request: Request, env: Env) {
	return (
		request.headers.get('Authorization') === `Bearer ${env.SEARCH_WORKER_TOKEN}`
	)
}

function unauthorized() {
	return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
}

function methodNotAllowed() {
	return json({ ok: false, error: 'Method not allowed' }, { status: 405 })
}

async function parseJsonBody(request: Request) {
	try {
		return await request.json()
	} catch {
		throw new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		})
	}
}

async function parseOptionalJsonBody(request: Request) {
	const text = await request.text()
	if (!text.trim()) return {}
	try {
		return JSON.parse(text) as unknown
	} catch {
		throw new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		})
	}
}

export async function handleRequest({
	request,
	env,
	service = createSearchService(env),
}: {
	request: Request
	env: Env
	service?: SearchService
}) {
	const url = new URL(request.url)

	if (url.pathname === '/health') {
		if (!isAuthorized(request, env)) {
			return json({ ok: true })
		}
		const health = await service.health()
		return json({ ok: true, ...health })
	}

	if (!isAuthorized(request, env)) {
		return unauthorized()
	}

	try {
		if (url.pathname === '/search') {
			if (request.method !== 'POST') return methodNotAllowed()
			const body = await parseJsonBody(request)
			const parsed = searchRequestSchema.parse(body)
			const { results, lowRankingResults, noCloseMatches } =
				await service.search(parsed)
			return json({
				ok: true,
				results,
				lowRankingResults,
				noCloseMatches,
			})
		}

		if (url.pathname === '/internal/sync') {
			if (request.method !== 'POST') return methodNotAllowed()
			const body = await parseOptionalJsonBody(request)
			const parsed = syncRequestSchema.parse(body)
			const result = await service.sync(parsed)
			return json({ ok: true, ...result })
		}

		return json({ ok: false, error: 'Not found' }, { status: 404 })
	} catch (error) {
		if (error instanceof Response) return error
		if (error instanceof SearchQueryTooLongError) {
			return json(
				{
					ok: false,
					error: error instanceof Error ? error.message : String(error),
				},
				{ status: 400 },
			)
		}
		if (error instanceof ZodError) {
			const message = error.issues[0]?.message ?? 'Invalid request body'
			return json({ ok: false, error: message }, { status: 400 })
		}

		const message = error instanceof Error ? error.message : String(error)
		return json({ ok: false, error: message }, { status: 500 })
	}
}

export default {
	async fetch(request: Request, env: Env) {
		return await handleRequest({ request, env })
	},
}
