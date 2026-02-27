# Cloudflare semantic search

This folder contains the GitHub Actions indexers for the site semantic search
and shared utilities.

## Cloudflare resources (manual)

- Create a Vectorize index (example name: `kcd-semantic-v1`).
- Choose an embeddings model (default used by code):
  - `@cf/google/embeddinggemma-300m`
- Create an API token with permissions for:
  - Workers AI (run model)
  - Vectorize (read/write)

## R2 resources (manual)

- Create an R2 bucket (example: `kcd-semantic-search`).
- Ensure the `CLOUDFLARE_API_TOKEN` used in GitHub Actions also has permission
  to read/write that bucket (these scripts use `wrangler r2 object get/put`).

## GitHub Actions secrets expected

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_VECTORIZE_INDEX`
- `CLOUDFLARE_AI_EMBEDDING_MODEL` (optional; defaults in code)
- `CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID` (optional; used by semantic-search embeddings for runtime queries + indexers; defaults to `CLOUDFLARE_AI_GATEWAY_ID`)

- `R2_BUCKET`

For podcast indexing:

- `TRANSISTOR_API_SECRET`
- `SIMPLECAST_KEY`
- `CHATS_WITH_KENT_PODCAST_ID`

For YouTube playlist indexing (optional but recommended as repo variables or
secrets):

- `YOUTUBE_PLAYLIST_ID` (playlist ID only)
- Optional (helps when YouTube returns anti-bot `LOGIN_REQUIRED`):
  - `YOUTUBE_COOKIE` (cookie header value from a logged-in browser session)
  - `YOUTUBE_USER_AGENT`

## Staged rollout / small index runs

For repo content indexing you can limit which docs get indexed:

- CLI:
  `bun other/semantic-search/index-repo-content.ts --only "blog:react-hooks-pitfalls,page:uses"`
- Env: `SEMANTIC_SEARCH_ONLY="blog:react-hooks-pitfalls,page:uses"`

Indexed sources (via `index-repo-content.ts`):

- `content/blog/**` (blog posts)
- `content/pages/**` (MDX pages)
- Rendered JSX pages discovered from `/sitemap.xml` (excluding MDX-backed pages
  and docs handled by podcast/YAML indexers)
- `content/data/talks.yml` (each talk is indexed as its own doc)
- `content/data/resume.yml` (resume page)
- `content/data/credits.yml` (each person is indexed as its own doc)
- `content/data/testimonials.yml` (each testimonial author is indexed as its own
  doc)

## Ignore list (prevent re-indexing)

All indexers support an ignore list stored in R2 (JSON):

- Key: `SEMANTIC_SEARCH_IGNORE_LIST_KEY` (example: `manifests/ignore-list.json`)
- Shape:
  - `{ "version": 1, "patterns": ["youtube:dQw4w9WgXcQ", "youtube:*", "blog:secret-post"] }`

Patterns match doc IDs (keys in the manifests). A trailing `*` acts as a prefix
wildcard (only supported at the end of the string).

When a doc is ignored, indexers will:

- skip indexing it, even if it would otherwise be discovered, and
- delete any existing vectors + manifest entries for it.

## YouTube playlist indexing

Script:

- `bun other/semantic-search/index-youtube-playlist.ts`
- The script indexes:
  - videos from the configured YouTube playlist
  - additional YouTube video links found in `content/pages/appearances.mdx`

Optional flags:

- `--playlist "<url-or-id>"` (defaults to `YOUTUBE_PLAYLIST_ID` or a built-in
  `YOUTUBE_PLAYLIST_ID`)
- `--max-videos 50` (helpful for staged/backfill runs)
- `--include-auto-captions false` (manual captions only)
- `--manifest-key manifests/youtube-my-playlist.json`

Transcript strategy:

1. Prefer creator-provided English caption tracks.
2. Fall back to YouTube auto-generated captions (`kind=asr`) when enabled.
3. If no captions are available, index metadata/description only.

Cost control:

- The script stores chunk hashes in R2 manifest files and only re-embeds changed
  chunks, so old unchanged videos do not get re-embedded every run.
