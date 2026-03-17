export type Env = {
	SEARCH_DB: D1Database
	SEARCH_INDEX: VectorizeIndex
	SEARCH_ARTIFACTS_BUCKET: R2Bucket
	AI: Ai
	SEARCH_WORKER_TOKEN: string
	CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID: string
	CLOUDFLARE_AI_EMBEDDING_MODEL: string
	/** When `"true"` / `"1"`, skip embeddings + Vectorize (D1 lexical only). */
	SEARCH_LEXICAL_ONLY?: string
}
