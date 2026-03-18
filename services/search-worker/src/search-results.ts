import { getLexicalDocId, type SearchResult } from '@kcd-internal/search-shared'

type RetrievedMatch = {
	rawId: string
	rank: number
	source: 'semantic' | 'lexical'
	score?: number
	type?: string
	slug?: string
	title?: string
	url?: string
	snippet?: string
	timestampSeconds?: number
	imageUrl?: string
	imageAlt?: string
}

export type RankedDocResult = {
	rank: number
	result: SearchResult
}

export function asFiniteNumber(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) return value
	if (typeof value === 'string' && value.trim()) {
		const n = Number(value)
		if (Number.isFinite(n)) return n
	}
	return undefined
}

export function asNonEmptyString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined
	const trimmed = value.trim()
	return trimmed ? trimmed : undefined
}

function parseYoutubeVideoIdFromUrl(url: string | undefined) {
	if (!url) return null

	try {
		const parsed = new URL(url, 'https://kentcdodds.com')
		if (parsed.pathname !== '/youtube') return null
		const videoId = (parsed.searchParams.get('video') ?? '').trim()
		return /^[A-Za-z0-9_-]{11}$/u.test(videoId) ? videoId : null
	} catch {
		return null
	}
}

function getCanonicalResultId({
	vectorId,
	type,
	slug,
	url,
	title,
}: {
	vectorId: string
	type: string | undefined
	slug: string | undefined
	url: string | undefined
	title: string | undefined
}) {
	return getLexicalDocId({
		chunkId: vectorId,
		type,
		slug,
		url,
		title,
	})
}

function compareRetrievedMatchQuality(
	next: RetrievedMatch,
	prev: RetrievedMatch,
): number {
	const nextScore =
		typeof next.score === 'number' && Number.isFinite(next.score)
			? next.score
			: -Infinity
	const prevScore =
		typeof prev.score === 'number' && Number.isFinite(prev.score)
			? prev.score
			: -Infinity

	if (nextScore !== prevScore) return nextScore - prevScore
	return prev.rank - next.rank
}

export function collapseRetrievedMatches(matches: Array<RetrievedMatch>) {
	const byCanonicalId = new Map<string, { rank: number; match: RetrievedMatch }>()

	for (const match of matches) {
		const canonicalId = getCanonicalResultId({
			vectorId: match.rawId,
			type: match.type,
			slug: match.slug,
			url: match.url,
			title: match.title,
		})

		const existing = byCanonicalId.get(canonicalId)
		if (!existing) {
			byCanonicalId.set(canonicalId, { rank: match.rank, match })
			continue
		}

		const nextIsBetter = compareRetrievedMatchQuality(match, existing.match) > 0
		const prev = existing.match
		const next = match
		existing.rank = Math.min(existing.rank, match.rank)
		existing.match = {
			rawId: nextIsBetter ? next.rawId : prev.rawId,
			source: prev.source,
			rank: Math.min(prev.rank, next.rank),
			score:
				typeof prev.score === 'number' || typeof next.score === 'number'
					? Math.max(prev.score ?? -Infinity, next.score ?? -Infinity)
					: undefined,
			type: prev.type ?? next.type,
			slug: prev.slug ?? next.slug,
			title: prev.title ?? next.title,
			url: prev.url ?? next.url,
			snippet: nextIsBetter
				? (next.snippet ?? prev.snippet)
				: (prev.snippet ?? next.snippet),
			timestampSeconds: nextIsBetter
				? (next.timestampSeconds ?? prev.timestampSeconds)
				: (prev.timestampSeconds ?? next.timestampSeconds),
			imageUrl: prev.imageUrl ?? next.imageUrl,
			imageAlt: prev.imageAlt ?? next.imageAlt,
		}
	}

	return [...byCanonicalId.entries()]
		.map(([id, value]) => ({
			rank: value.rank,
			result: {
				id,
				score: value.match.score ?? 0,
				type: value.match.type,
				slug: value.match.slug,
				title: value.match.title,
				url: value.match.url,
				snippet: value.match.snippet,
				timestampSeconds: value.match.timestampSeconds,
				imageUrl: value.match.imageUrl,
				imageAlt: value.match.imageAlt,
			} satisfies SearchResult,
		}))
		.sort((left, right) => {
			const scoreDiff = (right.result.score ?? 0) - (left.result.score ?? 0)
			if (scoreDiff) return scoreDiff
			return left.rank - right.rank
		})
}

export function fuseRankedResults({
	semanticResults,
	lexicalResults,
	topK,
}: {
	semanticResults: Array<RankedDocResult>
	lexicalResults: Array<RankedDocResult>
	topK: number
}) {
	return fuseRankedResultsAll({ semanticResults, lexicalResults }).slice(
		0,
		topK,
	)
}

/** RRF-style fused scores; typical single-list #1 ~0.016–0.019, strong dual ~0.035. */
export const SEARCH_CONFIDENCE_MIN_BEST_SCORE = 0.013
/** Keep hits within this fraction of the top fused score (drops weak tail). */
export const SEARCH_CONFIDENCE_RELATIVE_RATIO = 0.5
/** Max extra hits returned for optional “show low ranking” UI. */
export const SEARCH_LOW_RANKING_MAX = 35

function fuseMapToSortedResults(
	fused: Map<string, { score: number; result: SearchResult }>,
): Array<SearchResult> {
	return [...fused.values()]
		.sort((left, right) => right.score - left.score)
		.map((entry) => ({
			...entry.result,
			score: entry.score,
		}))
}

export function fuseRankedResultsAll({
	semanticResults,
	lexicalResults,
}: {
	semanticResults: Array<RankedDocResult>
	lexicalResults: Array<RankedDocResult>
}): Array<SearchResult> {
	const rankConstant = 60
	const weights = {
		semantic: 1,
		lexical: 1.15,
	} as const

	const fused = new Map<
		string,
		{
			score: number
			result: SearchResult
		}
	>()

	const apply = (
		source: keyof typeof weights,
		items: Array<RankedDocResult>,
	) => {
		for (let i = 0; i < items.length; i++) {
			const item = items[i]
			if (!item) continue

			const contribution = weights[source] / (rankConstant + i + 1)
			const existing = fused.get(item.result.id)
			if (!existing) {
				fused.set(item.result.id, {
					score: contribution,
					result: {
						...item.result,
						score: contribution,
					},
				})
				continue
			}

			existing.score += contribution
			const shouldReplaceRepresentative =
				contribution > (existing.result.score ?? 0)
			existing.result = {
				id: item.result.id,
				score: existing.score,
				type: existing.result.type ?? item.result.type,
				slug: existing.result.slug ?? item.result.slug,
				title: existing.result.title ?? item.result.title,
				url: existing.result.url ?? item.result.url,
				snippet: shouldReplaceRepresentative
					? (item.result.snippet ?? existing.result.snippet)
					: (existing.result.snippet ?? item.result.snippet),
				timestampSeconds: shouldReplaceRepresentative
					? (item.result.timestampSeconds ?? existing.result.timestampSeconds)
					: (existing.result.timestampSeconds ?? item.result.timestampSeconds),
				imageUrl: existing.result.imageUrl ?? item.result.imageUrl,
				imageAlt: existing.result.imageAlt ?? item.result.imageAlt,
			}
		}
	}

	apply('semantic', semanticResults)
	apply('lexical', lexicalResults)

	return fuseMapToSortedResults(fused)
}

export function filterFusedResultsByConfidence({
	fusedSorted,
	topK,
	minBestScore = SEARCH_CONFIDENCE_MIN_BEST_SCORE,
	relativeRatio = SEARCH_CONFIDENCE_RELATIVE_RATIO,
}: {
	fusedSorted: Array<SearchResult>
	topK: number
	minBestScore?: number
	relativeRatio?: number
}): {
	results: Array<SearchResult>
	lowRankingResults: Array<SearchResult>
	noCloseMatches: boolean
} {
	if (fusedSorted.length === 0) {
		return { results: [], lowRankingResults: [], noCloseMatches: false }
	}

	const capLow = (items: Array<SearchResult>) =>
		items.slice(0, SEARCH_LOW_RANKING_MAX)

	const maxScore = fusedSorted[0]?.score ?? 0
	if (!Number.isFinite(maxScore) || maxScore < minBestScore) {
		return {
			results: [],
			lowRankingResults: capLow(fusedSorted),
			noCloseMatches: true,
		}
	}

	const threshold = maxScore * relativeRatio
	const filtered = fusedSorted.filter((r) => r.score >= threshold)
	if (filtered.length === 0) {
		return {
			results: [],
			lowRankingResults: capLow(fusedSorted),
			noCloseMatches: true,
		}
	}

	const primary = filtered.slice(0, topK)
	const primaryIds = new Set(primary.map((r) => r.id))
	const lowRanking = fusedSorted.filter((r) => !primaryIds.has(r.id))

	return {
		results: primary,
		lowRankingResults: capLow(lowRanking),
		noCloseMatches: false,
	}
}

export function normalizeYoutubeTimestampSeconds({
	startSeconds,
}: {
	startSeconds: number | undefined
}) {
	if (typeof startSeconds !== 'number' || !Number.isFinite(startSeconds)) {
		return undefined
	}

	let safeStart = Math.max(0, Math.floor(startSeconds))
	const msHeuristicThresholdSeconds = 60 * 60 * 24
	if (safeStart > msHeuristicThresholdSeconds) {
		safeStart = Math.floor(safeStart / 1000)
	}
	return safeStart
}

export function addYoutubeTimestampToUrl({
	url,
	videoId,
	timestampSeconds,
}: {
	url: string | undefined
	videoId: string | null
	timestampSeconds: number | undefined
}) {
	const t =
		typeof timestampSeconds === 'number' && Number.isFinite(timestampSeconds)
			? Math.max(0, Math.floor(timestampSeconds))
			: null
	if (t === null) return url

	const resolvedVideoId = videoId ?? parseYoutubeVideoIdFromUrl(url)
	if (!resolvedVideoId) return url

	const base =
		url && url.startsWith('/youtube')
			? url
			: `/youtube?video=${resolvedVideoId}`
	try {
		const parsed = new URL(base, 'https://kentcdodds.com')
		parsed.searchParams.set('video', resolvedVideoId)
		parsed.searchParams.set('t', String(t))
		return `${parsed.pathname}?${parsed.searchParams.toString()}`
	} catch {
		return `/youtube?video=${encodeURIComponent(
			resolvedVideoId,
		)}&t=${encodeURIComponent(String(t))}`
	}
}
