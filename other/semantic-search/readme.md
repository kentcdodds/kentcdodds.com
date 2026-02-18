# Cloudflare semantic search

This folder contains the GitHub Actions indexers for the site semantic search and shared utilities.

## Cloudflare resources (manual)

- Create a Vectorize index (example name: `kcd-semantic-v1`).
- Choose an embeddings model (default used by code):
  - `@cf/google/embeddinggemma-300m`
- Create an API token with permissions for:
  - Workers AI (run model)
  - Vectorize (read/write)

## R2 resources (manual)

- Create an R2 bucket (example: `kcd-semantic-search`).
- Ensure the `CLOUDFLARE_API_TOKEN` used in GitHub Actions also has permission to read/write that bucket (these scripts use `wrangler r2 object get/put`).

## GitHub Actions secrets expected

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_VECTORIZE_INDEX`
- `CLOUDFLARE_AI_EMBEDDING_MODEL` (optional; defaults in code)

- `R2_BUCKET`

For podcast indexing:
- `TRANSISTOR_API_SECRET`
- `SIMPLECAST_KEY`
- `CHATS_WITH_KENT_PODCAST_ID`

## Staged rollout / small index runs

For repo content indexing you can limit which docs get indexed:

- CLI: `npx tsx other/semantic-search/index-repo-content.ts --only "blog:react-hooks-pitfalls,page:uses"`
- Env: `SEMANTIC_SEARCH_ONLY="blog:react-hooks-pitfalls,page:uses"`

