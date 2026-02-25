# Cloudflare media migration runbook

This runbook describes the **one-time** Cloudinary → Cloudflare migration and
the current R2-backed media workflow.

## Goals

- Keep media source-of-truth in Cloudflare R2.
- Keep canonical app mappings in-repo (`repo-media-key -> cloudflare-id`).
- Avoid legacy dead weight:
  - no compatibility branches after cutover
  - no committed legacy-ID mapping files
  - only forward manifests (`repo-media-key -> cloudflare-id`).

## Repo conventions

- MDX entries live at `<collection>/<slug>/index.mdx`.
- Canonical manifests:
  - `content/data/media-manifests/images.json`
  - `content/data/media-manifests/videos.json`
  - `sourcePath` should point to `r2://<bucket>/<repo-media-key>` after upload.

## Scripts

- Normalize MDX layout:
  - `bun run media:normalize-content-layout`
- Normalize legacy `/media/{image,video}/upload/...` content URLs:
  - `bun run media:normalize-legacy-paths`
- Legacy reference scan:
  - `bun run media:scan-legacy-references`
  - `bun run media:scan-legacy-references:strict`
- Upload manifest-backed local media payloads to R2 and prune local binaries:
  - `bun run media:upload-r2 -- --dry-run`
  - `bun run media:upload-r2 -- --delete-local`
- Fast local authoring helper (upload + prune in one command):
  - `bun run media:add-local`

## One-time cutover

1. Convert content to directory layout (if not already done).
2. Download any missing media into local `content/**` paths (temporary).
3. Run strict legacy scan and fix all remaining hits:
   - `bun run media:scan-legacy-references:strict`
4. Upload media to R2 and prune local binaries:
   - `bun run media:upload-r2 -- --dry-run`
   - `bun run media:upload-r2 -- --delete-local`
5. Verify manifests contain only forward mappings (`repo key -> cloudflare id`)
   and `r2://` source paths.
6. Remove transient migration artifacts from local workspace.

## Ongoing workflow

- Media requests resolve by canonical key and are served from R2-backed media
  infrastructure.
- Local media mock can proxy to R2 when online; otherwise it returns a
  wireframe placeholder image.
- Local R2 mock persists uploaded objects to `/tmp/mock-r2-cache` (outside git)
  so content continues to resolve while offline.

## Verification checklist

- `bun run media:scan-legacy-references:strict` passes.
- `bun run test:backend` passes.
- `bun run typecheck` passes.
- `bun run lint` passes.
- preview crawl shows no `res.cloudinary.com` URLs.
