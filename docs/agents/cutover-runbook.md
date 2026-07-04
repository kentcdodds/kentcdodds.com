# Production cutover runbook: Fly SQLite → Cloudflare Workers + D1

Ordered procedure for hard cutover of **kentcdodds.com** from the Fly.io app (`kcd`) to the Cloudflare Workers stack (`kentcdodds-com` worker + D1 `kentcdodds-com-db`).

**Migration scripts:** `services/site-worker/scripts/migrate-sqlite-to-d1.mjs` (full import + `--since` backfill).

**Accepted data-loss window:** a few minutes of writes during DNS propagation and the backfill gap. Deletions on Fly during the window are **not** replicated (accepted). Writes to D1 during a failed cutover that rolls back to Fly are **lost on rollback** (symmetric caveat).

---

## 0. Pre-cutover checklist (T−24h … T−1h)

### Infrastructure

- [ ] Production worker deployed and healthy (`kentcdodds-com` on `*.kentcdodds.workers.dev`).
- [ ] D1 `kentcdodds-com-db` (`af33bd8b-c9b2-484a-afa5-43ee322ff49c`) has all Prisma migrations applied:
  ```bash
  npm run d1:migrations:apply:staging --workspace site-worker
  ```
  (Uses `generated-wrangler.jsonc` pointed at production bindings after merge.)
- [ ] MDX artifacts published to production R2/KV; `GET /__meta` shows expected `buildSha` + `contentVersion`.
- [ ] Smoke test on workers.dev URL (login, blog, mark-as-read, favorites).

### Secrets

- [ ] All production secrets uploaded to the worker (not derived fallbacks). The deploy pipeline warns when fallbacks are in use — resolve every warning before cutover.
- [ ] `REFRESH_CACHE_SECRET`, OAuth, search, Mailgun, etc. match Fly production values.

### DNS

- [ ] `kentcdodds.com` zone is on Cloudflare (required for Workers custom domains).
- [ ] Lower TTL on apex/`www` A/AAAA or CNAME records to **60–300s** (do this ≥1h before flip so stale caches expire quickly).

### Fly standby

- [ ] Fly app `kcd` remains running (scaled to 1 machine) but **idle after cutover** — keep for rollback for **N days** (recommend 7–14) before destroy.
- [ ] Do **not** scale Fly to zero until confidence window ends.

### Local tooling

- [ ] `flyctl` authenticated; Cloudflare API token with D1 write + Workers deploy (privileged token, not CI read-only token).
- [ ] Node 26 + repo dependencies installed.

### Double-check production DB path on Fly

Production SQLite path comes from `services/site/Dockerfile`:

```dockerfile
ENV LITEFS_DIR="/data/litefs-disabled"
ENV DATABASE_FILENAME="sqlite.db"
ENV DATABASE_PATH="$LITEFS_DIR/$DATABASE_FILENAME"
```

**Expected path:** `/data/litefs-disabled/sqlite.db`  
**Volume mount:** `/data` (`fly.toml` → `destination = "/data"`)

At cutover, **verify on the live machine** before snapshot:

```bash
fly ssh console -a kcd -C "ls -la /data /data/litefs-disabled && database-cli 'SELECT COUNT(*) FROM User;'"
```

(`database-cli` is a container alias → `sqlite3 $DATABASE_PATH`.)

Historical LiteFS used `/litefs`; that path is disabled (`litefs-disabled` dir). If Dockerfile env changes before cutover, use whatever `echo $DATABASE_PATH` prints inside the container.

---

## 1. Export Fly production SQLite (runbook — not automated)

Prefer **`.backup`** (consistent snapshot) over streaming `.dump` over SSH (encoding/TTY issues).

### 1a. Create hot snapshot on the volume

```bash
fly ssh console -a kcd -C "sqlite3 \"\$DATABASE_PATH\" '.backup /data/migrate-snapshot.db'"
```

Or with explicit path if env is unset:

```bash
fly ssh console -a kcd -C "sqlite3 /data/litefs-disabled/sqlite.db '.backup /data/migrate-snapshot.db'"
```

### 1b. Download snapshot via SFTP

```bash
fly ssh sftp get /data/migrate-snapshot.db ./migrate-snapshot-$(date -u +%Y%m%dT%H%M%SZ).db -a kcd
```

### 1c. Optional local inspection

```bash
sqlite3 migrate-snapshot-*.db ".tables"
sqlite3 migrate-snapshot-*.db "SELECT COUNT(*) FROM PostRead;"
sqlite3 migrate-snapshot-*.db ".dump" > migrate-snapshot.sql   # text dump for human review only
```

**The migration script takes the binary `.db` file**, not the text dump.

### 1d. Record snapshot timestamp

```bash
SNAPSHOT_TIME=$(sqlite3 migrate-snapshot-*.db "SELECT datetime('now');")
# Or use the wall clock when .backup finished (UTC ISO-8601):
SNAPSHOT_TIME="2026-07-04T18:30:00.000Z"
```

Save `SNAPSHOT_TIME` — required for the post-DNS backfill (`--since`).

---

## 2. T−0: maintenance (optional)

- Post site banner / tweet if desired.
- Optionally enable Fly maintenance mode (only if you accept complete write outage on Fly during migration). Minimum path: proceed with snapshot + DNS flip; Fly serves stale traffic until DNS moves.

---

## 3. Full migration into production D1

Generate a production wrangler config (or use `generated-wrangler.jsonc` after production IDs are stamped) with:

```jsonc
"d1_databases": [{
  "binding": "APP_DB",
  "database_name": "kentcdodds-com-db",
  "database_id": "af33bd8b-c9b2-484a-afa5-43ee322ff49c",
  "migrations_dir": ".wrangler/site-prisma-migrations"
}]
```

Ensure migrations are applied **before** data import (empty tables).

```bash
export CLOUDFLARE_API_TOKEN=…   # privileged; never commit
export CLOUDFLARE_ACCOUNT_ID=a41d50ecaf0ae0f86dd1824ef6729cb2

cd services/site-worker
npm run d1:migrations:prepare

npm run migrate:sqlite-to-d1 -- \
  --source /path/to/migrate-snapshot-*.db \
  --database APP_DB \
  --config ./generated-wrangler.jsonc \
  --verify
```

**Idempotence:** uses `INSERT … ON CONFLICT … DO UPDATE` (not `INSERT OR REPLACE`) so parent-row updates do not CASCADE-delete children. Re-runs converge safely.

**Resumability:**

```bash
# Retry one table
npm run migrate:sqlite-to-d1 -- --source … --database APP_DB --config … --tables PostRead

# Extra filter (ANDed with --since clause when present)
npm run migrate:sqlite-to-d1 -- … --table-where PostRead="postSlug LIKE 'fix-%'"
```

Review `--verify` output: per-table counts, `max(createdAt)`, five random users (emails shown as `sha256:…` truncated hashes).

---

## 4. Flip DNS to Cloudflare Workers

Attaching a **Workers Custom Domain** replaces the existing DNS record for that hostname.

### Dashboard

1. Cloudflare → **Workers & Pages** → `kentcdodds-com` → **Settings** → **Domains & Routes**.
2. **Add Custom Domain** → `kentcdodds.com` (and `www.kentcdodds.com` if used).
3. Confirm DNS records update (apex may become AAAA to Cloudflare anycast).

### API (alternative)

```bash
# Attach custom domain to worker script
curl -sX PUT \
  "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/domains" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"hostname":"kentcdodds.com","service":"kentcdodds-com","environment":"production"}'
```

Repeat for `www` if applicable. Verify with:

```bash
dig +short kentcdodds.com
curl -sI https://kentcdodds.com/healthcheck
```

Expect `200` from the worker build.

---

## 5. Watch traffic (T+0 … T+15m)

```bash
npm exec wrangler -- tail kentcdodds-com --format pretty
```

- Cloudflare zone **Analytics** → HTTP traffic spike on worker.
- Fly logs should taper as DNS caches expire (TTL-dependent, typically 5–15 min with lowered TTL).
- Spot-check: login, session cookie, mark-as-read, webauthn (if applicable).

---

## 6. Incremental backfill (writes during cutover window)

After DNS has mostly propagated (~5–15 min), copy rows created/updated on Fly **after** `SNAPSHOT_TIME`.

If Fly still received writes post-snapshot, take a **second** `.backup` or run backfill against a fresher snapshot; the `--since` path assumes the **same** source file plus new rows applied locally OR a new snapshot that still contains old rows (INSERT OR REPLACE overwrites).

**Typical path** (Fly still running, same snapshot file stale): take another Fly `.backup` download, then:

```bash
npm run migrate:sqlite-to-d1 -- \
  --source /path/to/migrate-snapshot-*.db \
  --database APP_DB \
  --config ./generated-wrangler.jsonc \
  --since "${SNAPSHOT_TIME}" \
  --verify
```

`--since` behavior:

- Tables **with** `updatedAt` (`User`, `Password`, `Passkey`, `Call`, `CallKentEpisodeDraft`, `CallKentCallerEpisode`, `Favorite`, `HomeworkCompletion`):  
  `createdAt > since OR updatedAt > since`
- Other tables (`Session`, `Verification`, `PostRead`): `createdAt > since` only.
- Upserts use `ON CONFLICT DO UPDATE` (not `REPLACE`) to avoid CASCADE deletes on parent tables.
- **Deletions** on Fly during the window are **not** propagated (accepted loss).

---

## 7. Final verification

```bash
# Re-run verify-only by running full migrate with --verify on unchanged snapshot
# (idempotent; fast if no new rows)
npm run migrate:sqlite-to-d1 -- --source … --database APP_DB --config … --verify

# Worker health
curl -s https://kentcdodds.com/__meta | jq .
curl -s https://kentcdodds.com/healthcheck
```

Compare D1 counts to final Fly snapshot:

```bash
sqlite3 final-snapshot.db "SELECT 'PostRead', COUNT(*) FROM PostRead;"
npm exec wrangler -- d1 execute kentcdodds-com-db --remote --command \
  "SELECT COUNT(*) AS c FROM PostRead;" --config services/site-worker/generated-wrangler.jsonc
```

---

## 8. Rollback plan

If critical failure after DNS flip:

1. **Re-point DNS** to Fly (restore previous A/AAAA/CNAME records or remove Workers custom domain and restore old records from backup).
2. Fly app `kcd` must still be running with the volume intact.
3. **Caveat:** any writes that landed on D1 during the failed window are **not** on Fly — lost if you roll back.
4. Investigate; fix forward before second attempt.

Keep Fly idle (not destroyed) until the confidence window ends.

---

## 9. Post-cutover cleanup (after confidence window)

- [ ] Scale down / **destroy Fly app `kcd`** and `data_machines` volume (irreversible — only after D1 verified).
- [ ] Delete staging preview resources when no longer needed (`kentcdodds-com-staging`, preview KV/R2).
- [ ] Restore DNS TTL to normal (e.g. 3600s).
- [ ] Delete temporary VM Cloudflare API token (`2ad2cb7de2ef6cb0208fe61d8e1f71f4`).
- [ ] Remove local snapshot files (contain PII).

---

## Script reference

| Script | Purpose |
|--------|---------|
| `npm run migrate:sqlite-to-d1 --workspace site-worker` | Full or incremental (`--since`) import |
| `npm run migrate:build-fixture --workspace site-worker` | Inflate local SQLite for perf testing |
| `npm run migrate:pipeline-test --workspace site-worker` | End-to-end test against scratch D1 |

### Key flags

| Flag | Description |
|------|-------------|
| `--source <path>` | Local SQLite file (Fly `.backup` download) |
| `--database <name>` | Wrangler D1 target (`APP_DB` binding name from config) |
| `--config <path>` | Wrangler JSONC with D1 binding |
| `--since <ISO-8601>` | Incremental backfill cutoff |
| `--verify` | Row counts + spot checks after import |
| `--tables <csv>` | Subset for resume |
| `--local` | Miniflare local D1 (dev only) |

---

## Performance expectations (measured on migration test fixture)

See pipeline test output in PR / agent report. Rough guide from inflated fixture (~50k `PostRead`, ~500 users):

- Full import: order of **minutes** for ~50k rows dominated by `PostRead`.
- Extrapolate **~X rows/sec** from pipeline test; production `PostRead` row count dominates total time.
- Chunking defaults: 500 rows/INSERT, 50 statements/file, `PRAGMA defer_foreign_keys` per file.

---

## Limitations / accepted losses

| Scenario | Handling |
|----------|----------|
| Writes during DNS propagation (before backfill) | Recovered by `--since` backfill if still in SQLite source |
| Deletes during cutover window | **Not replicated** — accepted |
| Fly receives writes after snapshot, before DNS flip | Include in backfill if captured in a newer snapshot or same DB file |
| Rollback to Fly after D1 writes | D1-only writes **lost** |
| Cache DB (`cache.db`) | **Not migrated** — ephemeral; rebuilds on traffic |
| `_prisma_migrations` | **Not migrated** — D1 uses Wrangler migration table separately |
