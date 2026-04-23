# Fly.io Scale-Down Recovery Plan

Recovery plan for kcd production when LiteFS/deployment issues cause cascading
failures. Scale down to the two `dfw` machines, deploy the fix, verify, then
scale back up slowly.

## Prerequisites

- Fly CLI logged in (`fly auth whoami`)
- FLY_MACHINE_ID fix committed and ready to deploy

## Step 1: Scale Down to Two `dfw` Machines

First **identify the primary machine** (the one that must keep the LiteFS volume
in **`dfw`**). Machine IDs change over time; do not rely on old IDs from this
doc.

1. List machines and read the **`role`** in Fly metadata (primary vs replica):

   ```bash
   fly machines list -a kcd
   ```

   Or with JSON:

   ```bash
   fly machines list -a kcd --json | jq -r '.[] | "\(.id) \(.region) \(.config.metadata.role // "unknown-role")"'
   ```

   The row with **`primary`** is the one you **must not destroy**. If anything
   looks ambiguous, confirm in the Fly dashboard or against response headers
   (e.g. `X-Fly-Primary-Instance`) before deleting machines.

2. Identify the **secondary `dfw` machine** you want to keep alongside the
   primary. This should be a healthy `dfw` replica. Example JSON view:

   ```bash
   fly machines list -a kcd --json | jq -r '.[] | "\(.id) \(.region) \(.config.metadata.role // "unknown-role") \(.state)"'
   ```

   After this step, you should have exactly:
   - the `dfw` primary machine
   - one additional `dfw` machine

3. **Destroy every other machine** (all non-`dfw` machines and any extra
   `dfw` machines beyond the pair above). Example pattern — set `PRIMARY` and
   `SECONDARY` to the ids you are keeping, verify both are non-empty, then:

   ```bash
   PRIMARY='<paste-primary-machine-id-here>'
   SECONDARY='<paste-secondary-dfw-machine-id-here>'
   for id in $(fly machines list -a kcd --json | jq -r '.[].id'); do
     if [ "$id" != "$PRIMARY" ] && [ "$id" != "$SECONDARY" ]; then
       fly machine destroy "$id" -a kcd --force
     fi
   done
   ```

**Never destroy the primary machine** identified above — it holds the volume
your app depends on. The goal is to end this step with exactly two started
machines in `dfw`.

## Step 2: Deploy the Fix

The build now supports missing Sentry upload inputs. If `SENTRY_AUTH_TOKEN` or
`COMMIT_SHA` is missing, deploy still succeeds and skips sourcemap upload.

Basic deploy (no sourcemap upload):

```bash
fly deploy -a kcd --dockerfile services/site/Dockerfile
```

Deploy with sourcemap upload enabled:

```bash
fly deploy -a kcd --dockerfile services/site/Dockerfile \
  --build-arg COMMIT_SHA=$(git rev-parse HEAD) \
  --build-secret SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
```

GitHub Actions can also deploy with upload enabled since it provides both
values.

This updates the remaining `dfw` pair with the new image (including the
`FLY_MACHINE_ID` fix).

## Step 3: Verify

- Check status: `fly status -a kcd`
- Check health: `fly checks list -a kcd`
- Test site: `curl -I https://kentcdodds.com/healthcheck`
- Check logs: `fly logs -a kcd` (look for ZodError — should be gone)

## Step 4: Scale Back Up (one region at a time)

Do **not** bring up all replicas at once. Clone the primary into one region,
wait for health checks to pass, then move to the next region.

Current standard regions after `dfw`:

- `dfw` (primary region; two instances for redundancy)
- `gru`
- `jnb`
- `ams`
- `sin`
- `bom`
- `syd`
- `cdg`

Template (run sequentially, one region at a time). Use the **same** primary
machine id you kept in Step 1 (`<PRIMARY_MACHINE_ID>`):

```bash
fly machine clone <PRIMARY_MACHINE_ID> -a kcd --region <REGION>
fly machine status <NEW_MACHINE_ID> -a kcd
fly checks list -a kcd
```

Only continue to the next region after the new machine is healthy (`3/3`).

If a machine fails to start or is left in a non-started state, destroy it before
continuing:

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

After intentionally removing regions, delete unattached volumes in those regions
to avoid ongoing storage costs.

```bash
for id in $(fly vol list -a kcd --json | jq -r '.[] | select(.attached_machine_id == null and (.region=="jnb" or .region=="ams" or .region=="sin" or .region=="bom" or .region=="syd" or .region=="cdg")) | .id'); do
  fly vol destroy "$id" -a kcd --yes
done
```

Always review `fly vol list -a kcd` first and keep attached volumes in active
regions (`dfw`/`gru`).

## Notes

- **Downtime**: Brief downtime during scale-down and deploy is expected.
- **Primary**: The primary holds the LiteFS volume; it must stay in **`dfw`**
  (`primary_region` in `fly.toml`). **Determine the current primary id before
  destroying anything** — see Step 1.
- **Minimum recovery footprint**: Keep two started machines in `dfw` during the
  recovery window so production stays concentrated in the primary region
  without dropping to a single point of failure.
- **Machine IDs**: Always resolve primary and replica ids from `fly machines
list` (or `--json`) before each run; they change when machines are replaced.
- **Avoid parallel startup**: Starting many regional machines concurrently can
  create noisy health-check failures and slow recovery; prefer strict serial
  rollout.
