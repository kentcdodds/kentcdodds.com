import { http, HttpResponse, type HttpHandler } from 'msw'
import type { LexicalSearchArtifact } from '../../../other/semantic-search/lexical-search-artifact.ts'
import type {
	LexicalSearchAdminOverview,
	LexicalSearchChunkRecord,
	LexicalSearchDocDetail,
	LexicalSearchDocRecord,
	LexicalSearchMatch,
	LexicalSearchSourceDetail,
	LexicalSearchSourceRecord,
	LexicalSearchStats,
} from '../../../other/semantic-search/lexical-search-service.ts'
import { getLexicalDocId } from '../../../other/semantic-search/lexical-search-service.ts'

const MOCK_LEXICAL_SEARCH_WORKER_ORIGIN = 'https://mock.lexical-search-worker.local'
const MOCK_LEXICAL_SEARCH_WORKER_TOKEN = 'local-dev-lexical-search-token'

const seedArtifacts: Record<string, LexicalSearchArtifact> = {
	'lexical-search/repo-content.json': {
		version: 1,
		generatedAt: '2026-02-01T00:00:00.000Z',
		chunks: [
			{
				id: 'blog:super-simple-start-to-remix:chunk:0',
				type: 'blog',
				slug: 'super-simple-start-to-remix',
				url: '/blog/super-simple-start-to-remix',
				title: 'Super Simple Start to Remix',
				snippet: 'Fixture snippet: this represents indexed blog content...',
				text: 'Remix basics, loaders, actions, and routing concepts.',
				chunkIndex: 0,
				chunkCount: 2,
			},
			{
				id: 'page:uses:chunk:0',
				type: 'page',
				slug: 'uses',
				url: '/uses',
				title: 'Uses',
				snippet: 'Fixture snippet: page content...',
				text: 'Kent uses hardware, software, keyboard, and editor tools.',
				chunkIndex: 0,
				chunkCount: 1,
			},
		],
	},
	'lexical-search/podcasts.json': {
		version: 1,
		generatedAt: '2026-02-01T00:00:00.000Z',
		chunks: [
			{
				id: 'ck:s01e01:chunk:0',
				type: 'ck',
				slug: 's01e01',
				url: '/calls/1/1',
				title: 'Fixture Call Kent Episode',
				snippet: 'Fixture snippet: podcast summary...',
				text: 'Authentication, debugging, and practical software engineering advice.',
				chunkIndex: 0,
				chunkCount: 1,
				sourceUpdatedAt: '2026-02-01T00:00:00.000Z',
			},
		],
	},
	'lexical-search/youtube.json': {
		version: 1,
		generatedAt: '2026-02-01T00:00:00.000Z',
		chunks: [
			{
				id: 'youtube:dQw4w9WgXcQ:chunk:0',
				type: 'youtube',
				slug: 'dQw4w9WgXcQ',
				url: '/youtube?video=dQw4w9WgXcQ',
				title: 'Fixture YouTube Video',
				snippet: 'Fixture snippet: transcript chunk...',
				text: 'React shallow rendering and testing discussion.',
				chunkIndex: 0,
				chunkCount: 3,
				startSeconds: 123,
				endSeconds: 150,
				imageUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
				imageAlt: 'Fixture YouTube Video',
				sourceUpdatedAt: '2026-02-01',
				transcriptSource: 'manual',
			},
		],
	},
}

type MockState = {
	sources: Array<LexicalSearchSourceRecord>
	docs: Array<LexicalSearchDocRecord>
	chunks: Array<LexicalSearchChunkRecord>
	stats: LexicalSearchStats
}

let lexicalSearchMockState = createMockState()

function createMockState(): MockState {
	const syncedAt = '2026-02-01T00:00:00.000Z'
	const sources: Array<LexicalSearchSourceRecord> = []
	const docs = new Map<string, LexicalSearchDocRecord>()
	const chunks: Array<LexicalSearchChunkRecord> = []

	for (const [sourceKey, artifact] of Object.entries(seedArtifacts)) {
		sources.push({
			sourceKey,
			generatedAt: artifact.generatedAt,
			chunkCount: artifact.chunks.length,
			syncedAt,
		})
		for (const chunk of artifact.chunks) {
			const docId = getLexicalDocId({
				chunkId: chunk.id,
				type: chunk.type,
				slug: chunk.slug,
				url: chunk.url,
				title: chunk.title,
			})
			const existingDoc = docs.get(docId)
			if (existingDoc) {
				existingDoc.chunkCount += 1
			} else {
				docs.set(docId, {
					docId,
					sourceKey,
					type: chunk.type,
					slug: chunk.slug,
					url: chunk.url,
					title: chunk.title,
					snippet: chunk.snippet,
					chunkCount: 1,
					imageUrl: chunk.imageUrl,
					imageAlt: chunk.imageAlt,
					sourceUpdatedAt: chunk.sourceUpdatedAt,
					transcriptSource: chunk.transcriptSource,
				})
			}
			chunks.push({
				...chunk,
				docId,
				sourceKey,
			})
		}
	}

	return {
		sources,
		docs: [...docs.values()],
		chunks,
		stats: {
			sourceCount: sources.length,
			docCount: docs.size,
			chunkCount: chunks.length,
			lastSyncedAt: syncedAt,
		},
	}
}

export function resetLexicalSearchWorkerMockState() {
	lexicalSearchMockState = createMockState()
}

function isAuthorized(request: Request) {
	return (
		request.headers.get('Authorization') ===
		`Bearer ${MOCK_LEXICAL_SEARCH_WORKER_TOKEN}`
	)
}

function queryMatches({
	query,
	topK,
}: {
	query: string
	topK: number
}) {
	const normalizedQuery = query.trim().toLowerCase()
	if (!normalizedQuery) return [] as Array<LexicalSearchMatch>
	const tokens = normalizedQuery.split(/\s+/u).filter(Boolean)
	return lexicalSearchMockState.chunks
		.filter((chunk) => {
			const haystack = [chunk.title, chunk.snippet, chunk.text, chunk.url]
				.filter(Boolean)
				.join(' ')
				.toLowerCase()
			return tokens.some((token) => haystack.includes(token))
		})
		.slice(0, topK)
		.map((chunk) => ({
			id: chunk.id,
			type: chunk.type,
			slug: chunk.slug,
			title: chunk.title,
			url: chunk.url,
			snippet: chunk.snippet,
			chunkIndex: chunk.chunkIndex,
			chunkCount: chunk.chunkCount,
			startSeconds: chunk.startSeconds,
			endSeconds: chunk.endSeconds,
			imageUrl: chunk.imageUrl,
			imageAlt: chunk.imageAlt,
			sourceUpdatedAt: chunk.sourceUpdatedAt,
			transcriptSource: chunk.transcriptSource,
		}))
}

function getOverview({
	query,
	sourceKey,
	type,
	limit,
}: {
	query: string
	sourceKey: string
	type: string
	limit: number
}) {
	const safeLimit = Math.min(500, Math.max(1, Math.floor(limit)))
	const normalizedQuery = query.trim().toLowerCase()
	const docs = lexicalSearchMockState.docs
		.filter((doc) => !sourceKey || doc.sourceKey === sourceKey)
		.filter((doc) => !type || doc.type === type)
		.filter((doc) => {
			if (!normalizedQuery) return true
			return [doc.docId, doc.title, doc.url, doc.snippet, doc.sourceKey]
				.filter(Boolean)
				.some((value) => value.toLowerCase().includes(normalizedQuery))
		})
		.slice(0, safeLimit)
	const chunks = lexicalSearchMockState.chunks
		.filter((chunk) => !sourceKey || chunk.sourceKey === sourceKey)
		.filter((chunk) => !type || chunk.type === type)
		.filter((chunk) => {
			if (!normalizedQuery) return true
			return [chunk.id, chunk.docId, chunk.title, chunk.snippet, chunk.url]
				.filter(Boolean)
				.some((value) => value.toLowerCase().includes(normalizedQuery))
		})
		.slice(0, safeLimit)
	return {
		stats: lexicalSearchMockState.stats,
		sources: lexicalSearchMockState.sources
			.filter((source) => !sourceKey || source.sourceKey === sourceKey)
			.slice(0, safeLimit),
		docs,
		chunks,
		query,
		sourceKey,
		type,
		limit: safeLimit,
	} satisfies LexicalSearchAdminOverview
}

function getSourceDetail(sourceKey: string) {
	return {
		source:
			lexicalSearchMockState.sources.find((source) => source.sourceKey === sourceKey) ??
			null,
		docs: lexicalSearchMockState.docs.filter((doc) => doc.sourceKey === sourceKey),
	} satisfies LexicalSearchSourceDetail
}

function getDocDetail(docId: string) {
	return {
		doc: lexicalSearchMockState.docs.find((doc) => doc.docId === docId) ?? null,
		chunks: lexicalSearchMockState.chunks.filter((chunk) => chunk.docId === docId),
	} satisfies LexicalSearchDocDetail
}

function recalculateStats() {
	lexicalSearchMockState.stats = {
		sourceCount: lexicalSearchMockState.sources.length,
		docCount: lexicalSearchMockState.docs.length,
		chunkCount: lexicalSearchMockState.chunks.length,
		lastSyncedAt: lexicalSearchMockState.stats.lastSyncedAt,
	}
}

function deleteSource(sourceKey: string) {
	lexicalSearchMockState.sources = lexicalSearchMockState.sources.filter(
		(source) => source.sourceKey !== sourceKey,
	)
	lexicalSearchMockState.docs = lexicalSearchMockState.docs.filter(
		(doc) => doc.sourceKey !== sourceKey,
	)
	lexicalSearchMockState.chunks = lexicalSearchMockState.chunks.filter(
		(chunk) => chunk.sourceKey !== sourceKey,
	)
	recalculateStats()
}

function deleteDoc(docId: string) {
	lexicalSearchMockState.docs = lexicalSearchMockState.docs.filter(
		(doc) => doc.docId !== docId,
	)
	lexicalSearchMockState.chunks = lexicalSearchMockState.chunks.filter(
		(chunk) => chunk.docId !== docId,
	)
	recalculateStats()
}

function deleteChunk(chunkId: string) {
	lexicalSearchMockState.chunks = lexicalSearchMockState.chunks.filter(
		(chunk) => chunk.id !== chunkId,
	)
	const remainingDocIds = new Set(
		lexicalSearchMockState.chunks.map((chunk) => chunk.docId),
	)
	lexicalSearchMockState.docs = lexicalSearchMockState.docs.filter((doc) =>
		remainingDocIds.has(doc.docId),
	)
	recalculateStats()
}

export const lexicalSearchWorkerHandlers: Array<HttpHandler> = [
	http.get(`${MOCK_LEXICAL_SEARCH_WORKER_ORIGIN}/health`, () =>
		HttpResponse.json({ ok: true }),
	),
	http.post(`${MOCK_LEXICAL_SEARCH_WORKER_ORIGIN}/query`, async ({ request }) => {
		if (!isAuthorized(request)) {
			return HttpResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
		}
		const body = (await request.json()) as { query?: string; topK?: number }
		return HttpResponse.json({
			ok: true,
			results: queryMatches({
				query: body.query ?? '',
				topK: typeof body.topK === 'number' ? body.topK : 10,
			}),
		})
	}),
	http.get(`${MOCK_LEXICAL_SEARCH_WORKER_ORIGIN}/admin/overview`, async ({ request }) => {
		if (!isAuthorized(request)) {
			return HttpResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
		}
		const url = new URL(request.url)
		return HttpResponse.json({
			ok: true,
			overview: getOverview({
				query: url.searchParams.get('query') ?? '',
				sourceKey: url.searchParams.get('sourceKey') ?? '',
				type: url.searchParams.get('type') ?? '',
				limit: Number(url.searchParams.get('limit') ?? 100),
			}),
		})
	}),
	http.get(`${MOCK_LEXICAL_SEARCH_WORKER_ORIGIN}/admin/stats`, async ({ request }) => {
		if (!isAuthorized(request)) {
			return HttpResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
		}
		return HttpResponse.json({ ok: true, stats: lexicalSearchMockState.stats })
	}),
	http.get(`${MOCK_LEXICAL_SEARCH_WORKER_ORIGIN}/admin/source/:sourceKey`, async ({ request, params }) => {
		if (!isAuthorized(request)) {
			return HttpResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
		}
		return HttpResponse.json({
			ok: true,
			detail: getSourceDetail(String(params.sourceKey)),
		})
	}),
	http.get(`${MOCK_LEXICAL_SEARCH_WORKER_ORIGIN}/admin/doc/:docId`, async ({ request, params }) => {
		if (!isAuthorized(request)) {
			return HttpResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
		}
		return HttpResponse.json({
			ok: true,
			detail: getDocDetail(String(params.docId)),
		})
	}),
	http.get(`${MOCK_LEXICAL_SEARCH_WORKER_ORIGIN}/admin/chunk/:chunkId`, async ({ request, params }) => {
		if (!isAuthorized(request)) {
			return HttpResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
		}
		return HttpResponse.json({
			ok: true,
			detail:
				lexicalSearchMockState.chunks.find((chunk) => chunk.id === String(params.chunkId)) ??
				null,
		})
	}),
	http.post(`${MOCK_LEXICAL_SEARCH_WORKER_ORIGIN}/admin/delete`, async ({ request }) => {
		if (!isAuthorized(request)) {
			return HttpResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
		}
		const body = (await request.json()) as { kind?: string; id?: string }
		if (body.kind === 'source' && body.id) deleteSource(body.id)
		if (body.kind === 'doc' && body.id) deleteDoc(body.id)
		if (body.kind === 'chunk' && body.id) deleteChunk(body.id)
		return HttpResponse.json({ ok: true })
	}),
	http.post(`${MOCK_LEXICAL_SEARCH_WORKER_ORIGIN}/admin/sync`, async ({ request }) => {
		if (!isAuthorized(request)) {
			return HttpResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
		}
		resetLexicalSearchWorkerMockState()
		return HttpResponse.json({
			ok: true,
			syncedAt: lexicalSearchMockState.stats.lastSyncedAt,
		})
	}),
]
