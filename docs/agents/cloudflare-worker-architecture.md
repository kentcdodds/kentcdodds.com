# Cloudflare worker architecture (site migration)

This documents the architecture for running the full kentcdodds.com site on
Cloudflare Workers with user-facing feature parity, no Fly.io dependency, and
content updates that do not require a redeploy. It is the shared contract for
the pieces in `services/site-worker` and the MDX artifact pipeline.

## Overview

```
                        ┌──────────────────────────────────────────┐
 request ──────────────▶│ parent worker (services/site-worker)     │
                        │  - static assets (ASSETS binding)        │
                        │  - fast paths: /healthcheck              │
                        │  - loads + routes to the dynamic app     │
                        │  - hosts RPC entrypoints:                │
                        │      PrismaRpc  (Prisma client on D1)    │
                        │      CacheRpc   (KV-backed cachified)    │
                        │  - scheduled(): expired-data cleanup     │
                        │  bindings: APP_DB (D1), SITE_CACHE_KV,   │
                        │    CONTENT_KV, MDX_ARTIFACTS (R2),       │
                        │    LOADER (worker_loaders), ASSETS       │
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
                        │   - site-content-data.json (yaml data,   │
                        │     blog list metadata, dir lists)       │
                        │  env: string vars + PRISMA_RPC stub +    │
                        │    CACHE_RPC stub (loopback entrypoints) │
                        └──────────────────────────────────────────┘
```

MDX compilation happens in Node (CI or local scripts) with the **exact same
mdx-bundler pipeline as today** (`compileMdx` in
`services/site/app/utils/compile-mdx.server.ts`). The compiled output is
published as an artifact bundle; the worker never compiles or evals anything at
request time. The client keeps the existing `new Function` mdx-bundler path
(unchanged UX); the server imports the ESM variant of the same compile, so SSR
and hydration render identical trees.

## Empirically verified platform facts (probe worker)

`other/loader-probe` + `.github/workflows/cf-preview-deploy.yml` deploys
`kcd-loader-probe-2309`. Verified on this account (July 2026):

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

## Bootstrap ↔ app bridge (globals contract)

The dynamic worker's main module (`app-worker.js`) is an esbuild bundle of
`services/site-worker/src/dynamic/bootstrap.ts` which imports the site server
build. Before handling any request it sets these globals so app code (bundled
from `services/site`) can reach worker-provided content without static imports
that would break the Node/dev build:

- `globalThis[Symbol.for('kentcdodds.contentData')]` — the artifact bundle
  JSON minus the per-document `esm` fields (metadata, `code` strings for the
  client, blogList, dirLists, dataFiles).
- `globalThis[Symbol.for('kentcdodds.loadMdxModule')]` —
  `(contentDir: string, slug: string) => Promise<Record<string, unknown> | null>`
  implemented as `import('mdx/' + contentDir + '/' + slug + '.js')`.
- The existing `Symbol.for('kentcdodds.runtimeEnvSource')` and
  `Symbol.for('kentcdodds.runtimeBindingSource')` bridges from PR #799.

App-side access goes through `services/site/app/utils/content-artifacts.server.ts`
(single accessor module; returns `null`s in Node dev so existing code paths
keep working).

## RPC error contract

`PrismaRpc.query(model, operation, args)` returns
`{ ok: true, result }` or
`{ ok: false, error: { name, code, message, meta, clientVersion } }` (never
throws for Prisma errors). The app-side proxy rethrows an `Error` with
`name`/`code`/`meta` attached so existing error handling (e.g. unique
constraint checks) behaves the same.

`CacheRpc` methods: `get(key)` → cache entry or `null`; `set(key, entry)`;
`delete(key)`; `keys(prefix?, limit?)` → `string[]`. Entries are the same
JSON encoding used by the SQLite cache (Buffer values base64-encoded with the
existing reviver/replacer from `cache.server.ts`).

## Outbound mocking (preview)

The dynamic worker is created with `globalOutbound` pointing at the parent's
`OutboundProxy` entrypoint. By default it passes requests through unchanged.
For external services without preview credentials (Mailgun, Discord, Kit,
Verifier, Twitter API), it serves inline mock responses (same shapes as the
MSW mocks in `services/site/mocks/`), keyed off hostname. Everything else
(Cloudinary, GitHub raw, Transistor, Simplecast, search worker, oauth worker,
oEmbed providers) passes through to the real services.

## Dynamic worker env contract

- All string values from the parent worker env (vars + secrets) are passed
  through as plain strings.
- `PRISMA_RPC`: loopback entrypoint with `query(model, operation, args)`
  hitting the parent's PrismaClient (D1 adapter). The app's
  `prisma.server.ts` returns a Proxy client when `PRISMA_RPC` is present.
- `CACHE_RPC`: loopback entrypoint with `get(key)`, `set(key, entry)`,
  `delete(key)`, `keys(prefix?)` over `SITE_CACHE_KV`. `cache.server.ts` uses
  it as the cachified store when present (LRU stays in-isolate).
- `MDX_MODULES_AVAILABLE`: `'true'` so app code knows server MDX components
  come from the module map.

## Server-side MDX rendering (no eval)

- Route loaders that return MDX pages call `ensureMdxComponentLoaded(page)`
  (server-only), which does `await import(\`mdx/${contentDir}/${slug}.js\`)`
  and caches the component in a module-level registry keyed by
  `${contentDir}/${slug}`.
- `useMdxComponent` checks the server registry first (synchronously, during
  SSR); in the browser (or in Node dev) it falls back to the existing
  mdx-bundler `new Function` path. Both variants are compiled from the same
  source with the same plugins, so trees match and hydration is clean.
- The ESM variant externalizes `react` and `react/jsx-runtime`; those resolve
  to shim modules in the module map that delegate to the single React copy
  published on `globalThis` by `app-worker.js` at startup. Because workerd
  resolves bare imports relative to nested MDX module paths (e.g.
  `mdx/pages/uses.js` → `mdx/pages/react`), the module map must also include
  per-directory aliases (`mdx/pages/react`, `mdx/blog/react`, etc.).

## Local development

Nothing changes for `npm run dev` (Node + Express + MSW). The worker path is
exercised via `services/site-worker` scripts (miniflare/wrangler dev) and the
preview deployment.

## Preview deployment (this branch)

- Worker: `kentcdodds-com-cf-preview` (workers.dev)
- D1: `kcd-site-cf-preview-db` (migrated via existing site-worker d1 scripts,
  seeded with the standard seed data)
- KV: `kcd-site-cf-preview-cache`, `kcd-site-cf-preview-content`
- R2: `kcd-site-cf-preview-artifacts`
- Deploys from `.github/workflows/cf-preview-deploy.yml` on pushes to the
  migration branch. Production resources are never touched.
