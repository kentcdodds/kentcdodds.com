# Cloudflare worker architecture

This documents the architecture for running the full kentcdodds.com site on
Cloudflare Workers with user-facing feature parity and content updates that do
not require a redeploy. **Production deploys exclusively to Cloudflare Workers**
(`kentcdodds-com`); local dev and CI/e2e run the app in real workerd via
`@cloudflare/vite-plugin` (single-worker HMR model).

## Overview

```text
                        ┌──────────────────────────────────────────┐
 request ──────────────▶│ parent worker (services/site-worker)     │
                        │  - static assets (ASSETS binding)        │
                        │  - fast paths: /healthcheck, /__meta     │
                        │  - POST /resources/mdx-artifacts         │
                        │  - loads + routes to the dynamic app     │
                        │  - hosts RPC entrypoints:                │
                        │      D1Rpc      (SQL executor on D1)     │
                        │      CacheRpc   (KV-backed cachified)    │
                        │      ContentRpc (per-doc client code)    │
                        │      OutboundProxy (outbound fetch)        │
                        │  - scheduled(): expired-data cleanup +   │
                        │    dynamic-isolate warmup                │
                        │  bindings: APP_DB (D1), SITE_CACHE_KV,     │
                        │    CONTENT_KV, MDX_ARTIFACTS (R2),       │
                        │    LOADER, ASSETS, OAUTH_WORKER,           │
                        │    SEARCH_WORKER (service bindings)        │
                        └───────────────┬──────────────────────────┘
                                        │ env.LOADER.get(id, cb)
                                        ▼
                        ┌──────────────────────────────────────────┐
                        │ dynamic app worker (isolate)             │
                        │  id = app:{BUILD_SHA}:content:{version}  │
                        │  modules:                                │
                        │   - app-worker.js  (bootstrap + RR app)  │
                        │     bundles react/react-dom/scheduler    │
                        │     internally (single React instance)   │
                        │   - react, react/jsx-runtime (shims that │
                        │     read shared React from globalThis;   │
                        │     plus per-MDX-dir aliases like        │
                        │     mdx/pages/react for workerd resolve) │
                        │   - mdx/blog/{slug}.js (per post, ESM)   │
                        │   - mdx/pages/{slug}.js                  │
                        │   - site-content-data.json (metadata +   │
                        │     blogList, dirLists, dataFiles; no    │
                        │     per-doc code/esm — see CONTENT_RPC)  │
                        │  env: string vars + D1_RPC stub +        │
                        │    CACHE_RPC + CONTENT_RPC loopback stubs│
                        └──────────────────────────────────────────┘
```

MDX compilation happens in Node (CI or local scripts) with the **same
mdx-bundler pipeline** (`compileMdx` in
`services/site/app/utils/compile-mdx.server.ts`). The compiled output is
published as an artifact bundle; the worker never compiles or evals anything at
request time. The client keeps the existing `new Function` mdx-bundler path
(unchanged UX); the server imports the ESM variant of the same compile, so SSR
and hydration render identical trees.

## Empirically verified platform facts (archived July 2026)

A temporary Worker Loader probe (`other/loader-probe`, worker
`kcd-loader-probe-2309`) validated these facts on this account in July 2026.
The probe and its CI job were removed after validation; the orchestrator deletes
the deployed probe worker separately.

- `worker_loaders` binding deploys via Wrangler (open beta, paid plan).
- Module names must end in `.js`/`.py` unless declared with an explicit type
  (`{ js: '...' }`, `{ wasm: bytes }`). Bare-specifier module names like
  `react` work with `{ js: ... }`.
- `ctx.exports.MyEntrypoint({ props: {} })` loopback stubs can be passed in the
  dynamic worker `env` and support RPC calls from inside the dynamic worker.
- Dynamic `import()` with variable specifiers resolves against the module map
  at request time.
- WASM modules in the module map instantiate correctly.
- `new Function` at request time inside a dynamic worker throws (as expected).
- Dynamic workers can make outbound `fetch` by default.
- **Worker-to-worker `fetch()` on `*.workers.dev` fails with CF error 1042.**
  Outbound calls to production oauth/search workers use **service bindings**
  (`OAUTH_WORKER`, `SEARCH_WORKER`) from the parent's `OutboundProxy`.

## Artifact bundle contract

Produced by `npm run mdx:compile --workspace kentcdodds.com` (Node), published
by CI to R2 + KV. Format (JSON, schema in
`services/site/types/mdx-artifacts.d.ts`):

```jsonc
{
	"schemaVersion": 1,
	"version": "<content hash>",
	"generatedAt": "ISO-8601",
	"documents": {
		"blog/example-post": {
			"contentDir": "blog",
			"slug": "example-post",
			"code": "<mdx-bundler IIFE string (client)>",
			"esm": "<ESM module source (server import, same compile inputs)>",
			"frontmatter": {},
			"readTime": {},
			"dateDisplay": "...",
			"bannerBlurDataUrl": "...",
			"bannerCredit": "..."
		}
	},
	"blogList": [/* MdxListItem[] as produced by getBlogMdxListItems */],
	"dirLists": { "blog": [...], "pages": [...] },
	"dataFiles": { "data/testimonials.yml": "<raw file content>" }
}
```

Storage:

- R2 bucket object: `mdx-artifacts/{version}.json` (bucket binding
  `MDX_ARTIFACTS` on the parent worker)
- KV (`CONTENT_KV`): key `mdx-manifest:current` →
  `{ "version": "...", "r2Key": "mdx-artifacts/{version}.json" }`

The parent worker re-reads the manifest pointer with a short in-memory TTL and
whenever `POST /action/refresh-cache` is received, so newly published content
flips the loader id (`app:{BUILD_SHA}:content:{version}`) and a fresh isolate
picks up the new modules. No worker redeploy is needed for content changes.

### Publishing artifacts

Two paths:

1. **Direct (privileged token):** `npm run publish:artifacts --workspace site-worker -- bundle.json`
   uses Wrangler to write R2 + KV (needs D1/KV/R2 API permissions).
2. **Via endpoint (CI / no CF resource API):** `npm run publish:artifacts --workspace site-worker -- bundle.json --via-endpoint https://…/resources/mdx-artifacts`
   with `REFRESH_CACHE_SECRET` in the `auth` header (same convention as
   `/action/refresh-cache`). The parent worker streams the bundle to R2,
   updates `mdx-manifest:current`, and clears its manifest cache.

`GET /__meta` returns `{ buildSha, contentVersion }` for deploy verification.
Content-only refreshes (`🥬 Refresh Content`) matter when a push changes only
`services/site/content/` and does not trigger a site redeploy: CI compiles MDX,
publishes the artifact bundle via `POST /resources/mdx-artifacts`, and records
the commit via `POST /action/refresh-cache`. Compare SHA resolution prefers
`/refresh-commit-sha.json`, then falls back to `/__meta.buildSha`.

## Bootstrap ↔ app bridge (globals contract)

The dynamic worker's main module (`app-worker.js`) is an esbuild bundle of
`services/site-worker/src/dynamic/bootstrap.ts` which imports the site server
build. Before handling any request it sets these globals so app code (bundled
from `services/site`) can reach worker-provided content without static imports
that would break the Node/dev build:

- `globalThis[Symbol.for('kentcdodds.contentData')]` — the artifact bundle
  JSON with per-document `code` and `esm` **stripped** (metadata, blogList,
  dirLists, dataFiles only). Client IIFE strings are served on demand via
  `CONTENT_RPC.getDocumentCode(contentDir, slug)`.
- `globalThis[Symbol.for('kentcdodds.loadMdxModule')]` —
  `(contentDir: string, slug: string) => Promise<Record<string, unknown> | null>`
  implemented as `import('mdx/' + contentDir + '/' + slug + '.js')`.
- The existing `Symbol.for('kentcdodds.runtimeEnvSource')` and
  `Symbol.for('kentcdodds.runtimeBindingSource')` bridges from PR #799.

App-side access goes through `services/site/app/utils/content-artifacts.server.ts`
(single accessor module; returns `null`s when the artifact globals are unset —
e.g. Node unit tests — so existing code paths keep working).

## RPC error contract

`D1Rpc` exposes session-scoped SQL over `APP_DB`: `sessionQuery(bookmark,
sql, params?)`, `sessionRun(...)`, and `sessionBatch(...)` — each call opens
`APP_DB.withSession(bookmark)` and returns the resulting bookmark (there is
no persistent server-side session object). Params and row values cross the
JSRPC boundary via `row-serialization.server.ts` (Dates → ISO strings, bigint
→ number, byte views → ArrayBuffer).

The dynamic worker keeps the active D1 session bookmark in a per-request
AsyncLocalStorage store (`kcd_d1_bookmark` cookie, HttpOnly, 600s max-age) so
reads can use regional replicas while preserving read-your-writes. The
bookmark cookie is allowlisted in the parent page cache (routing metadata,
not personalization) — without that, every D1-touching anonymous request
would bypass the page cache for the cookie's lifetime. Responses include
`X-D1-Stats` (`queries`, `primary`, `replica`, `regions=…`) with D1
`meta.served_by_*` aggregates. See [D1 read replication](#d1-read-replication)
below.

`CacheRpc` methods: `get(key)` → cache entry or `null`; `set(key, entry)`;
`delete(key)`; `keys(prefix?, limit?)` → `string[]`. Entries use the KV JSON
encoding from `cache-encoding.server.ts` (Buffer values base64-encoded).

`ContentRpc.getDocumentCode(contentDir, slug)` returns the mdx-bundler IIFE
string for client hydration, or `null` if the document is missing. Reads from
the parent's in-memory artifact bundle cache (populated from R2/KV).

## Outbound routing

The dynamic worker is created with `globalOutbound` pointing at the parent's
`OutboundProxy` entrypoint.

1. **Service bindings** — requests to `kcd-oauth-provider.kentcdodds.workers.dev`
   or the hostname from `SEARCH_WORKER_URL` (default
   `kcd-search-worker.kentcdodds.workers.dev`) are dispatched via
   `OAUTH_WORKER.fetch()` / `SEARCH_WORKER.fetch()` instead of global `fetch`
   (avoids CF error 1042 on worker-to-worker `*.workers.dev` calls).
2. **Mocks** — Cloudflare Email Sending, Discord, Kit, Verifier get inline mock
   responses (same shapes as MSW mocks in `services/site/mocks/`).
3. **Passthrough** — everything else (GitHub raw, Transistor, Simplecast,
   oEmbed providers, the Twitter syndication CDN) uses global `fetch`.

`mermaid-to-svg.kentcdodds.workers.dev` is compile-time only (not fetched at
runtime in the worker).

## Dynamic worker env contract

- All string values from the parent worker env (vars + secrets) are passed
  through as plain strings.
- `D1_RPC`: loopback entrypoint with session-scoped SQL methods over the parent's
  `APP_DB` D1 binding. The app's `db.server.ts` uses
  `SqliteExecutorDataTableAdapter` over this RPC when present.
- `CACHE_RPC`: loopback entrypoint with `get(key)`, `set(key, entry)`,
  `delete(key)`, `keys(prefix?)` over `SITE_CACHE_KV`. `cache.server.ts` uses
  it as the cachified store when present (LRU stays in-isolate).
- `CONTENT_RPC`: loopback entrypoint with
  `getDocumentCode(contentDir, slug)` for client MDX IIFE strings.

## Server-side MDX rendering (no eval)

- Route loaders that return MDX pages call `ensureMdxComponentLoaded(page)`
  (server-only), which does `await import('mdx/' + contentDir + '/' + slug + '.js')`
  and caches the component in a module-level registry keyed by
  `${contentDir}/${slug}`.
- `useMdxComponent` checks the server registry first (synchronously, during
  SSR); in the browser (or in Node dev) it falls back to the existing
  mdx-bundler `new Function` path via `getDocumentCode` / `CONTENT_RPC`. Both
  variants are compiled from the same source with the same plugins, so trees
  match and hydration is clean.
- The ESM variant externalizes `react` and `react/jsx-runtime`; those resolve
  to shim modules in the module map that delegate to the single React copy
  published on `globalThis` by `app-worker.js` at startup. Because workerd
  resolves bare imports relative to nested MDX module paths (e.g.
  `mdx/pages/uses.js` → `mdx/pages/react`), the module map must also include
  per-directory aliases (`mdx/pages/react`, `mdx/blog/react`, etc.).

## SSR streaming requirement (React Router hydration)

The dynamic worker must use `renderToReadableStream` for document SSR (same as
production). React Router's static SSR context omits the inline
`streamController.enqueue` / `streamController.close` scripts that deliver
turbo-stream loader state to the client when a non-streaming renderer is used.
Without those scripts, `HydratedRouter` never finishes decoding state,
`fetcher.Form` submit handlers never attach, and forms like the theme toggle
fall through to native full-page POSTs. Verify with curl: HTML must contain
`streamController.enqueue` (7 inline scripts on the homepage).

## Media serving (R2 + Workers Images)

All photos/illustrations/video live in the `kentcdodds-com` R2 bucket, keyed by
stable public IDs (some hand-copied assets use prefix-stripped keys;
`mediaKeyCandidates` in `services/site/app/utils/media.ts` tries both). The
parent worker serves them at `/media/<transform-segment>/<id>`
(`services/site-worker/src/media.ts` + shared
`services/site/app/utils/media-serving.server.ts`):

- **Transforms** run through the Workers `images` binding (`IMAGES`):
  width/height/aspect-ratio, `fit` (cover/contain/pad/scale-down), `gravity`
  (`auto` saliency — the binding has **no face gravity**; face-oriented crops
  in content map to `auto`), background fill, blur (LQIP), quality.
- **Format negotiation**: `f_auto` (default) serves AVIF/WebP by `Accept`
  header. The Workers Cache API ignores `Vary`, so the Accept class
  (avif/webp/base) is baked into the edge-cache key (`__accept` param).
- **SVG masters pass through untouched** (binding cannot rasterize SVG).
- **Video** (mp4 detected by content type/extension/magic) streams original
  bytes with `Range` support; transforms are ignored.
- **Input limit**: the binding fails on inputs over ~20 MiB
  ("Network connection lost"); keep masters within that bound.
- **Edge cache**: `caches.default`, 1-year immutable; media is excluded from
  dynamic rate limiting (asset tier).
- URL building in the app goes exclusively through `buildMediaUrl` /
  `getImgProps` (`app/images.tsx`); `bannerCloudinaryId` frontmatter and
  `cloudinaryId` YAML/MDX prop names are retained as content contracts.
- OG rendering resolves R2 assets directly via the `MEDIA_BUCKET` + `IMAGES`
  bindings (no HTTP hop); Node scripts and dev fall back to the deployed
  `/media` endpoint.
- In dev, missing local objects proxy from the deployed endpoint; transformed
  variants are proxied whole because the local miniflare images binding is
  low-fidelity (letterboxes instead of cover-cropping).

## Scheduled tasks (crons)

Configured in `services/site-worker/wrangler.jsonc`:

- `0 3 * * *` — daily expired-data cleanup (`Session` / `Verification` rows
  past expiry) via `deleteExpiredSessionsAndVerifications`.
- `*/2 * * * *` — warmup cron hitting `/`, `/blog`, and `/healthcheck` to keep
  the parent artifact cache and a few dynamic isolates warm.

## Call Kent audio pipeline (queue + callbacks)

Episode audio generation runs in the separate `kcd-call-kent-audio-worker`
(queue consumer + ffmpeg sandbox container). Flow:

1. The save action enqueues a job to the `kcd-call-kent-audio` Cloudflare
   Queue via REST, including a per-job `callbackUrl` built from the request
   origin (`getDomainUrl`). This is what routes callbacks to the right
   deployment (workers.dev preview vs custom domain); the audio worker only
   honors https URLs on site-owned hosts and otherwise falls back to its
   static `CALL_KENT_AUDIO_CALLBACK_URL` env var.
2. The audio worker sends HMAC-signed `started` / `completed` / `failed`
   callbacks to `/resources/calls/episode-audio-callback` with a **10s fetch
   timeout**. The callback handler must therefore respond fast: the heavy
   post-completion pipeline (R2 downloads, Whisper transcription, metadata
   generation) runs via `runBackgroundTask`, never awaited in the handler.
   Awaiting it caused the audio worker to abort after 10s and send a
   `failed` event that flipped READY-bound drafts to ERROR.
3. Errors are recorded on the `CallKentEpisodeDraft` row (`status: 'ERROR'`,
   `errorMessage`); recovery = reset the row to
   `status='PROCESSING', step='GENERATING_AUDIO'` and re-enqueue the job.

Deploying the audio worker from a VM without docker: `wrangler deploy
--containers-rollout=none` updates the worker JS without rebuilding the
sandbox container image (fine when only the consumer logic changed).

## Performance profile (measured July 2026)

- Warm dynamic isolates serve pages in ~0.10-0.30s TTFB (measured from a US
  VM).
- Cold dynamic isolates cost ~1.4-2.5s: ~0.9s isolate creation + module-map
  transfer + app bundle eval, plus first-request work. Mitigations in place:
  minified app bundle (9.4 → 4.1MB), per-document `code` served via
  `CONTENT_RPC` instead of shipping ~8.6MB in `site-content-data.json`,
  parent-memory bundle/module-map caches, KV mirror of the artifact bundle
  (`mdx-bundle:{r2Key}`, edge-cached with `cacheTtl`) so cold parents skip the
  ~300ms R2 read, cached worker stubs, and the warmup cron above.
- Cloudflare rotates dynamic isolates aggressively at low traffic, so
  low-traffic previews still see the cold tail on a fraction of requests;
  sustained traffic keeps the pool warm.

## Anonymous page cache (parent worker)

The parent worker (`services/site-worker/src/page-cache.ts`) caches anonymous
document responses in `SITE_CACHE_KV` so repeat traffic avoids the dynamic
isolate cold-start tail (~1.4–2.5s). After fill, cached pages typically serve
in ~0.1–0.2s TTFB regardless of dynamic isolate state.

### Key layout

```text
page-cache:{generation}:{host}:{pathname}{?sortedSearch}:{theme}:{md}
```

- `generation` — counter in `CONTENT_KV` key `page-cache:generation` (read
  through a ~15s parent-memory cache). Bumping generation invalidates all prior
  keys; old entries expire naturally via KV `expirationTtl` (~26h).
- `theme` — `light`, `dark`, or `none` from the `en_theme` cookie.
- `md` — `1` when `Accept` prefers `text/markdown` (same negotiation as the
  dynamic bootstrap), else `0`.

KV reads use `{ cacheTtl: 30 }`. Entries are JSON:
`{ body, status, headers: [[k,v]], nonce, storedAt }`.

### TTLs

- **Fresh:** 300s (`PAGE_CACHE_FRESH_TTL_SEC`) — served as `X-Edge-Cache: HIT`.
- **Stale-while-revalidate:** after fresh TTL, serve immediately as
  `X-Edge-Cache: STALE` and `ctx.waitUntil(revalidate())` through the dynamic
  worker (in-flight revalidation deduped in parent memory).
- **KV expiration:** ~26h per entry.

### Serve eligibility

`GET`/`HEAD` only; no `Authorization` header; `PAGE_CACHE_DISABLED=true`
kill-switch. Cookie header must not contain session (`KCD_root_session`), login
flash (`KCD_login`), or webauthn (`webauthn-challenge`). Only `en_theme` and
`KCD_client_id` are allowed besides absence of cookies. Pathname must not match
bypass prefixes (`/me*`, `/login`, `/action/*`, `/resources/*`, `/oauth*`,
`/mcp*`, `/discord*`, `/contact`, `/.well-known/*`, admin/record routes, etc.).
Static assets are handled by `ASSETS` before the page cache runs.

### Store eligibility

Status 200; no `Set-Cookie` on the fill response (stripped before store when
fill is cookieless). Content types: `text/html`, `text/markdown`,
`application/rss+xml`, `application/xml`, or `application/json` on known public
feeds (`/blog.json`, `/refresh-commit-sha.json`, `/sitemap.xml`,
`/blog/rss.xml`).

**Fill strategy:** anonymous HTML does not embed `KCD_client_id`; cache fill
forwards a synthetic request with cookies stripped except `en_theme`. If the
fill response sets `KCD_client_id`, `Set-Cookie` is stripped before storing.
Real visitors receive client cookies from uncached dynamic responses (e.g. first
`MISS` or `POST /action/mark-as-read`).

### Nonce rewrite

Cached HTML includes a per-response CSP nonce. The nonce at fill time is stored
in the entry. On every `HIT`/`STALE`, the parent generates a fresh nonce,
`replaceAll`s it through the body and `Content-Security-Policy` header (including
`data-evt-` → `nonce="..."` transforms from `entry.server.tsx`).

### Invalidation

`page-cache:generation` is bumped to `Date.now().toString()` in:

1. `POST /resources/mdx-artifacts` (`handlePublishArtifacts`)
2. `POST /action/refresh-cache` (parent intercept before dynamic forward)

The parent in-memory generation cache is cleared on bump.
After a content-only refresh completes its final generation bump, the refresh
workflow sends cookieless requests for affected public URLs through
`kentcdodds.com`. Each request carries the generation returned by the refresh;
an isolate on an older generation returns `409` so the workflow retries. On a
cache miss, the worker synchronously stores the response and confirms it with
`X-Page-Cache-Stored: true`; an existing `HIT` for the requested generation is
also accepted. This renders changed MDX before an end user arrives without
depending on KV read-after-write visibility. Blog changes also prewarm the
homepage, blog index, feeds, and sitemap.

### Observability

`X-Edge-Cache`: `HIT`, `STALE`, `MISS`, or `BYPASS`. Cached responses include
`Age`. Existing timing/isolate headers are omitted from stored entries.

### Privacy invariant (client-id personalization)

Some loaders render per-client state for anonymous visitors keyed by the
`KCD_client_id` cookie (`/blog` read-marks, `/chats` homework completion).
Two protections in `page-cache.ts` keep that data out of the shared cache:

- `isClientPersonalizedPath` bypasses serve entirely for those paths when the
  request carries a client id. **Add new clientId-personalized paths here.**
- The visitor's own response is only reused as the shared cache fill when the
  request carried no cookies beyond theme; otherwise the fill happens via a
  cookie-stripped background fetch (`buildPageCacheFillRequest`).

### Rate limiting interaction (accepted trade-off)

Responses served from the parent page cache (`HIT`/`STALE`) do not pass
through the dynamic worker, so they bypass app-level rate limiting entirely,
and the dynamic-isolate rate limiter is per-isolate (not global): the
effective limit is roughly `limit × active isolates`, so **the in-memory
maps must not be treated as production abuse control**. Parent-served routes
(`/media/*`, `/resources/og-image`) additionally have blunt per-isolate
per-IP caps in `parent-rate-limit.ts` (600/min and 60/min respectively) as
an anti-burn guard.

Real shared abuse control must come from Cloudflare zone-level tools (WAF
custom rules, Rate Limiting rules, Bot Fight Mode). Prefer zone rules for
sensitive tiers (auth endpoints, search, OG/media). `/media` and OG rendering
consume Images transformations and R2 reads per request; if spend becomes
noticeable, add zone rate-limiting rules scoped to those paths.

## Local development

`npm run dev` (in `services/site`) runs two processes concurrently:

1. **MDX dev-watcher sidecar** (`other/mdx-artifacts/dev-watcher.ts`) — compiles
   all local MDX on startup (cached under `node_modules/.cache/mdx-dev/`), watches
   `content/` for changes, and exposes `POST /__dev/capture-email` (port 3099)
   for Cloudflare Email Sending mock capture.
2. **Vite + React Router dev** with `@cloudflare/vite-plugin` — serves the app
   in real workerd with local D1/KV bindings from `wrangler.dev.jsonc`.

### Dev vs production fidelity trade-off

The Vite plugin uses a **single-worker** model for HMR. Production uses the
**parent worker + Worker Loader dynamic worker** topology with RPC stubs
(`D1_RPC`, `CACHE_RPC`, `CONTENT_RPC`). Local dev binds D1/KV directly and
loads MDX server modules via Vite `/@fs` dynamic imports (no eval in workerd).
CI e2e against the dev worker exercises real workerd but not the parent/loader
split; production smoke tests cover the full topology.

### Dev worker entry

`services/site/workers/dev-entry.ts` — `createRequestHandler` +
`virtual:react-router/server-build`, runtime env/binding bridges, pre-router
pipeline (rate limiting, CSP), outbound fetch mocks when `MOCKS=true`, and MDX
content from `virtual:mdx-dev-manifest` + `/@fs` module imports.

### MDX in dev (no eval in workerd)

Compiled server ESM modules are written as real files under
`node_modules/.cache/mdx-dev/modules/{contentDir}/{slug}.{hash}.mjs`. The dev
worker imports them via `import('/@fs' + path + '?t=' + mtime)`. Client `code`
(IIFE strings) still hydrates via `new Function` in the browser. React is
deduped via Vite resolution so interactive MDX SSR shares one React instance.

### Database and cache in dev

- `APP_DB` — local Miniflare D1 (persistent under `.wrangler/state/v3/d1/`).
  Seed: `npm run db:reset --workspace kentcdodds.com`.
- `SITE_CACHE_KV` / `CONTENT_KV` — local Miniflare KV simulations.
- `db.server.ts` uses a direct-D1 executor when bindings expose `.prepare`/`.batch`.
- `cache.server.ts` uses direct KV when `SITE_CACHE_KV` is present.

### Outbound mocks in dev

MSW (`msw/node`) cannot run in workerd. When `MOCKS=true`, the dev worker wraps
`globalThis.fetch` with routes from `outbound-mock-routes.server.ts` (shared
with site-worker's `OutboundProxy`). Signup verification emails are captured to
`mocks/msw.local.json` via the sidecar HTTP endpoint and logged to the worker
console.

The full parent + dynamic worker topology is exercised via
`services/site-worker` (`npm run dev --workspace site-worker` on port 8792) and
production deploy smoke tests.

### Site-worker local dev

After local D1 migrations are applied, start the parent worker:

```sh
npm run dev --workspace site-worker
```

The worker listens on `http://127.0.0.1:8792` and exposes `GET /healthcheck`
(plain text `OK`) plus the full site routes through the dynamic app worker.

## Production deployment (main)

- Worker: `kentcdodds-com` (`kentcdodds-com.kentcdodds.workers.dev`; custom
  domains `kentcdodds.com` / `www.kentcdodds.com` attached in the dashboard)
- D1: `kentcdodds-com-db` (`af33bd8b-c9b2-484a-afa5-43ee322ff49c`)
- KV: `SITE_CACHE_KV`=`9430f933f2ff4bc5881385851869b02e`,
  `CONTENT_KV`=`e9ec6e92d8034f3db76343162f2b3a26`
- R2: `kentcdodds-com-artifacts`
- Service bindings: production oauth/search workers
- Deploys from `.github/workflows/deployment.yml` → `deploy-site.yml` on pushes
  to `main` (`npm run provision:production`, `generate-worker-secrets.mjs
--target=production`, artifact publish via endpoint, D1 migrations, smoke).

`wrangler.jsonc` uses local placeholder bindings at the top level and
`env.production` overrides for production bindings. `generate-worker-config.mjs`
writes `generated-wrangler.jsonc` with production bindings + `BUILD_SHA`.

### CI token limitations

The repo `CLOUDFLARE_API_TOKEN` can deploy worker scripts and upload secrets
but **cannot** list/create D1/KV/R2 (auth error 10000). Therefore:

- Resource IDs are committed in `services/site-worker/wrangler.jsonc`; `npm run
provision:production` skips Cloudflare API calls when IDs are present (use
  `--force-ensure` for fresh environments with a privileged token).
- Artifact publish in CI uses `POST /resources/mdx-artifacts` (no R2/KV API
  needed).

### D1 migrations

Committed flat SQL files live in `services/site/migrations/`. Wrangler applies
them in filename order and journals each applied filename in the `d1_migrations`
table. Do not rename migration files after deploy.

D1 rejects `CREATE TEMP TABLE` in migrations — use a regular guard table and
drop it in the same migration when needed.

| Command                                                          | Target                          |
| ---------------------------------------------------------------- | ------------------------------- |
| `npm run d1:migrations:list:local --workspace site-worker`       | List pending local Miniflare D1 |
| `npm run d1:migrations:apply:local --workspace site-worker`      | Apply to local Miniflare D1     |
| `npm run d1:migrations:apply:production --workspace site-worker` | Apply to remote production D1   |

### Runbook: schema changes

1. Apply migrations manually with a token that has D1 write access (production
   command from the table above).
2. Redeploy the worker (schema is applied via D1 migrations, not a generated
   client).

### Runbook: fresh environment provisioning

1. Ensure a Cloudflare API token with D1/KV/R2 create permissions.
2. `npm run provision:production --workspace site-worker -- --force-ensure`
3. Commit the stamped IDs back into `wrangler.jsonc` if new resources were created.
4. Apply migrations, seed, deploy, upload secrets, publish artifacts.

## D1 read replication

Enable globally for production D1 (needs D1:Edit token):

```bash
export CLOUDFLARE_API_TOKEN=…
export CLOUDFLARE_ACCOUNT_ID=a41d50ecaf0ae0f86dd1824ef6729cb2

curl -sX PUT \
  "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/af33bd8b-c9b2-484a-afa5-43ee322ff49c" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"read_replication":{"mode":"auto"}}'
```

`npm run provision:production --workspace site-worker` calls
`ensureReadReplication` idempotently when a privileged token is present; CI
tokens without D1:Edit log a warning and continue.

Verify mode + primary region:

```bash
curl -sX GET \
  "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/af33bd8b-c9b2-484a-afa5-43ee322ff49c" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" | jq '.result | {read_replication, running_in_region, primary_location_hint}'
```

**Primary location (July 2026):** production D1 reports
`running_in_region: ENAM`. Prefer `running_in_region` over
`primary_location_hint` when checking older databases.
