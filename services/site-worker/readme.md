# Site preview parent worker

Cloudflare parent worker for the kentcdodds.com migration. See
`docs/agents/cloudflare-worker-architecture.md` for the shared contract.

## Responsibilities

- `GET /healthcheck` → plain text `OK`
- Static assets via `ASSETS` with Express-parity cache headers
- Dynamic requests via `worker_loaders` (`LOADER` binding) using MDX artifacts
  from R2 + `CONTENT_KV`
- RPC entrypoints: `PrismaRpc` (D1), `CacheRpc` (KV), `OutboundProxy` (preview
  mocks)
- Daily cron cleanup for expired `Session` / `Verification` rows

## Dist placeholders (`dist/*.txt`)

The parent bundle imports worker source text from:

- `dist/app-worker.js.txt`
- `dist/vendor/{react,react-dom,react-dom-server,react-jsx-runtime,react-jsx-dev-runtime}.js.txt`

Wrangler `rules: [{ type: "Text", globs: ["**/*.txt"] }]` inlines these as
strings. The app-bundle workstream replaces the committed placeholders via
`npm run build:app-worker --workspace site-worker` without changing parent
worker code.

## Prisma on workerd

1. `services/site/prisma/schema.prisma` includes a second generator:

   ```prisma
   generator site_worker_client {
     provider = "prisma-client"
     output   = "../../site-worker/generated/prisma-client"
     runtime  = "cloudflare"
   }
   ```

2. `npm run prisma:generate --workspace site-worker` (also runs on
   `postinstall`) emits the worker client into `generated/prisma-client/`.

3. `PrismaRpc` uses `@prisma/adapter-d1` with `env.APP_DB`. The
   `runtime = "cloudflare"` generator setting avoids runtime WASM compilation
   (blocked in workerd). `nodejs_compat` remains enabled in `wrangler.jsonc`.

4. No extra `CompiledWasm` wrangler rules were required for Prisma 7.8 with the
   cloudflare runtime generator on this scaffold.

## Local development

```sh
npm run d1:migrations:apply:local --workspace site-worker
npm run dev --workspace site-worker   # http://127.0.0.1:8792
npm run test:local-e2e --workspace site-worker
```

`test:local-e2e` seeds a tiny MDX bundle into local R2/KV, starts
`wrangler dev`, and asserts the placeholder dynamic worker returns
PrismaRpc/CacheRpc round-trips.

If `worker_loaders` is unavailable in your local Wrangler build, unit tests
still cover manifest/module-map/cache/proxy logic; verify the loader path on the
deployed preview worker.

## Preview provisioning + deploy

```sh
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... npm run provision:preview --workspace site-worker
WRANGLER_CONFIG=.wrangler/generated-wrangler.jsonc npm run d1:migrations:apply:staging --workspace site-worker
npm run publish:artifacts --workspace site-worker -- /path/to/bundle.json
REFRESH_CACHE_SECRET=... node services/site-worker/scripts/generate-preview-secrets.mjs
npm exec wrangler -- secret bulk services/site-worker/.wrangler/preview-secrets.json --config services/site-worker/.wrangler/generated-wrangler.jsonc
npm run seed:preview-d1 --workspace site-worker
BUILD_SHA=$(git rev-parse HEAD) npm run deploy --workspace site-worker
```

CI runs the same flow from `.github/workflows/cf-preview-deploy.yml`.

## Scripts

| Script              | Purpose                                                                          |
| ------------------- | -------------------------------------------------------------------------------- |
| `provision:preview` | Idempotently create D1/KV/R2 preview resources + write generated wrangler config |
| `publish:artifacts` | Upload MDX bundle JSON to R2 + update `mdx-manifest:current`                     |
| `seed:preview-d1`   | Idempotent preview seed (`me@kentcdodds.com` / `iliketwix`)                      |
| `test:local-e2e`    | Local wrangler dev smoke with placeholder dynamic worker                         |

D1 migration scripts accept `WRANGLER_CONFIG` (defaults to `wrangler.jsonc`
locally and `.wrangler/generated-wrangler.jsonc` for remote).
