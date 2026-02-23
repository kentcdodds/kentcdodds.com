# Fly.io Scale-Down Recovery Plan

Recovery plan for kcd production when LiteFS/deployment issues cause cascading failures. Scale to a single instance, deploy the fix, verify, then scale back up.

## Prerequisites

- Fly CLI logged in (`fly auth whoami`)
- FLY_MACHINE_ID fix committed and ready to deploy

## Step 1: Scale Down

Destroy all replica machines. **Keep the primary in dfw** (7817602a936548).

```bash
fly machine destroy 0802499c556068 -a kcd  # dfw replica
fly machine destroy 48e3624a76dd28 -a kcd  # gru
fly machine destroy 7811e97b0e2978 -a kcd  # jnb
fly machine destroy 7843929b121938 -a kcd  # ams
fly machine destroy 784e4d3fd595e8 -a kcd  # sin
fly machine destroy 865139bee15658 -a kcd  # bom
fly machine destroy d890de3fe99298 -a kcd  # syd
fly machine destroy e822040fee7398 -a kcd  # cdg
```

**Do NOT destroy 7817602a936548** — that is the dfw primary with the volume.

## Step 2: Deploy the Fix

The build requires `SENTRY_AUTH_TOKEN` as a build secret and `COMMIT_SHA` as a build arg:

```bash
fly deploy -a kcd \
  --build-arg COMMIT_SHA=$(git rev-parse HEAD) \
  --build-secret SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
```

Or push to `main` and let the GitHub Action deploy (it has access to the secret).

This updates the single remaining machine with the new image (including the FLY_MACHINE_ID fix).

## Step 3: Verify

- Check status: `fly status -a kcd`
- Check health: `fly checks list -a kcd`
- Test site: `curl -I https://kentcdodds.com/healthcheck`
- Check logs: `fly logs -a kcd` (look for ZodError — should be gone)

## Step 4: Scale Back Up

Run deploy again to recreate replicas:

```bash
fly deploy -a kcd
```

Fly may recreate machines based on previous configuration. If replicas are not recreated, you may need to clone the primary to other regions via the Fly dashboard or `fly machine clone`.

## Notes

- **Downtime**: Brief downtime during scale-down and deploy is expected.
- **Primary**: The primary holds the LiteFS volume; it must stay in dfw (primary_region in fly.toml).
- **Machine IDs**: Run `fly machines list -a kcd` to get current IDs before scaling down — they may change between runs.
