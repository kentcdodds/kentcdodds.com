export type LexicalSearchMatch = {
	id: string
	type?: string
	slug?: string
	title?: string
	url?: string
	snippet?: string
	chunkIndex?: number
	chunkCount?: number
	startSeconds?: number
	endSeconds?: number
	imageUrl?: string
	imageAlt?: string
	sourceUpdatedAt?: string
	transcriptSource?: string
}

export type LexicalSearchSourceRecord = {
	sourceKey: string
	generatedAt: string
	chunkCount: number
	syncedAt: string | null
}

export type LexicalSearchDocRecord = {
	docId: string
	sourceKey: string
	type: string
	slug?: string
	url: string
	title: string
	snippet: string
	chunkCount: number
	imageUrl?: string
	imageAlt?: string
	sourceUpdatedAt?: string
	transcriptSource?: string
}

export type LexicalSearchChunkRecord = {
	id: string
	docId: string
	sourceKey: string
	type: string
	slug?: string
	url: string
	title: string
	snippet: string
	text: string
	chunkIndex: number
	chunkCount: number
	startSeconds?: number
	endSeconds?: number
	imageUrl?: string
	imageAlt?: string
	sourceUpdatedAt?: string
	transcriptSource?: string
}

export type LexicalSearchStats = {
	sourceCount: number
	docCount: number
	chunkCount: number
	lastSyncedAt: string | null
}

export type LexicalSearchAdminOverview = {
	stats: LexicalSearchStats
	sources: Array<LexicalSearchSourceRecord>
	docs: Array<LexicalSearchDocRecord>
	chunks: Array<LexicalSearchChunkRecord>
	query: string
	sourceKey: string
	type: string
	limit: number
}

export type LexicalSearchSourceDetail = {
	source: LexicalSearchSourceRecord | null
	docs: Array<LexicalSearchDocRecord>
}

export type LexicalSearchDocDetail = {
	doc: LexicalSearchDocRecord | null
	chunks: Array<LexicalSearchChunkRecord>
}

export { getLexicalDocId } from '@kcd-internal/search-shared'
