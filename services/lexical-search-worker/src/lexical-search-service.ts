import {
	deleteLexicalSearchChunk,
	deleteLexicalSearchDoc,
	deleteLexicalSearchSource,
	ensureLexicalSearchSchema,
	getLexicalSearchChunkDetail,
	getLexicalSearchDocDetail,
	getLexicalSearchSourceDetail,
	getLexicalSearchStats,
	queryLexicalSearch,
	searchLexicalAdminOverview,
} from './lexical-search-db'
import { syncLexicalSearchArtifacts } from './lexical-search-sync'
import { type Env } from './env'

export function createLexicalSearchService(env: Env) {
	return {
		async query({
			query,
			topK,
		}: {
			query: string
			topK: number
		}) {
			await ensureLexicalSearchSchema(env.LEXICAL_SEARCH_DB)
			return await queryLexicalSearch({
				db: env.LEXICAL_SEARCH_DB,
				query,
				topK,
			})
		},
		async getAdminOverview({
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
			await ensureLexicalSearchSchema(env.LEXICAL_SEARCH_DB)
			return await searchLexicalAdminOverview({
				db: env.LEXICAL_SEARCH_DB,
				query,
				sourceKey,
				type,
				limit,
			})
		},
		async getStats() {
			await ensureLexicalSearchSchema(env.LEXICAL_SEARCH_DB)
			return await getLexicalSearchStats(env.LEXICAL_SEARCH_DB)
		},
		async getSourceDetail(sourceKey: string) {
			await ensureLexicalSearchSchema(env.LEXICAL_SEARCH_DB)
			return await getLexicalSearchSourceDetail({
				db: env.LEXICAL_SEARCH_DB,
				sourceKey,
			})
		},
		async getDocDetail(docId: string) {
			await ensureLexicalSearchSchema(env.LEXICAL_SEARCH_DB)
			return await getLexicalSearchDocDetail({
				db: env.LEXICAL_SEARCH_DB,
				docId,
			})
		},
		async getChunkDetail(chunkId: string) {
			await ensureLexicalSearchSchema(env.LEXICAL_SEARCH_DB)
			return await getLexicalSearchChunkDetail({
				db: env.LEXICAL_SEARCH_DB,
				chunkId,
			})
		},
		async deleteSource(sourceKey: string) {
			await ensureLexicalSearchSchema(env.LEXICAL_SEARCH_DB)
			await deleteLexicalSearchSource({
				db: env.LEXICAL_SEARCH_DB,
				sourceKey,
			})
			return { ok: true as const }
		},
		async deleteDoc(docId: string) {
			await ensureLexicalSearchSchema(env.LEXICAL_SEARCH_DB)
			await deleteLexicalSearchDoc({
				db: env.LEXICAL_SEARCH_DB,
				docId,
			})
			return { ok: true as const }
		},
		async deleteChunk(chunkId: string) {
			await ensureLexicalSearchSchema(env.LEXICAL_SEARCH_DB)
			await deleteLexicalSearchChunk({
				db: env.LEXICAL_SEARCH_DB,
				chunkId,
			})
			return { ok: true as const }
		},
		async sync({ force = false }: { force?: boolean } = {}) {
			return await syncLexicalSearchArtifacts({ env, force })
		},
	}
}

export type LexicalSearchService = ReturnType<typeof createLexicalSearchService>
