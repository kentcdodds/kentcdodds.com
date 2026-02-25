# Cloudflare media migration runbook

This runbook describes the **one-time** Cloudinary → Cloudflare migration and
the current Cloudflare Images + Stream workflow.

## Goals

- Upload still images to Cloudflare Images.
- Upload videos to Cloudflare Stream.
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
  - `sourcePath` should point to `content/<repo-media-key>`.
  - `id` should be:
    - Cloudflare Images UUID for `images.json`
    - Cloudflare Stream UID for `videos.json`.

## Scripts

- Normalize MDX layout:
  - `bun run media:normalize-content-layout`
- Normalize legacy `/media/{image,video}/upload/...` content URLs:
  - `bun run media:normalize-legacy-paths`
- Legacy reference scan:
  - `bun run media:scan-legacy-references`
  - `bun run media:scan-legacy-references:strict`
- Bootstrap media from Cloudinary into local `content/**` paths:
  - `bun run media:bootstrap-cloudinary`
- Sync local media files to Cloudflare Images/Stream and update manifests:
  - `bun run media:sync-cloudflare`
  - requires `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`
  - supports dry-run mode:
    - `bun run media:sync-cloudflare -- --dry-run`

## One-time cutover

1. Convert content to directory layout (if not already done).
2. Download any missing media into local `content/**` paths (temporary).
3. Run strict legacy scan and fix all remaining hits:
   - `bun run media:scan-legacy-references:strict`
4. Upload media to Cloudflare Images/Stream and write canonical manifest IDs:
   - `bun run media:sync-cloudflare -- --dry-run`
   - `bun run media:sync-cloudflare`
5. Verify manifests contain only forward mappings (`repo key -> cloudflare id`)
   with `content/<repo-media-key>` source paths.
6. Remove transient migration artifacts from local workspace.

## Ongoing workflow

- Media requests resolve by canonical key and are served from Cloudflare
  Images/Stream delivery URLs.
- Current delivery base URL is `https://media.kcd.dev`.
- During production cutover, update media base URL configuration to
  `https://media.kentcdodds.com` after DNS/zone setup is complete.
- Local media mock serves local `content/**` assets first, can proxy to remote
  media infrastructure when online, and otherwise returns a
  wireframe placeholder image.

## Verification checklist

- `bun run media:scan-legacy-references:strict` passes.
- `bun run test:backend` passes.
- `bun run typecheck` passes.
- `bun run lint` passes.
- preview crawl shows no `res.cloudinary.com` URLs.
