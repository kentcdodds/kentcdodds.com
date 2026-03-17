export * from './lexical-artifact.ts'
export { getLexicalDocId } from './lexical-doc-id.ts'

export const SEARCH_MAX_QUERY_CHARS = 1000

export class SearchQueryTooLongError extends Error {
	length: number
	max: number

	constructor(length: number, max: number) {
		super(`Search query too long (${length} chars). Max is ${max}.`)
		this.name = 'SearchQueryTooLongError'
		this.length = length
		this.max = max
	}
}

export type SearchResult = {
	id: string
	score: number
	type?: string
	slug?: string
	title?: string
	url?: string
	snippet?: string
	timestampSeconds?: number
	summary?: string
	imageUrl?: string
	imageAlt?: string
}

export type SearchWorkerSearchResponse =
	| {
			ok: true
			results: Array<SearchResult>
	  }
	| {
			ok: false
			error: string
	  }

export type SearchWorkerSyncResponse =
	| {
			ok: true
			syncedAt: string
	  }
	| {
			ok: false
			error: string
	  }

export function normalizeSearchQuery(query: string) {
	return query.trim().replace(/\s+/g, ' ')
}
