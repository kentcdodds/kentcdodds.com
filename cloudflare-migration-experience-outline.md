# cloudflare migration experience outline

## 0. framing and story angle

- **working title idea:** “from fly.io + litefs to cloudflare workers: what changed, what hurt, what paid off”
- **core narrative:** this was not just a platform swap; it was a simplification + operational-risk-reduction project with multiple mid-flight pivots.
- **through-line:** each user directive tightened the architecture toward “single-path, no dead weight, cloudflare-native.”

## 1. starting point (before migration)

- app stack and pain points:
  - fly.io regions + litefs coordination
  - operational overhead around leader/follower behavior
  - fragile/slower deployments
  - higher recovery complexity
- initial migration target:
  - workers for app runtime
  - d1 + kv for data/cache patterns
  - cloudflare containers for ffmpeg/background-heavy tasks

## 2. migration principles that shaped all decisions

- bun-first tooling and ci
- no msw (worker-based mocks only)
- “cut the fat” policy (no migration-era compatibility residue)
- use cloudflare-managed primitives where possible (queues, durable objects, cron/rules)
- explicit runnable checkpoints + repeated gate validation

## 3. major user directives and concrete implementation call-outs

### 3.1 bun-first + epicflare-inspired workflow

- **your ask:** move installs/scripts/ci to bun and model mock/deploy structure after epicflare.
- **implemented:**
  - bun-centric dev/test/ci paths
  - worker mock-server architecture with dashboard endpoints
  - preview resource orchestration and generated wrangler config flow

### 3.2 mdx remote architecture (worker-safe, no eval)

- **your ask:** worker-safe mdx remote system, content updates without app redeploy.
- **implemented:**
  - compile-time mdx remote artifacts
  - runtime renderer path for serialized mdx docs
  - strict validation/reporting commands for mdx compatibility

### 3.3 “no fallback option at all” for mdx runtime

- **your ask:** one mdx runtime code path only.
- **implemented:**
  - removed runtime fallback chain (github compile / r2 / base-url / local artifact fallback)
  - enforced `MDX_REMOTE_KV` as single source at runtime
  - updated routes/tests around kv-only expectations

### 3.4 local authoring sidecar (content changes visible immediately)

- **your ask:** local sidecar watcher that upserts changed mdx docs into local kv.
- **implemented:**
  - authenticated mdx sync ingestion route
  - watcher delta computation + upsert/delete posting
  - local runtime binding injection for node dev server
  - retry/stability hardening after initial binding mismatch was found in manual testing

### 3.5 ffmpeg handoff via binding (not secret url)

- **your ask:** consume call-kent ffmpeg via runtime binding, not base-url secret.
- **implemented:**
  - refactor to service-binding-based fetch flow
  - local binding adapter for dev parity
  - preview resource rewrite to preview mock ffmpeg worker binding target
  - removed old base-url secret dependency from preview/deploy flows

### 3.6 preview mdx cache strategy + pr isolation

- **your ask:** shared cache warm baseline from main, but pr-isolated cache mutation.
- **implemented:**
  - restore cache order: pr key -> main warm key
  - save pr-specific cache after compile
  - publish mdx artifacts into preview-specific `MDX_REMOTE_KV`
  - avoid preview runtime references to production mdx storage

### 3.7 cleanup on pr close (resources + caches)

- **your ask:** clean up caches when prs close, same spirit as preview resource cleanup.
- **implemented:**
  - workflow cleanup step to delete pr-scoped mdx cache entries
  - continued preview resource cleanup path for queue/kv/d1 generated resources

### 3.8 remove `.dockerignore`

- **your ask:** remove it.
- **implemented:** deleted from repo and verified clean build/gates afterward.

### 3.9 the image strategy pivots (big part of this story)

- **your asks over time (and why this is blog-worthy):**
  - first: colocate media with content in-repo for clarity and local mocking
  - then: reverse course when repo size became too heavy
  - then: move media handling away from “put images in r2” and use **cloudflare images** for images, **stream** for video
  - repeatedly: remove legacy/dead migration paths and keep only final architecture
- **implemented arc:**
  - content/media reorganization and reference rewrites
  - migration pipeline updates to upload media from repo/manifests
  - cloudinary off-ramp hardening
  - local media mock behavior updates to preserve offline/dev UX while matching cloudflare runtime behavior
  - final architecture convergence:
    - images via cloudflare images
    - videos via cloudflare stream
    - no image runtime delivery through r2
- **blog call-out:** this section is a good “real migration” chapter because requirements changed based on observed tradeoffs, not just up-front design.

### 3.10 images + avatars follow-up fixes

- **your ask:** stop fallback placeholders and restore gravatar->kody fallback behavior.
- **implemented:**
  - media mock now prefers direct cloudflare images delivery for uuid-style image ids
  - improved fallback behavior when proxy base is unavailable
  - security mock now returns 200 for known gravatar hashes and 404 for unknown hashes
  - user avatar fallback now deterministic to kody team color when gravatar absent

## 4. mock ecosystem evolution (dev + test confidence)

- replaced interception-style mocks with worker mock services
- expanded mock dashboards for debugging (mailgun especially)
- added/updated contract tests per mock service
- validated route/media/avatar behavior manually and through backend suites

## 5. ci/cd and preview readiness arc

- preview resource ensure/cleanup tooling matured for:
  - d1
  - site cache kv
  - mdx remote kv
  - calls draft queue
  - ffmpeg service binding rewrites
- added mdx compile/publish stages to preview/deploy/refresh flows
- repeated dry-run deploys to verify generated config + binding surface

## 6. validation story (evidence for “runnable” claim)

- repeated full gates:
  - lint
  - typecheck
  - backend tests
  - build
- preview dry-run deployment checks
- manual walkthrough recordings + screenshots covering:
  - public routes
  - auth/reset path
  - admin surfaces
  - calls/admin/record flow entry points
  - mock dashboards
  - avatar endpoints

## 7. key “we learned this the hard way” call-outs for the blog

- local runtime binding state can fail silently across module boundaries without explicit global coordination.
- media proxy “works” can still be visually wrong; direct-delivery preference can dramatically improve local fidelity.
- strict single-path architecture reduces ambiguity and shortens debugging loops.
- pr preview isolation for content artifacts is worth the upfront workflow complexity.

## 8. potential blog post structure (chapter outline)

1. why we left fly.io/litefs
2. defining strict migration rules before coding
3. the architecture pivots we made mid-migration
4. the media saga: repo media, rollback, images/stream split, and why
5. building a cloudflare-native local dev experience
6. making previews trustworthy (resource + cache isolation)
7. debugging visual regressions (images/avatars)
8. what made us confident enough to mark the pr ready
9. what we’d do differently next time

## 9. optional appendix notes to expand later

- commit milestones by theme (mdx runtime, sidecar sync, ffmpeg binding, preview cache lifecycle, media strategy pivots, media/avatar fixes)
- checklist template for future large migrations
- “quality bar before ready-for-review” rubric used in this project
