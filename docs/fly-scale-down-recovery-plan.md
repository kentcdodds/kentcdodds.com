# Fly.io Scale-Down Recovery Plan

Recovery plan for kcd production when LiteFS/deployment issues cause cascading
failures. Scale to a single instance, deploy the fix, verify, then scale back
up.

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

The build now supports missing Sentry upload inputs. If `SENTRY_AUTH_TOKEN` or
`COMMIT_SHA` is missing, deploy still succeeds and skips sourcemap upload.

Basic deploy (no sourcemap upload):

```bash
fly deploy -a kcd
```

Deploy with sourcemap upload enabled:

```bash
fly deploy -a kcd \
  --build-arg COMMIT_SHA=$(git rev-parse HEAD) \
  --build-secret SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
```

GitHub Actions can also deploy with upload enabled since it provides both
values.

This updates the single remaining machine with the new image (including the
FLY_MACHINE_ID fix).

## Step 3: Verify

- Check status: `fly status -a kcd`
- Check health: `fly checks list -a kcd`
- Test site: `curl -I https://kentcdodds.com/healthcheck`
- Check logs: `fly logs -a kcd` (look for ZodError — should be gone)

## Step 4: Scale Back Up (one region at a time)

Do **not** bring up all replicas at once. Clone the primary into one region,
wait for health checks to pass, then move to the next region.

Current standard regions:

- `gru`
- `jnb`
- `ams`
- `sin`
- `bom`
- `syd`
- `cdg`

Template (run sequentially, one region at a time):

```bash
fly machine clone 7817602a936548 -a kcd --region <REGION>
fly machine status <NEW_MACHINE_ID> -a kcd
fly checks list -a kcd
```

Only continue to the next region after the new machine is healthy (`3/3`).

If a machine fails to start or is left in a non-started state, destroy it
before continuing:

```bash
fly machine destroy <MACHINE_ID> -a kcd
```

You can also prune all non-started machines in one pass:

```bash
for id in $(fly m list -a kcd --json | jq -r '.[] | select(.state != "started") | .id'); do
  fly machine destroy "$id" -a kcd --force
done
```

## Step 5: Prune Unattached Volumes (removed regions)

After intentionally removing regions, delete unattached volumes in those
regions to avoid ongoing storage costs.

```bash
for id in $(fly vol list -a kcd --json | jq -r '.[] | select(.attached_machine_id == null and (.region=="jnb" or .region=="ams" or .region=="sin" or .region=="bom" or .region=="syd" or .region=="cdg")) | .id'); do
  fly vol destroy "$id" -a kcd --yes
done
```

Always review `fly vol list -a kcd` first and keep attached volumes in active
regions (`dfw`/`gru`).

## Notes

- **Downtime**: Brief downtime during scale-down and deploy is expected.
- **Primary**: The primary holds the LiteFS volume; it must stay in dfw
  (primary_region in fly.toml).
- **Machine IDs**: Run `fly machines list -a kcd` to get current IDs before
  scaling down — they may change between runs.
- **Avoid parallel startup**: Starting many regional machines concurrently can
  create noisy health-check failures and slow recovery; prefer strict serial
  rollout.
