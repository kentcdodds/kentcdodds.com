# Post-cutover cleanup playbook

Self-contained handoff for a future agent that will decommission the Fly-era
infrastructure and migration scaffolding **after** the Fly → Cloudflare
Workers cutover (PR #813). Everything needed to execute is here; you should
not have to re-derive state.

> **Do not start any task in this playbook until Kent explicitly says the
> confidence window is over.** The site is live on Workers and healthy, but
> Fly is intentionally still running as the rollback target. Every task below
> is grouped by the precondition that must hold before it is safe.

## Cutover status (verified 2026-07-08)

- **Live**: `kentcdodds.com` + `www.kentcdodds.com` serve from the
  `kentcdodds-com` Worker (proxied AAAA to Cloudflare anycast; the Fly A/AAAA
  and `www` CNAME were removed). Healthcheck, `/`, `/blog`, RSS, `/media`,
  OG images, security headers, CSP, and `www`/`blog` host redirects all
  verified. `__meta` buildSha = `0227bc33` (merged #813).
- **Data migration COMPLETE and verified**: all 11 app tables reconciled
  against the live Fly SQLite DB. Zero Fly rows missing from D1 (id-level
  diff for 10 tables; full day-bucket reconciliation for `PostRead` across
  1,459 days). The 6,000-row `PostRead` gap from the initial import was
  backfilled via `INSERT OR IGNORE`. The only D1-vs-Fly differences are
  net-new production writes since the snapshot (expected — the worker is
  taking traffic; Fly is not). **No further data backfill is needed.**
- **Fly app `kcd`** (machine `080750ec6d0098`, region `dfw`) is still running
  as rollback. LiteFS is disabled; the live DB is at
  `/data/litefs-disabled/sqlite.db`.

## Key resource identifiers

- Cloudflare account: `a41d50ecaf0ae0f86dd1824ef6729cb2`
- Zone `kentcdodds.com`: `1579e53e9728df7df20518f403fca1d4`
- Production worker: `kentcdodds-com`
- Production D1: `kentcdodds-com-db` (`af33bd8b-c9b2-484a-afa5-43ee322ff49c`)
- Staging worker: `kentcdodds-com-staging`
- Staging D1: `kentcdodds-com-staging-app-db` (`01a8ba77-2a63-4a14-898d-6023942a480f`)
- Staging KV: `SITE_CACHE_KV`=`5180bc7fb5b14a5888db2ed8ac0e21ee`,
  `CONTENT_KV`=`976edaf098ed4c3391385bf7550ba5a6`
- Staging R2: `kcd-site-cf-preview-artifacts`
- Temporary VM Cloudflare API token to revoke: `2ad2cb7de2ef6cb0208fe61d8e1f71f4`
- Zone custom-rules ruleset: `d50deae8d062403384dac8daa3737db0` (contains the
  disabled "Cutover write freeze" rule `e0e8dad5be9f4860bcacfc966e0d5365` —
  delete it as part of cleanup; the freeze was not needed).

## Hard guardrails

- **Never** run `migrate-sqlite-to-d1.mjs --reset` again — it deletes app
  tables in D1 and would destroy post-cutover production writes.
- **Never** destroy the Fly app or its volume until Kent confirms the
  rollback window is closed AND a final D1 verification has been re-run.
- **Never** cancel the Cloudinary account until the `originals/` archive
  check passes (see task group C).
- Prefer reversible steps first. Destroying resources (Fly, D1, R2, KV) is
  irreversible — do those last and only with explicit go-ahead.

---

## Task groups (in recommended execution order)

### A. Repo/CI scaffolding removal — safe anytime after merge (issues #815, #817, #818)

Lowest risk (code-only, reviewable in a PR, no infra destroyed).

1. **Archive Fly→D1 migration tooling** (#817). Delete
   `services/site-worker/scripts/migrate-sqlite-to-d1.mjs`, its lib and
   tests, `migrate-pipeline-test.mjs`, and `migrate-build-fixture.mjs`. Keep
   the rollback/decommission sections of `docs/agents/cutover-runbook.md`
   until Fly is destroyed. (The `--since` backfill path is already moot — the
   backfill window has passed and data is fully reconciled.)
2. **Decommission staging CI plumbing** (#815, code side). Delete or fold
   `.github/workflows/cf-preview-deploy.yml` into `deploy-site.yml` via the
   `deploy_target` input; remove the `dev` → `site-staging` environment
   mapping in `other/compute-deploy-plan.ts`; drop the unused `dev` branch
   trigger from `deployment.yml`; remove the staging section from the
   architecture doc once the resources (group D) are gone.
3. **Consolidate mock fixtures** (#818, optional/larger). Extract shared
   response builders consumed by both the MSW tree (`services/site/mocks/*`)
   and the workerd outbound-mock layer
   (`services/site/app/utils/outbound-mock-*.server.ts`). Pure refactor;
   guard with the full test suite.

Each of these should be its own focused PR. Run `npm run typecheck`,
`npm run test:backend --workspace kentcdodds.com`, and
`npm test --workspace site-worker` before pushing.

### B. DNS hygiene — after Fly is decommissioned (issue #814)

Requires zone DNS write. Do the ACME removal only once Fly is gone (group E).

- [ ] Remove the Fly ACME record `_acme-challenge.kentcdodds.com` →
      `kentcdodds.com.xz2p1k.flydns.net`.
- [ ] Review the retired Mailgun record `email.mg.kentcdodds.com` →
      `mailgun.org` (email now uses Cloudflare Email Sending; confirm with
      Kent, then remove if unused).
- [ ] Re-confirm no A/AAAA records still point at Fly and proxied records
      remain TTL Auto. Leave unrelated CNAMEs (ConvertKit DKIM/SPF,
      HelpScout, Google, Fathom `sailfish`) as-is.

### C. Cloudinary — before cancelling the account (irreversible)

- [ ] Re-run the originals-archive verification (idempotent):
      `node services/site-worker/scripts/migrate-cloudinary-to-r2.mjs --archive-originals --dry-run`
      Confirm it reports nothing new to archive. (Archived 2026-07-07: all 15
      re-encoded masters have pre-normalization originals under `originals/`
      in the `kentcdodds-com` bucket, verified across all 670 masters.)
- [ ] Only then cancel Cloudinary. After cancellation, `/media/...` serves
      entirely from R2 — spot-check a few blog banners and the
      `building-an-awesome-image-loading-experience` post.

### D. Abandoned/staging Cloudflare resources — irreversible, needs go-ahead (issues #816, #815)

- [ ] Delete the ~16 `kentcdodds-com-pr-704*` workers and their D1/KV from
      the Feb 2026 spike, after confirming zero traffic. Audit for a stray
      `kcd-migration-test-db` D1. Close PR #704.
- [ ] Decommission staging: worker `kentcdodds-com-staging`, D1
      `kentcdodds-com-staging-app-db`, the two staging KV namespaces, and R2
      `kcd-site-cf-preview-artifacts` (only after group A#2 removes the
      workflow that deploys them).

### E. Fly decommission — last, irreversible, explicit go-ahead required

- [ ] Re-run a final D1-vs-Fly reconciliation (all 11 tables) to confirm no
      writes are stranded on Fly.
- [ ] Scale down / destroy Fly app `kcd` and its `data_machines` volume.
- [ ] Then do group B (ACME record removal) and revoke the temporary VM
      Cloudflare API token `2ad2cb7de2ef6cb0208fe61d8e1f71f4`.
- [ ] Delete any local Fly snapshot files (they contain PII).

### F. Ongoing production hardening (not destructive; can happen independently)

- [ ] Configure Cloudflare zone Rate Limiting rules for the sensitive tiers
      (auth endpoints, search/markdown, `/media` + `/resources/og-image`) —
      app-level limits are per-isolate only. See cutover-runbook §6.5.
- [ ] Delete the disabled "Cutover write freeze" WAF rule
      (`e0e8dad5be9f4860bcacfc966e0d5365`) — it was never needed.
- [ ] Add an uptime monitor on the apex if not already present.

---

## Verification helpers

Data reconciliation and Fly inspection were done through Kody's Cloudflare
API helper (`kody:@kentcdodds/cloudflare-toolkit/api-v4`) and the Fly
Machines API (`https://api.machines.dev/v1/apps/kcd/machines/080750ec6d0098/exec`
with the `flyApiToken` secret). A future Cloud Agent with a Cloudflare API
token (Workers/D1/R2/DNS scopes) and Fly access can reproduce every check.
Confirm the site is healthy before and after any destructive step:

```bash
curl -sI https://kentcdodds.com/healthcheck   # expect 200, no Fly/Express headers
curl -s  https://kentcdodds.com/__meta        # expect the current buildSha
```
