# Site preview parent worker

Cloudflare parent worker for the kentcdodds.com migration. See
`docs/agents/cloudflare-worker-architecture.md` for the shared contract.

## Responsibilities

- `GET /healthcheck` → plain text `OK`
- Static assets via `ASSETS` with Express-parity cache headers
- Dynamic requests via `worker_loaders` (`LOADER` binding) using MDX artifacts
  from R2 + `CONTENT_KV`
- RPC entrypoints: `PrismaRpc` (D1), `CacheRpc` (KV), `ContentRpc` (MDX
  artifacts), `OutboundProxy` (preview mocks)
- Scheduled jobs:
  - `0 3 * * *` — daily cleanup for expired `Session` / `Verification` rows
  - `*/2 * * * *` — warmup requests to keep parent artifact cache and dynamic
    isolates warm

## Dist build (`dist/*.txt`)

`npm run build:worker --workspace site-worker` produces:

- `dist/app-worker.js.txt` — esbuild bundle of the dynamic app bootstrap
- `dist/react-shim.js.txt` / `dist/react-jsx-runtime-shim.js.txt` — delegate
  to the single React copy published on `globalThis` by `app-worker.js`

Wrangler `rules: [{ type: "Text", globs: ["**/*.txt"] }]` inlines these as
strings in the parent worker bundle.

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
npm run build:worker --workspace site-worker
npm run test:local-e2e --workspace site-worker   # migrations, seed, publish /tmp/bundle.json
npm run dev --workspace site-worker                # http://127.0.0.1:8792
```

`test:local-e2e` applies D1 migrations, seeds the admin user, publishes the MDX
artifact bundle into local R2/KV, and writes `.dev.vars`. Start `wrangler dev`
separately for interactive testing.

If `worker_loaders` is unavailable in your local Wrangler build, unit tests
still cover manifest/module-map/cache/proxy logic; verify the loader path on the
deployed preview worker.

## Preview provisioning + deploy

```sh
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... npm run provision:preview --workspace site-worker
WRANGLER_CONFIG=generated-wrangler.jsonc npm run d1:migrations:apply:staging --workspace site-worker
npm run publish:artifacts --workspace site-worker -- /path/to/bundle.json
REFRESH_CACHE_SECRET=... node services/site-worker/scripts/generate-preview-secrets.mjs
npm exec wrangler -- secret bulk services/site-worker/.wrangler/preview-secrets.json --config services/site-worker/generated-wrangler.jsonc
npm run seed:preview-d1 --workspace site-worker
BUILD_SHA=$(git rev-parse HEAD) npm run deploy --workspace site-worker
```

CI runs the same flow from `.github/workflows/cf-preview-deploy.yml`.

## Scripts

| Script              | Purpose                                                                          |
| ------------------- | -------------------------------------------------------------------------------- |
| `provision:preview` | Idempotently create D1/KV/R2 preview resources + write generated wrangler config |
| `publish:artifacts` | Upload MDX bundle JSON to R2 + update `mdx-manifest:current` (`--local` for dev) |
| `seed:preview-d1`   | Idempotent preview seed (`me@kentcdodds.com` / `iliketwix`; `--local` for dev)   |
| `test:local-e2e`    | Local migrations, seed, artifact publish, `.dev.vars` setup                      |

D1 migration scripts accept `WRANGLER_CONFIG` (defaults to `wrangler.jsonc`
locally and `generated-wrangler.jsonc` for remote).
