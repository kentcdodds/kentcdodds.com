# MDX artifact compile pipeline

Compiles all local `content/blog` and `content/pages` MDX into the artifact
bundle JSON consumed by the Cloudflare worker (`docs/agents/cloudflare-worker-architecture.md`).

## Commands

From `services/site`:

```bash
npm run mdx:compile -- --out /tmp/bundle.json --concurrency 4
node other/mdx-artifacts/verify-mdx-artifacts.ts --bundle /tmp/bundle.json
```

## CLI options (`compile-mdx-artifacts.ts`)

| Flag | Description |
| --- | --- |
| `--out <path>` | Output bundle path (default: `/tmp/bundle.json`) |
| `--concurrency <n>` | Parallel document compiles (default: `1`) |
| `--only <keys>` | Comma-separated document keys, e.g. `blog/foo,pages/uses` |
| `--allow-embed-fallback` | On embed network failure, log and leave a plain link instead of failing the compile. Reports fallback count in the summary JSON. CI runners have full network access and should compile without this flag. |

## Verification

`verify-mdx-artifacts.ts` renders each document's IIFE (`code`) and ESM (`esm`)
variants with a shared component stub map and asserts identical server HTML.

Use `--representative-only` for a faster smoke check on a fixed document set.
