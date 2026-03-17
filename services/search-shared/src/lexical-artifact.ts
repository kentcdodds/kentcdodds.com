export const LEXICAL_SEARCH_REPO_ARTIFACT_KEY =
	'lexical-search/repo-content.json'
export const LEXICAL_SEARCH_PODCASTS_ARTIFACT_KEY =
	'lexical-search/podcasts.json'
export const LEXICAL_SEARCH_YOUTUBE_ARTIFACT_KEY =
	'lexical-search/youtube.json'

export const LEXICAL_SEARCH_ARTIFACT_KEYS = [
	LEXICAL_SEARCH_REPO_ARTIFACT_KEY,
	LEXICAL_SEARCH_PODCASTS_ARTIFACT_KEY,
	LEXICAL_SEARCH_YOUTUBE_ARTIFACT_KEY,
] as const

export type LexicalSearchArtifactChunk = {
	id: string
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

export type LexicalSearchArtifact = {
	version: 1
	generatedAt: string
	chunks: Array<LexicalSearchArtifactChunk>
}
