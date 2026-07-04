# Cloudflare worker architecture (site migration)

This documents the architecture for running the full kentcdodds.com site on
Cloudflare Workers with user-facing feature parity, no Fly.io dependency, and
content updates that do not require a redeploy. **Production remains on Fly
until DNS cutover** (Phase 3); this doc is the shared contract for the pieces
in `services/site-worker` and the MDX artifact pipeline on the migration branch.

## Overview

```
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

MDX compilation happens in Node (CI or local scripts) with the **exact same
mdx-bundler pipeline as today** (`compileMdx` in
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
			"code": "<mdx-bundler IIFE string (client, same as today)>",
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
(single accessor module; returns `null`s in Node dev so existing code paths
keep working).

## RPC error contract

`D1Rpc` exposes `query(sql, params?)`, `run(sql, params?)`, and
`batch(statements)` for SQL-level access to `APP_DB`. Params and row values
cross the JSRPC boundary via `row-serialization.server.ts` (Dates → ISO strings,
bigint → number, byte views → ArrayBuffer).

`CacheRpc` methods: `get(key)` → cache entry or `null`; `set(key, entry)`;
`delete(key)`; `keys(prefix?, limit?)` → `string[]`. Entries are the same
JSON encoding used by the SQLite cache (Buffer values base64-encoded with the
existing reviver/replacer from `cache.server.ts`).

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
2. **Mocks** — Mailgun, Discord, Kit, Verifier get inline mock responses (same
   shapes as MSW mocks in `services/site/mocks/`).
3. **Passthrough** — everything else (Cloudinary, GitHub raw, Transistor,
   Simplecast, oEmbed providers, Twitter/X API hosts) uses global `fetch`.

`mermaid-to-svg.kentcdodds.workers.dev` is compile-time only (not fetched at
runtime in the worker).

## Dynamic worker env contract

- All string values from the parent worker env (vars + secrets) are passed
  through as plain strings.
- `D1_RPC`: loopback entrypoint with `query(sql, params?)`, `run(sql, params?)`,
  and `batch(statements)` over the parent's `APP_DB` D1 binding. The app's
  `db.server.ts` uses `SqliteExecutorDataTableAdapter` over this RPC when present.
- `CACHE_RPC`: loopback entrypoint with `get(key)`, `set(key, entry)`,
  `delete(key)`, `keys(prefix?)` over `SITE_CACHE_KV`. `cache.server.ts` uses
  it as the cachified store when present (LRU stays in-isolate).
- `CONTENT_RPC`: loopback entrypoint with
  `getDocumentCode(contentDir, slug)` for client MDX IIFE strings.

## Server-side MDX rendering (no eval)

- Route loaders that return MDX pages call `ensureMdxComponentLoaded(page)`
  (server-only), which does `await import(\`mdx/${contentDir}/${slug}.js\`)`
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
production Node). `renderToString` sets React Router's static SSR context, which
**omits** the inline `streamController.enqueue` / `streamController.close`
scripts that deliver turbo-stream loader state to the client. Without those
scripts, `HydratedRouter` never finishes decoding state, `fetcher.Form` submit
handlers never attach, and forms like the theme toggle fall through to native
full-page POSTs. Verify with curl: preview HTML must contain
`streamController.enqueue` (7 inline scripts on the homepage, matching prod).

## Scheduled tasks (crons)

Configured in `services/site-worker/wrangler.jsonc`:

- `0 3 * * *` — daily expired-data cleanup (`Session` / `Verification` rows
  past expiry) via `deleteExpiredSessionsAndVerifications`.
- `*/2 * * * *` — warmup cron hitting `/`, `/blog`, and `/healthcheck` to keep
  the parent artifact cache and a few dynamic isolates warm.

## Performance profile (measured July 2026)

- Warm dynamic isolates serve pages in ~0.10-0.30s TTFB (measured from a US
  VM; production Fly is ~0.15-0.20s), so warm traffic is at parity or faster.
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

```
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

### Observability

`X-Edge-Cache`: `HIT`, `STALE`, `MISS`, or `BYPASS`. Cached responses include
`Age`. Existing timing/isolate headers are omitted from stored entries.

## Local development

Nothing changes for `npm run dev` (Node + Express + MSW). The worker path is
exercised via `services/site-worker` scripts (miniflare/wrangler dev) and the
preview deployment.

## Preview deployment (this branch)

- Worker: `kentcdodds-com-staging` (`kentcdodds-com-staging.kentcdodds.workers.dev`)
- D1: `kentcdodds-com-staging-app-db` (`01a8ba77-2a63-4a14-898d-6023942a480f`)
- KV: `SITE_CACHE_KV`=`5180bc7fb5b14a5888db2ed8ac0e21ee`,
  `CONTENT_KV`=`976edaf098ed4c3391385bf7550ba5a6`
- R2: `kcd-site-cf-preview-artifacts`
- Service bindings: `kcd-oauth-provider`, `kcd-search-worker` (production workers)
- Deploys from `.github/workflows/cf-preview-deploy.yml` on pushes to the
  migration branch. Production site resources are never touched.

### Resource naming

Preview resources use two naming conventions from incremental provisioning:

- **Worker + D1** — `kentcdodds-com-staging*` (worker script, D1 database).
- **KV + R2** — `kcd-site-cf-preview-*` (cache/content KV namespaces, artifact
  bucket).

Unify naming at production cutover when provisioning fresh production
bindings.

### CI token limitations

The repo `CLOUDFLARE_API_TOKEN` can deploy worker scripts and upload secrets
but **cannot** list/create D1/KV/R2 (auth error 10000). Therefore:

- Resource IDs are committed in `services/site-worker/wrangler.jsonc`; `npm run
  provision:preview` skips Cloudflare API calls when IDs are present (use
  `--force-ensure` for fresh environments with a privileged token).
- D1 migrations and seed steps in CI are **non-fatal** with a loud warning.
- Artifact publish in CI uses `POST /resources/mdx-artifacts` (no R2/KV API
  needed).

### Runbook: schema changes

1. Apply migrations manually with a token that has D1 write access:
   `npm run d1:migrations:apply:staging --workspace site-worker`
2. Re-seed if needed: `npm run seed:preview-d1 --workspace site-worker`
3. Redeploy the worker (schema is applied via D1 migrations, not a generated client).

### Runbook: fresh environment provisioning

1. Ensure a Cloudflare API token with D1/KV/R2 create permissions.
2. `npm run provision:preview --workspace site-worker -- --force-ensure`
3. Commit the stamped IDs back into `wrangler.jsonc` if new resources were created.
4. Apply migrations, seed, deploy, upload secrets, publish artifacts.
