# Production cutover runbook: Fly SQLite → Cloudflare Workers + D1

Ordered procedure for hard cutover of **kentcdodds.com** from the Fly.io app (`kcd`) to the Cloudflare Workers stack (`kentcdodds-com` worker + D1 `kentcdodds-com-db`).

**Migration scripts:** `services/site-worker/scripts/migrate-sqlite-to-d1.mjs` (full import + `--since` backfill).

**Accepted data-loss window:** a few minutes of writes during DNS propagation and the backfill gap. Deletions on Fly during the window are **not** replicated (accepted). Writes to D1 during a failed cutover that rolls back to Fly are **lost on rollback** (symmetric caveat).

---

## 0. Pre-cutover checklist (T−24h … T−1h)

### Infrastructure

- [ ] Production worker deployed and healthy (`kentcdodds-com` on `*.kentcdodds.workers.dev`).
- [ ] D1 `kentcdodds-com-db` (`af33bd8b-c9b2-484a-afa5-43ee322ff49c`) has all SQL migrations applied (CI applies them on every deploy; manual command:)
  ```bash
  npm run d1:migrations:apply:production --workspace site-worker
  ```
  (Uses `generated-wrangler.jsonc` pointed at production bindings.)
- [ ] MDX artifacts published to production R2/KV; `GET /__meta` shows expected `buildSha` + `contentVersion`.
- [ ] Smoke test on workers.dev URL (login, blog, mark-as-read, favorites).

### Secrets

The deploy pipeline provides infra secrets (R2 keys, AI gateway, search worker,
Transistor/Simplecast, podcast IDs, `REFRESH_CACHE_SECRET`) from GitHub Actions
secrets on every deploy. The **integration secrets** below (including
`CALL_KENT_AUDIO_PROCESSOR_CALLBACK_SECRET`, which must match the value set on
`kcd-call-kent-audio-worker`) are ALWAYS omitted from the production bulk
upload — even when a CI env copy exists — so `wrangler secret bulk` never
clobbers them. They must be set directly on the worker **once**, copied from
Fly. `SESSION_SECRET` must match Fly exactly or all sessions/magic-links die at
the flip. The generator also hard-fails a production run if any derive-group
secret is missing from the CI env, so a deleted GitHub secret cannot silently
overwrite a real value with a placeholder.

- [ ] Create a Cloudflare API token with the single permission
      **Account → Workers Scripts → Edit** (dash → My Profile → API Tokens →
      Create Custom Token).
- [ ] From a Fly SSH session (`fly ssh console -a kcd`), where all the values
      are already in the environment, run:

  ```bash
  CF_TOKEN=<paste-token> node -e '
  const account = "a41d50ecaf0ae0f86dd1824ef6729cb2"
  const script = "kentcdodds-com"
  const names = [
    // Auth/session parity — SESSION_SECRET must match Fly exactly.
    "SESSION_SECRET", "CF_INTERNAL_SECRET",
    // Discord integration
    "DISCORD_ADMIN_USER_ID", "DISCORD_BLUE_CHANNEL", "DISCORD_BLUE_ROLE",
    "DISCORD_BOT_TOKEN", "DISCORD_CALL_KENT_CHANNEL", "DISCORD_CLIENT_ID",
    "DISCORD_CLIENT_SECRET", "DISCORD_GUILD_ID", "DISCORD_LEADERBOARD_CHANNEL",
    "DISCORD_MEMBER_ROLE", "DISCORD_PRIVATE_BOT_CHANNEL", "DISCORD_RED_CHANNEL",
    "DISCORD_RED_ROLE", "DISCORD_YELLOW_CHANNEL", "DISCORD_YELLOW_ROLE",
    // Other integrations
    "KIT_API_KEY", "KIT_API_SECRET",
    "TWITTER_BEARER_TOKEN", "VERIFIER_API_KEY",
    // Config values CI does not know (currently derived placeholders on the
    // worker): R2 bucket names + FFmpeg offload queue id.
    "R2_BUCKET", "CALL_KENT_R2_BUCKET", "CALL_KENT_AUDIO_CF_QUEUE_ID",
    // Must match kcd-call-kent-audio-worker's copy (Fly's value is the
    // canonical one; the GitHub copy may have drifted).
    "CALL_KENT_AUDIO_PROCESSOR_CALLBACK_SECRET",
    // Optional observability (skip warnings are fine if unset on Fly)
    "SENTRY_DSN", "SENTRY_PROJECT_ID",
  ]
  const values = Object.fromEntries(names.map((n) => [n, process.env[n]]))
  // NOT copied from Fly: OG_IMAGE_SECRET (already set, random),
  // MAILGUN_* (retired), MAGIC_LINK_SECRET / INTERNAL_COMMAND_TOKEN (dead in
  // the worker codebase). Email sends reuse CLOUDFLARE_API_TOKEN (see the
  // Email section).
  ;(async () => {
    for (const [name, text] of Object.entries(values)) {
      if (!text) { console.error("MISSING: " + name); continue }
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${script}/secrets`,
        {
          method: "PUT",
          headers: {
            authorization: `Bearer ${process.env.CF_TOKEN}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ name, text, type: "secret_text" }),
        },
      )
      const json = await res.json()
      console.log(name, json.success ? "ok" : JSON.stringify(json.errors))
    }
  })()'
  ```

- [ ] Every line prints `ok` (any `MISSING:` line means that var is not in the
      Fly env under that name — copy it manually).
- [ ] Revoke the token afterwards.
- [ ] Verify: the next production deploy prints the omitted-keys notice (that
      is expected) and `wrangler secret list` on `kentcdodds-com` shows all the
      names above.

Notes (2026-07-05): `OG_IMAGE_SECRET` is already set on `kentcdodds-com` (a
random value; the one-liner regenerates it, which is fine — signed OG URLs are
minted per-render). **The full app env schema is validated on every dynamic
request** — a missing required secret 500s the entire site, so after any
schema change to `env.server.ts`, cross-check `wrangler secret list` against
the required keys before/after deploying.

### Email (Cloudflare Email Service)

Transactional email (signup verification, password reset, contact form, call
notifications) uses the [Cloudflare Email Sending REST API](https://developers.cloudflare.com/email-service/api/send-emails/rest-api/).
The app authenticates with the shared `CLOUDFLARE_API_TOKEN`, which carries
**Email Sending: Edit** alongside its other permissions (decision 2026-07-05:
one token instead of a dedicated email token; the trade-off is a broader blast
radius if that token ever leaks — it can send email as the domain).

1. **Onboard the domain** — Cloudflare dash → **Compute** → **Email Service** →
   **Email Sending** → **Onboard Domain** → `kentcdodds.com`. This adds
   SPF/DKIM/DMARC records on the `cf-bounce` subdomain. On Cloudflare DNS the
   records usually propagate within minutes. Until this is done, sends to
   arbitrary recipients fail; sends to verified destination addresses work.
2. **Token permission** — `CLOUDFLARE_API_TOKEN` must include
   **Email Sending: Edit**. CI re-uploads the GitHub `CLOUDFLARE_API_TOKEN`
   secret to the worker on every production deploy, so the GitHub secret and
   the dashboard token must stay in sync.

   **Verified 2026-07-06:** the production worker holds the GitHub-secret
   token value (synced from staging on 2026-07-06; CI keeps it in sync on
   every deploy). That token probes 200 for queues, vectorize, Workers AI,
   and D1, and a real signup-verification email sent successfully from the
   production worker (`Verification code sent to me@kentcdodds.com`, row
   persisted, delivery confirmed). Fly's separate token is no longer used
   anywhere on the worker.
4. **Deliverability** — New Email Sending accounts start with conservative
   daily quotas that ramp with reputation. Volume here is low (auth codes,
   contact form, call notifications), so expect at most a brief warm-up period.
   Monitor via dash **Email Sending** analytics and bounce notifications.

### DNS

- [ ] `kentcdodds.com` zone is on Cloudflare (zone id
      `1579e53e9728df7df20518f403fca1d4`) — required for Workers custom
      domains.
- [ ] **No TTL lowering is needed.** Verified 2026-07-04: the apex A/AAAA
      records pointing at Fly are **proxied** (orange-cloud, TTL Auto), so
      public DNS resolves to Cloudflare edge IPs that don't change at
      cutover. Attaching the Workers custom domain swaps the origin at the
      Cloudflare edge and takes effect globally in seconds — there is no
      client-side propagation window. (Tracking issue with the post-cutover
      DNS checklist: kentcdodds.com#814.)

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
  "migrations_dir": "../site/migrations"
}]
```

Ensure migrations are applied **before** data import (empty tables).

```bash
export CLOUDFLARE_API_TOKEN=…   # privileged; never commit
export CLOUDFLARE_ACCOUNT_ID=a41d50ecaf0ae0f86dd1824ef6729cb2

cd services/site-worker

npm run migrate:sqlite-to-d1 -- \
  --source /path/to/migrate-snapshot-*.db \
  --database APP_DB \
  --config ./generated-wrangler.jsonc \
  --reset \
  --verify
```

**`--reset` wipes all rows from the app tables first** (child-first, FK-safe)
so seeded/test data — including the seeded admin with a known password — does
not survive into production. With `--reset`, `--verify`'s count comparison is
an exact-equality proof. Never combine with `--since` (the script refuses).

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
- Fly traffic should stop almost immediately: the apex records are proxied,
  so the custom-domain attach switches the origin at the Cloudflare edge
  within seconds. Any residual Fly requests come from direct-IP clients or
  in-flight requests, not DNS caches.
- Spot-check: login, session cookie, mark-as-read, webauthn (if applicable).

---

## 6. Incremental backfill (writes during cutover window)

The edge flip is near-instant, so the backfill window is small: it covers
writes that landed on Fly between `SNAPSHOT_TIME` and the custom-domain
attach (plus any in-flight requests). Wait ~5 minutes after the flip for Fly
traffic to hit zero, then copy rows created/updated on Fly **after**
`SNAPSHOT_TIME`.

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

- [ ] **Before cancelling the Cloudinary account** (irreversible asset loss
      otherwise): confirm original masters are archived in R2. The
      `--normalize-oversized` migration mode overwrote some R2 masters in
      place with re-encoded versions, so the pre-normalization originals only
      existed on Cloudinary. Archived on 2026-07-07: all 15 masters whose
      bytes differ from the Cloudinary original now live under `originals/`
      in the `kentcdodds-com` bucket (verified by size comparison across all
      670 masters). To re-verify or catch new drift:
  ```bash
  node scripts/migrate-cloudinary-to-r2.mjs --archive-originals --dry-run   # report only
  node scripts/migrate-cloudinary-to-r2.mjs --archive-originals             # archive
  ```
- [ ] Scale down / **destroy Fly app `kcd`** and `data_machines` volume (irreversible — only after D1 verified).
- [ ] Delete staging preview resources when no longer needed (`kentcdodds-com-staging`, preview KV/R2).
- [ ] Re-check zone DNS records per issue kentcdodds.com#814 (proxied records stay TTL Auto; remove the Fly ACME record once Fly is decommissioned).
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

## Performance expectations

Migration import time scales with row count; `PostRead` dominates. Use
`npm run migrate:pipeline-test --workspace site-worker` against an inflated
fixture for a local timing baseline.

## D1 read replication

Enable read replication on staging and production D1 before cutover — see
[cloudflare-worker-architecture.md § D1 read replication](./cloudflare-worker-architecture.md#d1-read-replication)
for `curl` commands and verification.

Pre-cutover checklist:

- [ ] Staging and production D1 have `read_replication.mode: auto` enabled.

## Limitations / accepted losses

| Scenario | Handling |
|----------|----------|
| Writes during DNS propagation (before backfill) | Recovered by `--since` backfill if still in SQLite source |
| Deletes during cutover window | **Not replicated** — accepted |
| Fly receives writes after snapshot, before DNS flip | Include in backfill if captured in a newer snapshot or same DB file |
| Rollback to Fly after D1 writes | D1-only writes **lost** |
| Cache DB (`SITE_CACHE_KV`) | **Not migrated** — ephemeral; rebuilds on traffic |
| `_prisma_migrations` | **Not migrated** — D1 uses Wrangler migration table separately |
