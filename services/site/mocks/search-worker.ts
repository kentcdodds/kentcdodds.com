import { http, HttpResponse, type HttpHandler } from 'msw'
import type { LexicalSearchArtifact } from '../../../other/semantic-search/lexical-search-artifact.ts'
import { getLexicalDocId } from '../../../other/semantic-search/lexical-search-service.ts'
import {
	normalizeSearchQuery,
	type SearchResult,
} from 'search-shared'

const MOCK_SEARCH_WORKER_ORIGIN = 'https://mock.search-worker.local'
const MOCK_SEARCH_WORKER_TOKEN = 'local-dev-search-token'

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

type MockChunk = LexicalSearchArtifact['chunks'][number] & {
	docId: string
}

type MockState = {
	chunks: Array<MockChunk>
	lastSyncedAt: string
}

let searchWorkerMockState = createMockState()

function createMockState(): MockState {
	const chunks: Array<MockChunk> = []
	for (const artifact of Object.values(seedArtifacts)) {
		for (const chunk of artifact.chunks) {
			chunks.push({
				...chunk,
				docId: getLexicalDocId({
					chunkId: chunk.id,
					type: chunk.type,
					slug: chunk.slug,
					url: chunk.url,
					title: chunk.title,
				}),
			})
		}
	}

	return {
		chunks,
		lastSyncedAt: '2026-02-01T00:00:00.000Z',
	}
}

export function resetSearchWorkerMockState() {
	searchWorkerMockState = createMockState()
}

function isAuthorized(request: Request) {
	return (
		request.headers.get('Authorization') === `Bearer ${MOCK_SEARCH_WORKER_TOKEN}`
	)
}

function addYoutubeTimestamp(url: string, startSeconds: number | undefined) {
	if (typeof startSeconds !== 'number' || !Number.isFinite(startSeconds)) return url

	const parsed = new URL(url, 'https://kentcdodds.com')
	parsed.searchParams.set('t', String(Math.max(0, Math.floor(startSeconds))))
	return `${parsed.pathname}?${parsed.searchParams.toString()}`
}

function buildSearchResults({
	query,
	topK,
}: {
	query: string
	topK: number
}) {
	const normalizedQuery = normalizeSearchQuery(query).toLowerCase()
	if (!normalizedQuery) return [] as Array<SearchResult>

	const tokens = normalizedQuery.split(/\s+/u).filter(Boolean)
	const byDocId = new Map<string, SearchResult>()

	for (const chunk of searchWorkerMockState.chunks) {
		const haystack = [chunk.title, chunk.text, chunk.snippet]
			.filter(Boolean)
			.join(' ')
			.toLowerCase()
		if (!tokens.some((token) => haystack.includes(token))) continue
		if (byDocId.has(chunk.docId)) continue

		byDocId.set(chunk.docId, {
			id: chunk.docId,
			score: 1 / (byDocId.size + 1),
			type: chunk.type,
			slug: chunk.slug,
			title: chunk.title,
			url:
				chunk.type === 'youtube'
					? addYoutubeTimestamp(chunk.url, chunk.startSeconds)
					: chunk.url,
			snippet: chunk.snippet,
			timestampSeconds: chunk.startSeconds,
			imageUrl: chunk.imageUrl,
			imageAlt: chunk.imageAlt,
		})
	}

	return [...byDocId.values()].slice(0, Math.max(1, Math.floor(topK)))
}

export const searchWorkerHandlers: Array<HttpHandler> = [
	http.get(`${MOCK_SEARCH_WORKER_ORIGIN}/health`, () =>
		HttpResponse.json({ ok: true }),
	),
	http.post(`${MOCK_SEARCH_WORKER_ORIGIN}/search`, async ({ request }) => {
		if (!isAuthorized(request)) {
			return HttpResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
		}

		const body = (await request.json()) as { query?: string; topK?: number }
		return HttpResponse.json({
			ok: true,
			results: buildSearchResults({
				query: body.query ?? '',
				topK: typeof body.topK === 'number' ? body.topK : 10,
			}),
		})
	}),
	http.post(`${MOCK_SEARCH_WORKER_ORIGIN}/internal/sync`, async ({ request }) => {
		if (!isAuthorized(request)) {
			return HttpResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
		}

		resetSearchWorkerMockState()
		return HttpResponse.json({
			ok: true,
			syncedAt: searchWorkerMockState.lastSyncedAt,
		})
	}),
]
