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

- `R2_BUCKET`

For podcast indexing:

- `TRANSISTOR_API_SECRET`
- `SIMPLECAST_KEY`
- `CHATS_WITH_KENT_PODCAST_ID`

For YouTube playlist indexing (optional but recommended as repo variables):

- `YOUTUBE_PLAYLIST_URL` (full URL with `list=...`) **or**
- `YOUTUBE_PLAYLIST_ID` (playlist ID only)

## Staged rollout / small index runs

For repo content indexing you can limit which docs get indexed:

- CLI:
  `npx tsx other/semantic-search/index-repo-content.ts --only "blog:react-hooks-pitfalls,page:uses"`
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

## YouTube playlist indexing

Script:

- `npx tsx other/semantic-search/index-youtube-playlist.ts`

Optional flags:

- `--playlist "<url-or-id>"` (defaults to `YOUTUBE_PLAYLIST_URL`,
  `YOUTUBE_PLAYLIST_ID`, or a built-in default playlist ID)
- `--max-videos 50` (helpful for staged/backfill runs)
- `--language en` (caption language preference)
- `--include-auto-captions false` (manual captions only)
- `--manifest-key manifests/youtube-my-playlist.json`

Transcript strategy:

1. Prefer creator-provided caption tracks in the requested language.
2. Fall back to YouTube auto-generated captions (`kind=asr`) when enabled.
3. If no captions are available, index metadata/description only.

Cost control:

- The script stores chunk hashes in R2 manifest files and only re-embeds changed
  chunks, so old unchanged videos do not get re-embedded every run.
