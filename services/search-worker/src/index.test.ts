import { expect, test, vi } from 'vitest'
import { handleRequest } from './index'
import { type Env } from './env'

function createEnv(): Env {
	return {
		SEARCH_DB: {} as D1Database,
		SEARCH_INDEX: { query: vi.fn() } as unknown as VectorizeIndex,
		SEARCH_ARTIFACTS_BUCKET: {} as R2Bucket,
		AI: {
			run: vi.fn(),
			gateway: vi.fn(),
			aiGatewayLogId: null,
		} as unknown as Ai,
		SEARCH_WORKER_TOKEN: 'worker-secret',
		CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID: 'embedding-gateway',
		CLOUDFLARE_AI_EMBEDDING_MODEL: '@cf/google/embeddinggemma-300m',
	}
}

function createService() {
	return {
		health: vi.fn(async () => ({ syncedAt: '2026-03-17T00:00:00.000Z' })),
		search: vi.fn(async () => ({
			results: [{ id: 'blog:hello-world', score: 0.9 }],
			lowRankingResults: [],
			noCloseMatches: false,
		})),
		sync: vi.fn(async () => ({ syncedAt: '2026-03-17T00:00:00.000Z' })),
	}
}

test('health endpoint is public', async () => {
	const response = await handleRequest({
		request: new Request('https://worker.example/health'),
		env: createEnv(),
		service: createService(),
	})

	expect(response.status).toBe(200)
	expect(await response.json()).toEqual({ ok: true })
})

test('health endpoint returns syncedAt when authorized', async () => {
	const service = createService()
	const response = await handleRequest({
		request: new Request('https://worker.example/health', {
			headers: {
				Authorization: 'Bearer worker-secret',
			},
		}),
		env: createEnv(),
		service,
	})

	expect(response.status).toBe(200)
	expect(service.health).toHaveBeenCalled()
	expect(await response.json()).toEqual({
		ok: true,
		syncedAt: '2026-03-17T00:00:00.000Z',
	})
})

test('search endpoint requires authorization', async () => {
	const response = await handleRequest({
		request: new Request('https://worker.example/search', {
			method: 'POST',
			body: JSON.stringify({ query: 'hello', topK: 5 }),
			headers: { 'Content-Type': 'application/json' },
		}),
		env: createEnv(),
		service: createService(),
	})

	expect(response.status).toBe(401)
})

test('search endpoint returns fused results', async () => {
	const service = createService()
	const response = await handleRequest({
		request: new Request('https://worker.example/search', {
			method: 'POST',
			body: JSON.stringify({ query: 'hello', topK: 5 }),
			headers: {
				Authorization: 'Bearer worker-secret',
				'Content-Type': 'application/json',
			},
		}),
		env: createEnv(),
		service,
	})

	expect(response.status).toBe(200)
	expect(service.search).toHaveBeenCalledWith({ query: 'hello', topK: 5 })
	expect(await response.json()).toEqual({
		ok: true,
		results: [{ id: 'blog:hello-world', score: 0.9 }],
		lowRankingResults: [],
		noCloseMatches: false,
	})
})

test('search endpoint returns 400 for malformed JSON', async () => {
	const response = await handleRequest({
		request: new Request('https://worker.example/search', {
			method: 'POST',
			body: '{"query":',
			headers: {
				Authorization: 'Bearer worker-secret',
				'Content-Type': 'application/json',
			},
		}),
		env: createEnv(),
		service: createService(),
	})

	expect(response.status).toBe(400)
	expect(await response.json()).toEqual({
		ok: false,
		error: 'Invalid JSON body',
	})
})

test('sync endpoint dispatches internal sync', async () => {
	const service = createService()
	const response = await handleRequest({
		request: new Request('https://worker.example/internal/sync', {
			method: 'POST',
			body: JSON.stringify({ force: true }),
			headers: {
				Authorization: 'Bearer worker-secret',
				'Content-Type': 'application/json',
			},
		}),
		env: createEnv(),
		service,
	})

	expect(response.status).toBe(200)
	expect(service.sync).toHaveBeenCalledWith({ force: true })
	expect(await response.json()).toEqual({
		ok: true,
		syncedAt: '2026-03-17T00:00:00.000Z',
	})
})

test('sync endpoint accepts empty body as default options', async () => {
	const service = createService()
	const response = await handleRequest({
		request: new Request('https://worker.example/internal/sync', {
			method: 'POST',
			headers: {
				Authorization: 'Bearer worker-secret',
			},
		}),
		env: createEnv(),
		service,
	})

	expect(response.status).toBe(200)
	expect(service.sync).toHaveBeenCalledWith({ force: undefined })
})

test('sync endpoint returns 400 for malformed JSON', async () => {
	const service = createService()
	const response = await handleRequest({
		request: new Request('https://worker.example/internal/sync', {
			method: 'POST',
			body: '{"force":',
			headers: {
				Authorization: 'Bearer worker-secret',
				'Content-Type': 'application/json',
			},
		}),
		env: createEnv(),
		service,
	})

	expect(response.status).toBe(400)
	expect(service.sync).not.toHaveBeenCalled()
	expect(await response.json()).toEqual({
		ok: false,
		error: 'Invalid JSON body',
	})
})
