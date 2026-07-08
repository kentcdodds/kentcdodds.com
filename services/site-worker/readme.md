# Site parent worker

Cloudflare parent worker for kentcdodds.com. See
`docs/agents/cloudflare-worker-architecture.md` for the shared contract.

## Responsibilities

- `GET /healthcheck` → plain text `OK`
- Static assets via `ASSETS` with Express-parity cache headers
- Dynamic requests via `worker_loaders` (`LOADER` binding) using MDX artifacts
  from R2 + `CONTENT_KV`
- RPC entrypoints: `D1Rpc` (D1 SQL), `CacheRpc` (KV), `ContentRpc` (MDX
  artifacts), `OutboundProxy` (local/staging mocks)
- Scheduled jobs:
  - `0 3 * * *` — daily cleanup for expired `Session` / `Verification` rows
  - `*/2 * * * *` — warmup requests to keep parent artifact cache and dynamic
    isolates warm

## Dist build (`dist/*.txt`)

`npm run build:worker --workspace site-worker` produces:

- `dist/app-worker.js.txt` — esbuild bundle of the dynamic app bootstrap
- `dist/react-shim.js.txt` / `dist/react-jsx-runtime-shim.js.txt` — delegate to
  the single React copy published on `globalThis` by `app-worker.js`

Wrangler `rules: [{ type: "Text", globs: ["**/*.txt"] }]` inlines these as
strings in the parent worker bundle.

## D1 database access

The parent worker exposes `D1Rpc` (`services/site-worker/src/rpc/d1-rpc.ts`) for
SQL-level access to `APP_DB`. The dynamic app worker calls it via the `D1_RPC`
loopback stub; `services/site/app/utils/db.server.ts` adapts it through
`SqliteExecutorDataTableAdapter`.

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
deployed production worker.

## Production deploy

```sh
npm run provision:production --workspace site-worker
WRANGLER_CONFIG=generated-wrangler.jsonc npm run d1:migrations:apply:production --workspace site-worker
node services/site-worker/scripts/generate-worker-secrets.mjs --target=production services/site-worker/.wrangler/production-secrets.json
npm exec wrangler -- secret bulk services/site-worker/.wrangler/production-secrets.json --config services/site-worker/generated-wrangler.jsonc
npm run publish:artifacts --workspace site-worker -- /path/to/bundle.json --via-endpoint https://kentcdodds.com/resources/mdx-artifacts
BUILD_SHA=$(git rev-parse HEAD) npm run deploy --workspace site-worker
```

CI runs the production path from `.github/workflows/deployment.yml` and
`.github/workflows/deploy-site.yml`.

## Scripts

| Script                 | Purpose                                                                          |
| ---------------------- | -------------------------------------------------------------------------------- |
| `provision:production` | Production target: write `generated-wrangler.jsonc`                              |
| `secrets:generate`     | Build worker secrets JSON (`generate-worker-secrets.mjs`; pass `--target=`)      |
| `publish:artifacts`    | Upload MDX bundle JSON to R2 + update `mdx-manifest:current` (`--local` for dev) |
| `seed:preview-d1`      | Local/dev D1 seed helper (`me@kentcdodds.com` / `iliketwix`; `--local` for dev)  |
| `test:local-e2e`       | Local migrations, seed, artifact publish, `.dev.vars` setup                      |

D1 migration scripts accept `WRANGLER_CONFIG` (defaults to `wrangler.jsonc`
locally and `generated-wrangler.jsonc` for remote).
