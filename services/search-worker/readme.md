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
- `src/d1-sql.ts`: `sql` template tag for D1-friendly single-line SQL
- `src/search-sync.ts`: R2 artifact loading and D1 import logic

## Runtime configuration

Cloudflare bindings:

- `SEARCH_DB`: D1 database backing lexical search
- `SEARCH_INDEX`: Vectorize index for semantic search
- `SEARCH_ARTIFACTS_BUCKET`: R2 bucket containing lexical artifacts
- `AI`: Workers AI binding used for embeddings

Worker vars / secrets:

- `SEARCH_WORKER_TOKEN`
- `CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID` — must be a **real**
  [AI Gateway](https://developers.cloudflare.com/ai-gateway/) id in the same
  Cloudflare account as `wrangler login`. Placeholder values always fail with a
  dashboard configuration error.
- `CLOUDFLARE_AI_EMBEDDING_MODEL`
- `SEARCH_LEXICAL_ONLY` — optional. Set to `true` for local dev without AI
  Gateway / Vectorize (D1 + FTS only).

## D1 schema

Wrangler migrations live in `migrations/`. Apply before relying on a fresh DB:

- **Local (Miniflare)**: `npx wrangler d1 migrations apply kcd-search --local`
- **Remote (production D1)**: `npx wrangler d1 migrations apply kcd-search --remote`

The Worker also runs `CREATE TABLE IF NOT EXISTS …` on demand. D1’s in-Worker
`exec()` only runs the first line of a string — use `d1-sql.ts`’s `sql` tag for
readable multiline DDL that flattens to one line.

## Local development

- Run `npm run dev --workspace search-worker`
- The local Worker listens on `http://127.0.0.1:8787`
- With `MOCKS=true`, set `SEARCH_WORKER_URL=http://127.0.0.1:8787` (host must
  **not** contain `mock`) and align `SEARCH_WORKER_TOKEN` with `env.local` in
  `wrangler.jsonc`. MSW will passthrough to the dev worker. Use
  `https://mock.search-worker.local` when you want MSW fixtures instead.
