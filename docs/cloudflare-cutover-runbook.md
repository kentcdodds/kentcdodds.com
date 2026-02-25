# Cloudflare cutover runbook

This runbook documents the production cutover sequence from Fly.io to
Cloudflare Workers.

## Preconditions

- `validate.yml` is green on the release SHA.
- `deploy.yml` sha-guard confirms the release SHA is the current `main` HEAD.
- Preview environment smoke checks pass for:
  - auth/session/login/password reset
  - blog/content rendering
  - call-kent routes and draft status route behavior
  - MCP `/mcp` authenticated requests.

## Data migration checklist

1. **Export source data** from the current production SQLite/LiteFS state.
2. **Import into D1 target** (or run migration bootstraps for net-new env).
3. **Row-count parity check** for critical tables (`User`, `Session`, `PostRead`,
   call-kent draft/episode tables).
4. **Sample query parity check** for:
   - recent sessions
   - admin user role assignments
   - published call-kent episodes.

## Cutover sequence

1. Enable temporary **write freeze window** on Fly production app.
2. Run final source export/import + parity checks.
3. Deploy Cloudflare production worker via `deploy.yml`.
4. Run post-deploy healthcheck (`/health`) and targeted endpoint smoke checks.
5. Lift write freeze after read/write smoke checks pass.

## Cloudflare control-plane checklist

Apply/verify the following before traffic cutover:

- **Rate limiting rules**:
  - enforce limits for sensitive endpoints (including
    `/resources/calls/text-to-speech`) at Cloudflare edge.
- **Cron triggers**:
  - verify scheduled cleanup trigger (`expired sessions/verifications`) is active.
- **Queue retry / DLQ policy**:
  - verify max retries and DLQ destination for call-kent background jobs.
- **Cache controls**:
  - verify HTML/cache rules and `SITE_CACHE_KV` binding configuration by env.
- **Durable Object bindings**:
  - verify `MCP_OBJECT` binding + migrations are present in each deployed env.
- **Heap diagnostics policy**:
  - the legacy `/resources/heapsnapshot` endpoint is intentionally removed for
    Worker runtime; use Cloudflare observability tooling + queue/container logs
    for runtime diagnostics.

## Rollback plan

If post-cutover smoke checks fail:

1. Re-enable Fly traffic routing.
2. Disable Cloudflare write paths (or maintenance mode) to prevent divergence.
3. Capture incident timestamp and failed endpoint list.
4. Investigate/fix in preview, then re-run cutover sequence.

## Post-cutover validation window

For the first 24 hours:

- monitor auth failures, 5xx rates, and latency percentiles.
- validate cron cleanup execution and queue consumer success/failure metrics.
- verify content refresh + semantic indexing jobs complete without regressions.
