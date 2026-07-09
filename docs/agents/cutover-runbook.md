# Post-cutover runbook: Fly SQLite to Cloudflare Workers + D1

This document is now a post-cutover reference for kentcdodds.com. The original
Fly to D1 migration and DNS flip completed on 2026-07-08, and the one-off
SQLite importer has been archived from the repository.

## Current production state

- Live app: Cloudflare Worker `kentcdodds-com`
- Account: `a41d50ecaf0ae0f86dd1824ef6729cb2`
- Zone: `kentcdodds.com` (`1579e53e9728df7df20518f403fca1d4`)
- Production D1: `kentcdodds-com-db`
  (`af33bd8b-c9b2-484a-afa5-43ee322ff49c`)
- Production KV:
  - `SITE_CACHE_KV`: `9430f933f2ff4bc5881385851869b02e`
  - `CONTENT_KV`: `e9ec6e92d8034f3db76343162f2b3a26`
- Production R2 artifacts bucket: `kentcdodds-com-artifacts`
- Media bucket: `kentcdodds-com`
- Fly rollback app: `kcd`
- Fly rollback SQLite path: `/data/litefs-disabled/sqlite.db`

## Completed migration facts

- The production custom domains (`kentcdodds.com` and `www.kentcdodds.com`)
  serve through the Cloudflare Worker.
- Data migration is complete: all 11 app tables were reconciled against the
  live Fly SQLite database after the initial cutover. No routine backfill is
  needed.
- The archived SQLite importer used full reset imports and incremental
  backfills during cutover. Do not recreate or run reset imports against
  production D1 unless explicitly performing a disaster-recovery procedure.
- The disabled "Cutover write freeze" WAF rule was removed after cutover.
- Zone rate limiting is constrained by the current Cloudflare plan to one
  `http_ratelimit` rule. The active rule is path-scoped to sensitive endpoints
  rather than broad page browsing.

## Hard guardrails

- Do not destroy the Fly app or volume until Kent explicitly confirms the
  rollback window is closed and final D1-vs-Fly verification has been rerun.
- Do not delete production D1, KV, R2, or Worker resources.
- Do not run destructive D1 imports or table resets against production.
- Ask Kent before each irreversible infrastructure action.

## Live verification helpers

```bash
curl -sI https://kentcdodds.com/healthcheck
curl -s https://kentcdodds.com/__meta | jq .
```

Expected:

- `GET /healthcheck` returns `200`.
- `GET /__meta` returns the currently deployed `buildSha` and
  `contentVersion`.
- Response headers identify Cloudflare, not Fly/Express.

## Final D1-vs-Fly verification before decommission

Before destroying Fly, rerun a final reconciliation against the live Fly DB:

1. Read from Fly machine `080750ec6d0098` in region `dfw`.
2. Query `/data/litefs-disabled/sqlite.db`.
3. Compare all 11 app tables to production D1.
4. Use id-level diffs where table IDs are stable.
5. Note that `Password` keys on `userId`, not `id`.
6. For high-volume `PostRead`, day-bucket reconciliation is acceptable if
   direct full-row diff is too expensive.

Fly Machines API access pattern via Kody:

```txt
POST https://api.machines.dev/v1/apps/kcd/machines/080750ec6d0098/exec
Authorization: Bearer {{secret:flyApiToken|scope=user}}
body: {"command":["sqlite3","/data/litefs-disabled/sqlite.db","<query>"],"timeout":40}
```

D1 query endpoint:

```txt
POST /client/v4/accounts/a41d50ecaf0ae0f86dd1824ef6729cb2/d1/database/af33bd8b-c9b2-484a-afa5-43ee322ff49c/query
```

Use Kody's `@kentcdodds/cloudflare-toolkit/api-v4` helper for Cloudflare API
work.

## Rollback reminder

Rollback remains possible only while the Fly app and `data_machines` volume are
intact.

If a critical production issue requires rollback:

1. Re-point the Cloudflare custom domains / DNS origin back to Fly.
2. Keep in mind that writes accepted by D1 after cutover are not present in Fly.
3. Prefer fixing forward unless the incident requires immediate rollback.

## Remaining post-cutover cleanup

### Staging / abandoned Cloudflare resources

The CI preview workflow has been removed, but the historical staging resource
IDs remain useful until the resources are actually deleted:

- Worker: `kentcdodds-com-staging`
- D1: `kentcdodds-com-staging-app-db`
  (`01a8ba77-2a63-4a14-898d-6023942a480f`)
- KV:
  - `SITE_CACHE_KV`: `5180bc7fb5b14a5888db2ed8ac0e21ee`
  - `CONTENT_KV`: `976edaf098ed4c3391385bf7550ba5a6`
- R2: `kcd-site-cf-preview-artifacts`

Ask Kent before deleting any of these resources.

### Fly decommission

After Kent confirms the rollback window is closed and final D1 verification
passes:

1. Destroy Fly app `kcd` and its `data_machines` volume.
2. Remove the Fly ACME DNS record.
3. Revoke the temporary Cloudflare API token recorded in the private cutover
   cleanup notes.
4. Ask Kent to delete any local Fly snapshot files because they may contain PII.

## Archived tooling

- Fly SQLite to D1 importer, fixture builder, scratch-D1 pipeline harness, and
  dedicated tests were removed after final reconciliation.
- The standalone Cloudflare preview deploy workflow was removed after the
  production Worker cutover.
- Recover archived tooling from git history only for audit or disaster recovery.
