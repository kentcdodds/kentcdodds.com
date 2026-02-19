import { createHash } from 'node:crypto'
import {
	http,
	HttpResponse,
	type DefaultBodyType,
	type DefaultRequestMultipartBody,
	type HttpHandler,
} from 'msw'
import { requiredHeader } from './utils.ts'

const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4'

// Keep vectors small to avoid wasting CPU/memory in local mocks.
const DEFAULT_EMBEDDING_DIMS = 12

type CloudflareApiEnvelope<T> = {
	success: boolean
	errors: Array<{ code: number; message: string }>
	messages: Array<{ code: number; message: string }>
	result: T
}

type VectorizeStoredVector = {
	id: string
	values: number[]
	metadata: Record<string, unknown>
	namespace: string
}

type VectorizeIndexStore = Map<string, Map<string, VectorizeStoredVector>>

// Keyed by `${accountId}:${indexName}`.
const vectorizeIndexes = new Map<string, VectorizeIndexStore>()

function jsonOk<T>(result: T, init?: { status?: number }) {
	const body: CloudflareApiEnvelope<T> = {
		success: true,
		errors: [],
		messages: [],
		result,
	}
	return HttpResponse.json(body, { status: init?.status ?? 200 })
}

function jsonError(
	status: number,
	message: string,
	code = 10000, // generic
) {
	const body: CloudflareApiEnvelope<null> = {
		success: false,
		errors: [{ code, message }],
		messages: [],
		result: null,
	}
	return HttpResponse.json(body, { status })
}

function clamp(n: number, min: number, max: number) {
	return Math.min(max, Math.max(min, n))
}

function dot(a: number[], b: number[]) {
	const len = Math.min(a.length, b.length)
	let sum = 0
	for (let i = 0; i < len; i++) sum += a[i]! * b[i]!
	return sum
}

function norm(a: number[]) {
	let sum = 0
	for (const v of a) sum += v * v
	return Math.sqrt(sum)
}

function cosineSimilarity(a: number[], b: number[]) {
	const na = norm(a)
	const nb = norm(b)
	if (!na || !nb) return 0
	return dot(a, b) / (na * nb)
}

function scoreFromSimilarity(sim: number) {
	// Cosine sim is [-1, 1]; CF Vectorize "score" is typically [0, 1].
	return clamp((sim + 1) / 2, 0, 1)
}

function hashToUnitFloats(hash: Buffer, dims: number) {
	// Map bytes to [-1, 1].
	const out: number[] = []
	for (let i = 0; i < dims; i++) {
		const byte = hash[i % hash.length]!
		out.push((byte / 255) * 2 - 1)
	}
	return out
}

function textToEmbedding(text: string, dims = DEFAULT_EMBEDDING_DIMS) {
	const hash = createHash('sha256').update(text, 'utf8').digest()
	return hashToUnitFloats(hash, dims)
}

function getIndexKey(accountId: string, indexName: string) {
	return `${accountId}:${indexName}`
}

function getOrCreateIndexStore(accountId: string, indexName: string): VectorizeIndexStore {
	const key = getIndexKey(accountId, indexName)
	let store = vectorizeIndexes.get(key)
	if (!store) {
		store = new Map()
		vectorizeIndexes.set(key, store)
	}
	return store
}

function allVectors(store: VectorizeIndexStore, namespace?: string) {
	if (typeof namespace === 'string') {
		const ns = store.get(namespace)
		return ns ? Array.from(ns.values()) : []
	}
	return Array.from(store.values()).flatMap((ns) => Array.from(ns.values()))
}

function ensureSeededIndex(accountId: string, indexName: string) {
	const store = getOrCreateIndexStore(accountId, indexName)
	if (allVectors(store).length > 0) return

	// Seed a few deterministic "documents" so semantic search is usable in mocks.
	const seedDocs: Array<{
		id: string
		title: string
		type: string
		url: string
		snippet: string
	}> = [
		{
			id: '/search',
			title: 'Search',
			type: 'page',
			url: 'https://kentcdodds.com/search',
			snippet: 'Semantic search across posts, pages, podcasts, talks, and more.',
		},
		{
			id: '/blog',
			title: 'Blog',
			type: 'page',
			url: 'https://kentcdodds.com/blog',
			snippet: 'Articles about React, testing, and modern web development.',
		},
		{
			id: '/workshops',
			title: 'Workshops',
			type: 'page',
			url: 'https://kentcdodds.com/workshops',
			snippet: 'Hands-on training on React, testing, TypeScript, and more.',
		},
		{
			id: '/call-kent',
			title: 'Call Kent Podcast',
			type: 'podcast',
			url: 'https://kentcdodds.com/call-kent',
			snippet: 'Short, practical audio answers about React and software engineering.',
		},
		{
			id: '/contact',
			title: 'Contact',
			type: 'page',
			url: 'https://kentcdodds.com/contact',
			snippet: 'Get in touch.',
		},
	]

	const namespace = 'default'
	const nsStore = new Map<string, VectorizeStoredVector>()
	for (const doc of seedDocs) {
		const values = textToEmbedding(`${doc.title}\n${doc.snippet}`)
		nsStore.set(doc.id, {
			id: doc.id,
			values,
			metadata: {
				type: doc.type,
				title: doc.title,
				url: doc.url,
				snippet: doc.snippet,
			},
			namespace,
		})
	}
	store.set(namespace, nsStore)
}

async function parseVectorizeNdjsonVectors(request: Request) {
	const contentType = request.headers.get('content-type') ?? ''
	if (!contentType.toLowerCase().includes('multipart/form-data')) {
		return { ok: false as const, error: 'Expected multipart/form-data request.' }
	}

	const form = await request.formData()
	const vectorsPart = form.get('vectors')
	if (!vectorsPart) {
		return { ok: false as const, error: 'Missing "vectors" form field.' }
	}

	let ndjson = ''
	if (typeof vectorsPart === 'string') {
		ndjson = vectorsPart
	} else if (vectorsPart instanceof Blob) {
		ndjson = await vectorsPart.text()
	} else {
		return { ok: false as const, error: 'Unsupported "vectors" form field type.' }
	}

	const vectors: VectorizeStoredVector[] = []
	const lines = ndjson.split('\n').filter(Boolean)
	for (const line of lines) {
		let parsed: any
		try {
			parsed = JSON.parse(line)
		} catch (e) {
			return {
				ok: false as const,
				error: `Invalid NDJSON line: ${String(e)}`,
			}
		}

		const id = typeof parsed?.id === 'string' ? parsed.id : null
		const values = Array.isArray(parsed?.values)
			? (parsed.values as unknown[])
					.filter((v): v is number => typeof v === 'number')
			: null
		if (!id || !values || values.length === 0) {
			return {
				ok: false as const,
				error: 'Each vector must include { id: string, values: number[] }.',
			}
		}

		const namespace =
			typeof parsed?.namespace === 'string' && parsed.namespace
				? parsed.namespace
				: 'default'
		const metadata =
			parsed?.metadata && typeof parsed.metadata === 'object'
				? (parsed.metadata as Record<string, unknown>)
				: {}

		vectors.push({ id, values, namespace, metadata })
	}

	return { ok: true as const, vectors }
}

function modelFromAiRunPathname(pathname: string) {
	const marker = '/ai/run/'
	const idx = pathname.indexOf(marker)
	if (idx === -1) return null
	const raw = pathname.slice(idx + marker.length)
	if (!raw) return null

	// `raw` may include slashes (e.g. @cf/google/embeddinggemma-300m) or be a
	// single encoded segment (e.g. %40cf%2Fopenai%2Fwhisper).
	return decodeURIComponent(raw)
}

export const cloudflareHandlers: Array<HttpHandler> = [
	// Workers AI (REST): https://api.cloudflare.com/client/v4/accounts/:accountId/ai/run/<model>
	// Model names commonly contain `/`, so use a regex instead of path params.
	http.post<any, DefaultBodyType>(
		/https:\/\/api\.cloudflare\.com\/client\/v4\/accounts\/[^/]+\/ai\/run\/.+/,
		async ({ request }) => {
			requiredHeader(request.headers, 'authorization')

			const url = new URL(request.url)
			const model = modelFromAiRunPathname(url.pathname) ?? 'unknown-model'
			const contentType = (request.headers.get('content-type') ?? '').toLowerCase()

			// Transcription requests in-app are raw MP3 bytes (`audio/mpeg`).
			if (contentType.includes('audio/')) {
				// Return a short, realistic-enough snippet; callers only need `.text`.
				return jsonOk({
					text: `Mock transcription (${model}): hello from Workers AI.`,
				})
			}

			// Embeddings: { text: string[] }
			let body: any = null
			try {
				body = await request.json()
			} catch {
				// ignore
			}

			const textsRaw = body?.text
			const texts =
				Array.isArray(textsRaw) ? textsRaw.filter((t: any) => typeof t === 'string') : []

			if (!texts.length) {
				return jsonError(
					400,
					`Mock Workers AI expected JSON body { text: string[] } (model: ${model}).`,
					10001,
				)
			}

			const data = texts.map((t: string) => textToEmbedding(t))
			return jsonOk({
				shape: [texts.length, DEFAULT_EMBEDDING_DIMS],
				data,
			})
		},
	),

	// Vectorize query (v2)
	http.post<any, DefaultBodyType>(
		`${CLOUDFLARE_API_BASE}/accounts/:accountId/vectorize/v2/indexes/:indexName/query`,
		async ({ request, params }) => {
			requiredHeader(request.headers, 'authorization')
			const accountId = String(params.accountId)
			const indexName = String(params.indexName)

			let body: any
			try {
				body = await request.json()
			} catch {
				return jsonError(400, 'Invalid JSON body for Vectorize query.', 10002)
			}

			const vector = Array.isArray(body?.vector)
				? (body.vector as unknown[]).filter((v): v is number => typeof v === 'number')
				: null
			const topK = Number.isFinite(body?.topK) ? Number(body.topK) : 10
			const namespace = typeof body?.namespace === 'string' ? body.namespace : undefined

			if (!vector || vector.length === 0) {
				return jsonError(
					400,
					'Mock Vectorize expected JSON body { vector: number[], topK?: number }.',
					10003,
				)
			}

			ensureSeededIndex(accountId, indexName)
			const store = getOrCreateIndexStore(accountId, indexName)
			const candidates = allVectors(store, namespace)

			const matches = candidates
				.map((v) => ({
					id: v.id,
					score: scoreFromSimilarity(cosineSimilarity(vector, v.values)),
					metadata: v.metadata,
				}))
				.sort((a, b) => b.score - a.score)
				.slice(0, clamp(Math.trunc(topK), 1, 100))

			return jsonOk({
				count: matches.length,
				matches,
			})
		},
	),

	// Vectorize query (legacy)
	http.post<any, DefaultBodyType>(
		`${CLOUDFLARE_API_BASE}/accounts/:accountId/vectorize/indexes/:indexName/query`,
		async ({ request, params }) => {
			// Same response shape as v2 in our mock.
			requiredHeader(request.headers, 'authorization')
			const accountId = String(params.accountId)
			const indexName = String(params.indexName)

			let body: any
			try {
				body = await request.json()
			} catch {
				return jsonError(400, 'Invalid JSON body for Vectorize query.', 10002)
			}

			const vector = Array.isArray(body?.vector)
				? (body.vector as unknown[]).filter((v): v is number => typeof v === 'number')
				: null
			const topK = Number.isFinite(body?.topK) ? Number(body.topK) : 10
			const namespace = typeof body?.namespace === 'string' ? body.namespace : undefined

			if (!vector || vector.length === 0) {
				return jsonError(
					400,
					'Mock Vectorize expected JSON body { vector: number[], topK?: number }.',
					10003,
				)
			}

			ensureSeededIndex(accountId, indexName)
			const store = getOrCreateIndexStore(accountId, indexName)
			const candidates = allVectors(store, namespace)

			const matches = candidates
				.map((v) => ({
					id: v.id,
					score: scoreFromSimilarity(cosineSimilarity(vector, v.values)),
					metadata: v.metadata,
				}))
				.sort((a, b) => b.score - a.score)
				.slice(0, clamp(Math.trunc(topK), 1, 100))

			return jsonOk({
				count: matches.length,
				matches,
			})
		},
	),

	// Vectorize write operations (v2): insert/upsert
	http.post<any, DefaultRequestMultipartBody>(
		`${CLOUDFLARE_API_BASE}/accounts/:accountId/vectorize/v2/indexes/:indexName/:operation`,
		async ({ request, params }) => {
			requiredHeader(request.headers, 'authorization')
			const operation = String(params.operation)
			if (operation !== 'insert' && operation !== 'upsert') {
				return jsonError(404, `Unknown Vectorize operation: ${operation}`, 10004)
			}

			const accountId = String(params.accountId)
			const indexName = String(params.indexName)
			const parsed = await parseVectorizeNdjsonVectors(request)
			if (!parsed.ok) return jsonError(400, parsed.error, 10005)

			const store = getOrCreateIndexStore(accountId, indexName)
			let updated = 0
			for (const v of parsed.vectors) {
				let ns = store.get(v.namespace)
				if (!ns) {
					ns = new Map()
					store.set(v.namespace, ns)
				}
				ns.set(v.id, v)
				updated++
			}

			return jsonOk({
				operation,
				updated,
			})
		},
	),

	// Vectorize write operations (legacy): insert/upsert
	http.post<any, DefaultRequestMultipartBody>(
		`${CLOUDFLARE_API_BASE}/accounts/:accountId/vectorize/indexes/:indexName/:operation`,
		async ({ request, params }) => {
			requiredHeader(request.headers, 'authorization')
			const operation = String(params.operation)
			if (operation !== 'insert' && operation !== 'upsert') {
				return jsonError(404, `Unknown Vectorize operation: ${operation}`, 10004)
			}

			const accountId = String(params.accountId)
			const indexName = String(params.indexName)
			const parsed = await parseVectorizeNdjsonVectors(request)
			if (!parsed.ok) return jsonError(400, parsed.error, 10005)

			const store = getOrCreateIndexStore(accountId, indexName)
			let updated = 0
			for (const v of parsed.vectors) {
				let ns = store.get(v.namespace)
				if (!ns) {
					ns = new Map()
					store.set(v.namespace, ns)
				}
				ns.set(v.id, v)
				updated++
			}

			return jsonOk({
				operation,
				updated,
			})
		},
	),

	// Vectorize delete_by_ids (v2)
	http.post<any, DefaultBodyType>(
		`${CLOUDFLARE_API_BASE}/accounts/:accountId/vectorize/v2/indexes/:indexName/delete_by_ids`,
		async ({ request, params }) => {
			requiredHeader(request.headers, 'authorization')
			const accountId = String(params.accountId)
			const indexName = String(params.indexName)

			let body: any
			try {
				body = await request.json()
			} catch {
				return jsonError(400, 'Invalid JSON body for delete_by_ids.', 10006)
			}

			const ids = Array.isArray(body?.ids)
				? (body.ids as unknown[]).filter((id): id is string => typeof id === 'string')
				: null
			if (!ids?.length) {
				return jsonError(400, 'Mock delete_by_ids expected { ids: string[] }.', 10007)
			}

			const store = getOrCreateIndexStore(accountId, indexName)
			let deleted = 0
			for (const ns of store.values()) {
				for (const id of ids) {
					if (ns.delete(id)) deleted++
				}
			}

			return jsonOk({ deleted })
		},
	),

	// Vectorize delete_by_ids (legacy)
	http.post<any, DefaultBodyType>(
		`${CLOUDFLARE_API_BASE}/accounts/:accountId/vectorize/indexes/:indexName/delete_by_ids`,
		async ({ request, params }) => {
			requiredHeader(request.headers, 'authorization')
			const accountId = String(params.accountId)
			const indexName = String(params.indexName)

			let body: any
			try {
				body = await request.json()
			} catch {
				return jsonError(400, 'Invalid JSON body for delete_by_ids.', 10006)
			}

			const ids = Array.isArray(body?.ids)
				? (body.ids as unknown[]).filter((id): id is string => typeof id === 'string')
				: null
			if (!ids?.length) {
				return jsonError(400, 'Mock delete_by_ids expected { ids: string[] }.', 10007)
			}

			const store = getOrCreateIndexStore(accountId, indexName)
			let deleted = 0
			for (const ns of store.values()) {
				for (const id of ids) {
					if (ns.delete(id)) deleted++
				}
			}

			return jsonOk({ deleted })
		},
	),
]

