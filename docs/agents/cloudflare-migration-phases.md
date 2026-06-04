# Cloudflare migration phases

This is a documentation-only planning outline for moving `services/site` from
the current Fly-hosted React Router app to Cloudflare. Production is currently a
single Fly machine using direct SQLite on the attached volume; LiteFS is bypassed
for the active production shape.

Open PR [#704](https://github.com/kentcdodds/kentcdodds.com/pull/704) is useful
as a historical spike only. Treat it as prior exploration of possible Cloudflare
changes, not as a production-ready migration plan or an implementation source to
merge wholesale.

## Phase 1: Worker-shaped app on Fly

Goal: make the site more Worker-compatible while still running on Fly and the
existing SQLite volume.

- Keep production traffic, secrets, and data on Fly.
- Preserve the current direct-SQLite production path.
- Isolate Node-only assumptions behind narrow adapters where practical.
- Prefer request/response, storage, queue, and cache boundaries that can be
  mapped to Cloudflare bindings later.
- Keep deployment rollback simple: the runtime still ships through the existing
  Fly path.

Exit criteria:

- The Fly app exercises the Worker-shaped boundaries in normal runtime paths.
- Local and CI checks cover the adapted boundaries.
- Remaining Cloudflare-only gaps are listed explicitly before staging work.

## Phase 2: Staging Worker

Goal: run a non-production Cloudflare Worker staging environment that mirrors the
site shape without taking production traffic.

- Deploy a staging Worker with non-production bindings.
- Load representative D1 data from a sanitized or disposable source.
- Wire staging-only R2, Queues, KV, cache, and any other bindings needed by the
  adapted runtime.
- Compare staging Worker behavior against Fly for auth, content, Call Kent,
  search, cache, and admin paths.
- Keep production Fly secrets and traffic untouched.

Exit criteria:

- Staging Worker can run the important user and admin workflows.
- D1 behavior is understood for every write path, including Prisma transaction
  replacements.
- Observability, rollback notes, and data migration commands are documented.

## Phase 3: D1 cutover

Goal: move production traffic to Cloudflare only after staging proves the runtime
and data paths.

- Prepare a production D1 migration plan with a write-freeze or replay strategy.
- Back up the Fly SQLite volume immediately before migration.
- Migrate data into D1 and verify row counts plus key user-facing workflows.
- Cut traffic to the Worker with a documented rollback path back to Fly.
- Monitor auth, writes, queues, cache behavior, and external integrations after
  cutover.

Exit criteria:

- Production traffic is served by the Cloudflare Worker.
- D1 is the production system of record.
- Fly rollback and final decommission steps are documented separately.
