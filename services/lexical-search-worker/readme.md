This Worker serves lexical search queries and admin operations for
`kentcdodds.com`.

It ingests versioned lexical-search artifacts from R2 and stores a derived query
model in D1 with FTS5 enabled. The site calls this Worker for lexical matches
instead of importing lexical artifacts into the app server process.

Key files:

- `src/index.ts`: fetch handler and route/auth wiring
- `src/lexical-search-db.ts`: D1 schema + query/delete helpers
- `src/lexical-search-sync.ts`: R2 artifact loading and D1 import logic
- `src/lexical-search-service.ts`: service layer used by routes/tests

## Runtime environment variables

Set these on the Cloudflare Worker:

- `LEXICAL_SEARCH_WORKER_TOKEN` (secret/plain var)
  - Shared bearer token used by the site and GitHub Actions to call the Worker.
- `R2_ENDPOINT` (plain var)
  - S3-compatible R2 endpoint.
- `R2_BUCKET` (plain var)
  - Bucket containing semantic/lexical search artifacts.
- `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` (secrets)
  - Credentials used to read lexical artifacts from R2.

## Local development

- Run `npm run dev --workspace lexical-search-worker`
- The local Worker listens on `http://127.0.0.1:8787`
- The site can point `LEXICAL_SEARCH_WORKER_URL` at that URL, or use the mock
  lexical service sentinel in `services/site/.env.example`
