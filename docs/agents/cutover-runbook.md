# Production cutover runbook: Fly SQLite → Cloudflare Workers + D1

Ordered procedure for hard cutover of **kentcdodds.com** from the Fly.io app (`kcd`) to the Cloudflare Workers stack (`kentcdodds-com` worker + D1 `kentcdodds-com-db`).

**Migration scripts:** archived after the 2026-07-08 cutover once D1 was fully reconciled.

**Accepted data-loss window:** a few minutes of writes during DNS propagation and the backfill gap. Deletions on Fly during the window are **not** replicated (accepted). Writes to D1 during a failed cutover that rolls back to Fly are **lost on rollback** (symmetric caveat).

---

## 0. Pre-cutover checklist (T−24h … T−1h)

### Optional pre-merge de-risk

- [ ] The production deploy path in CI (`deploy-site.yml` with
      `deploy_target=production`: bulk secrets, D1 migrations, deploy, smoke
      checks) has only been exercised manually from a VM. To validate it
      before the merge-triggered run, dispatch **🚀 Deploy Site** from the PR
      branch in the Actions tab with `should_deploy=true`,
      `deploy_target=production`. Idempotent: it deploys the same worker the
      branch has already been deploying.
- [ ] Pre-create the write-freeze WAF rule from section 2 in a disabled
      state, so T−0 is a single toggle.
- [ ] Configure the zone rate-limiting rules from section 6.5 ahead of time —
      the zone already proxies Fly, so they protect the current site too
      (use generous thresholds until worker traffic patterns are known).

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

Rotating `OG_IMAGE_SECRET` later: signed og-image URLs are cached by social
scrapers with a 1-year immutable cache-control, so a bare rotation would 404
every previously shared link. Move the old value into the optional
comma-separated `OG_IMAGE_PREVIOUS_SECRETS` secret (verification-only) when
setting a new `OG_IMAGE_SECRET`, and drop it after the old links have aged
out.

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

3. **Deliverability** — New Email Sending accounts start with conservative
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

## 2. T−0: write freeze (recommended)

A short write freeze turns the cutover into a zero-data-loss operation: no
backfill window, no lost form submissions. Because kentcdodds.com is already
proxied through the Cloudflare zone, this needs **no code on Fly**:

1. **Pre-created 2026-07-08 (disabled)**: rule
   `e0e8dad5be9f4860bcacfc966e0d5365` in the zone's custom-rules ruleset
   (`d50deae8d062403384dac8daa3737db0`), description "Cutover write freeze".
   Enable it at T−0 from Security → WAF → Custom rules (or via the rulesets
   API). Expression:
   `(http.host eq "kentcdodds.com" and not http.request.method in {"GET" "HEAD" "OPTIONS"} and not http.request.uri.path eq "/healthcheck")`
   Action is plain **Block** (the plan doesn't allow custom block responses,
   so writes get Cloudflare's 403 block page during the freeze — acceptable
   for the ~10 minute window).
2. Verify: `curl -X POST https://kentcdodds.com/login -o /dev/null -w '%{http_code}'` → 403 (block), while GET pages still serve.
3. Take the final snapshot + run the `--reset` import (section 3).
4. Flip DNS (section 4), then **disable the rule**. Total write outage is the
   freeze duration (~5–10 min). Section 6's backfill becomes a safety check
   rather than a required step.

Notes: reads keep serving from Fly the whole time; external callbacks that
POST during the freeze (audio worker queue retries) are retried or would have
been lost-writes anyway. Post site banner / tweet if desired.

Fallback (no freeze): proceed with snapshot + DNS flip and run section 6's
backfill for the gap; accepts losing in-flight writes between the final
backfill snapshot and the flip.

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

Historical note: the Fly SQLite to D1 importer was archived after the
2026-07-08 cutover once all 11 app tables were reconciled and no further
backfill was needed.

The archived importer's **`--reset` wiped all rows from the app tables first**
(child-first, FK-safe) so seeded/test data — including the seeded admin with a
known password — did not survive into production. With `--reset`, `--verify`'s
count comparison was an exact-equality proof. The importer refused to combine
`--reset` with `--since`.

**Idempotence:** the importer used `INSERT … ON CONFLICT … DO UPDATE` (not
`INSERT OR REPLACE`) so parent-row updates did not CASCADE-delete children.
Re-runs converged safely.

**Resumability:** the archived importer supported retrying one table and
adding per-table filters during the completed migration.

The `--verify` output included per-table counts, `max(createdAt)`, and five
random users (emails shown as `sha256:…` truncated hashes).

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

**Historical path:** while Fly was still running, the migration tooling could
backfill rows from a second `.backup` using the cutover `SNAPSHOT_TIME`. This
path is no longer available in the repo because production D1 has been fully
reconciled.

`--since` behavior:

- Tables **with** `updatedAt` (`User`, `Password`, `Passkey`, `Call`, `CallKentEpisodeDraft`, `CallKentCallerEpisode`, `Favorite`, `HomeworkCompletion`):  
  `createdAt > since OR updatedAt > since`
- Other tables (`Session`, `Verification`, `PostRead`): `createdAt > since` only.
- Upserts use `ON CONFLICT DO UPDATE` (not `REPLACE`) to avoid CASCADE deletes on parent tables.
- **Deletions** on Fly during the window are **not** propagated (accepted loss).

---

## 6.5 Zone rate-limiting rules (T+0 … T+24h)

App-level rate limits are per-isolate memory only (effective limit scales
with isolate count) and parent-served routes (`/media/*`,
`/resources/og-image`) have only blunt per-isolate caps. Once traffic flows
through the zone, configure shared protection in the Cloudflare dashboard
(Security → WAF → Rate limiting rules):

- [ ] Auth endpoints (`/login`, `/signup`, `/forgot-password`,
      `/reset-password`, `/resources/webauthn*`): ~10 req/min per IP.
- [ ] Search + markdown negotiation (`/search`, `Accept: text/markdown`
      heavy agents): ~60 req/min per IP.
- [ ] `/media/*` and `/resources/og-image`: generous per-IP cap (these
      consume Images transformations + R2 reads per request; watch spend in
      the first week).
- [ ] Confirm Bot Fight Mode / Super Bot Fight Mode setting matches what the
      Fly-era zone used.

## 7. Final verification

```bash
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

## Archived script reference

The Fly SQLite to D1 importer, local fixture builder, and scratch-D1 pipeline
test were removed after the successful production cutover and final
reconciliation. Reconstruct the tooling from git history only if a future audit
requires it; do not run destructive reset imports against production D1.

---

## Performance expectations

Migration import time scaled with row count; `PostRead` dominated the completed
cutover import.

## D1 read replication

Enable read replication on staging and production D1 before cutover — see
[cloudflare-worker-architecture.md § D1 read replication](./cloudflare-worker-architecture.md#d1-read-replication)
for `curl` commands and verification.

Pre-cutover checklist:

- [ ] Staging and production D1 have `read_replication.mode: auto` enabled.

## Limitations / accepted losses

| Scenario                                            | Handling                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------- |
| Writes during DNS propagation (before backfill)     | Recovered by `--since` backfill if still in SQLite source           |
| Deletes during cutover window                       | **Not replicated** — accepted                                       |
| Fly receives writes after snapshot, before DNS flip | Include in backfill if captured in a newer snapshot or same DB file |
| Rollback to Fly after D1 writes                     | D1-only writes **lost**                                             |
| Cache DB (`SITE_CACHE_KV`)                          | **Not migrated** — ephemeral; rebuilds on traffic                   |
| `_prisma_migrations`                                | **Not migrated** — D1 uses Wrangler migration table separately      |
