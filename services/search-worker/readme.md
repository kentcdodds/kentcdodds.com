This Worker handles search queries for `kentcdodds.com`.

It owns the full runtime query path:

- embeddings through Cloudflare AI Gateway
- semantic retrieval through Vectorize
- lexical retrieval through D1 FTS
- reciprocal-rank fusion into one result list

It also ingests lexical artifacts from R2 into D1 through an internal sync
endpoint used by the indexing workflows.

Key files:

- `src/index.ts`: fetch handler and route/auth wiring
- `src/search-service.ts`: semantic + lexical query orchestration
- `src/search-db.ts`: D1 schema + lexical query helpers
- `src/search-sync.ts`: R2 artifact loading and D1 import logic

## Runtime configuration

Cloudflare bindings:

- `SEARCH_DB`: D1 database backing lexical search
- `SEARCH_INDEX`: Vectorize index for semantic search
- `SEARCH_ARTIFACTS_BUCKET`: R2 bucket containing lexical artifacts

Worker vars / secrets:

- `SEARCH_WORKER_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID`
- `CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN`
- `CLOUDFLARE_AI_EMBEDDING_MODEL`

## Local development

- Run `npm run dev --workspace search-worker`
- The local Worker listens on `http://127.0.0.1:8787`
- The site normally uses its MSW mock boundary instead of this Worker in local
  dev/tests. Point `SEARCH_WORKER_URL` at the local Worker only when you want to
  exercise the real Worker boundary manually.
