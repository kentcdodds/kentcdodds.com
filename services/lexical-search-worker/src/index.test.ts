import { expect, test, vi } from 'vitest'
import { handleRequest } from './index'
import { type Env } from './env'

function createEnv(): Env {
	return {
		LEXICAL_SEARCH_DB: {} as D1Database,
		LEXICAL_SEARCH_WORKER_TOKEN: 'worker-secret',
		R2_ENDPOINT: 'https://example.r2.cloudflarestorage.com',
		R2_BUCKET: 'search-artifacts',
		R2_ACCESS_KEY_ID: 'access-key',
		R2_SECRET_ACCESS_KEY: 'secret-key',
	}
}

function createService() {
	return {
		query: vi.fn(async () => [{ id: 'blog:hello-world:chunk:0', title: 'Hello World' }]),
		getStats: vi.fn(async () => ({
			sourceCount: 3,
			docCount: 10,
			chunkCount: 42,
			lastSyncedAt: '2026-03-16T00:00:00.000Z',
		})),
		getAdminOverview: vi.fn(async () => ({
			stats: {
				sourceCount: 3,
				docCount: 10,
				chunkCount: 42,
				lastSyncedAt: '2026-03-16T00:00:00.000Z',
			},
			sources: [],
			docs: [],
			chunks: [],
			query: '',
			sourceKey: '',
			type: '',
			limit: 100,
		})),
		getSourceDetail: vi.fn(async () => ({ source: null, docs: [] })),
		getDocDetail: vi.fn(async () => ({ doc: null, chunks: [] })),
		getChunkDetail: vi.fn(async () => null),
		deleteSource: vi.fn(async () => ({ ok: true as const })),
		deleteDoc: vi.fn(async () => ({ ok: true as const })),
		deleteChunk: vi.fn(async () => ({ ok: true as const })),
		sync: vi.fn(async () => ({ syncedAt: '2026-03-16T00:00:00.000Z' })),
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

test('query endpoint requires authorization', async () => {
	const response = await handleRequest({
		request: new Request('https://worker.example/query', {
			method: 'POST',
			body: JSON.stringify({ query: 'hello', topK: 5 }),
			headers: { 'Content-Type': 'application/json' },
		}),
		env: createEnv(),
		service: createService(),
	})

	expect(response.status).toBe(401)
})

test('query endpoint returns lexical results', async () => {
	const service = createService()
	const response = await handleRequest({
		request: new Request('https://worker.example/query', {
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
	expect(service.query).toHaveBeenCalledWith({ query: 'hello', topK: 5 })
	expect(await response.json()).toEqual({
		ok: true,
		results: [{ id: 'blog:hello-world:chunk:0', title: 'Hello World' }],
	})
})

test('query endpoint returns 400 for malformed JSON', async () => {
	const response = await handleRequest({
		request: new Request('https://worker.example/query', {
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

test('admin overview endpoint passes query filters through', async () => {
	const service = createService()
	const response = await handleRequest({
		request: new Request(
			'https://worker.example/admin/overview?query=hooks&sourceKey=lexical-search%2Frepo-content.json&type=blog&limit=25',
			{
				headers: { Authorization: 'Bearer worker-secret' },
			},
		),
		env: createEnv(),
		service,
	})

	expect(response.status).toBe(200)
	expect(service.getAdminOverview).toHaveBeenCalledWith({
		query: 'hooks',
		sourceKey: 'lexical-search/repo-content.json',
		type: 'blog',
		limit: 25,
	})
})

test('admin overview sanitizes invalid limit values', async () => {
	const service = createService()
	await handleRequest({
		request: new Request(
			'https://worker.example/admin/overview?query=hooks&limit=abc',
			{
				headers: { Authorization: 'Bearer worker-secret' },
			},
		),
		env: createEnv(),
		service,
	})

	expect(service.getAdminOverview).toHaveBeenCalledWith({
		query: 'hooks',
		sourceKey: '',
		type: '',
		limit: 100,
	})
})

test('admin delete endpoint dispatches by kind', async () => {
	const service = createService()
	const response = await handleRequest({
		request: new Request('https://worker.example/admin/delete', {
			method: 'POST',
			body: JSON.stringify({ kind: 'doc', id: 'blog:hello-world' }),
			headers: {
				Authorization: 'Bearer worker-secret',
				'Content-Type': 'application/json',
			},
		}),
		env: createEnv(),
		service,
	})

	expect(response.status).toBe(200)
	expect(service.deleteDoc).toHaveBeenCalledWith('blog:hello-world')
})
