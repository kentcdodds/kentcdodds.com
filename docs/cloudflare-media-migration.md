# Cloudflare media migration runbook

This runbook describes the **one-time** Cloudinary → Cloudflare migration and
the ongoing repo-driven media sync workflow.

## Goals

- Keep media source-of-truth in-repo under `content/**`.
- Upload only changed media files to Cloudflare Images/Stream.
- Avoid legacy dead weight:
  - no compatibility branches after cutover
  - no committed legacy-ID mapping files
  - only forward manifests (`repo-media-key -> cloudflare-id`).

## Repo conventions

- MDX entries live at `<collection>/<slug>/index.mdx`.
- Co-located media files live beside each entry under `content/**`.
- Canonical manifests:
  - `content/data/media-manifests/images.json`
  - `content/data/media-manifests/videos.json`

## Scripts

- Normalize MDX layout:
  - `bun run media:normalize-content-layout`
- Legacy reference scan:
  - `bun run media:scan-legacy-references`
  - `bun run media:scan-legacy-references:strict`
- Media sync:
  - `bun run media:sync-cloudflare -- --dry-run`
  - `bun run media:sync-cloudflare -- --before <sha> --after <sha>`

## One-time cutover

1. Convert content to directory layout (if not already done).
2. Download referenced media into co-located `content/**` paths.
3. Run strict legacy scan and fix all remaining hits:
   - `bun run media:scan-legacy-references:strict`
4. Upload media to Cloudflare:
   - `bun run media:sync-cloudflare -- --dry-run`
   - `bun run media:sync-cloudflare -- --before <base-sha> --after <head-sha>`
5. Verify manifests contain only forward mappings (`repo key -> cloudflare id`).
6. Remove transient migration artifacts from local workspace.

## Ongoing workflow

- CI workflow: `.github/workflows/sync-media.yml`
  - validates strict reference scan
  - syncs changed media files and updates canonical manifests
  - supports manual dry-run via `workflow_dispatch`.

## Verification checklist

- `bun run media:scan-legacy-references:strict` passes.
- `bun run test:backend` passes.
- `bun run typecheck` passes.
- `bun run lint` passes.
- preview crawl shows no `res.cloudinary.com` URLs.
