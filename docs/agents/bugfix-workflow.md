# Bugfix workflow

When fixing a bug, prioritize proving the bug exists and that the fix actually
fixes it.

## Principles

- Reproduce the bug first.
- Prefer an automated reproduction (a test) when practical.
- If a test isn't practical, write down a reliable manual repro and validate it
  before and after the fix.
- When you can, add/keep a regression test so the bug can't silently return.
- Prefer the lowest-level regression test that proves the bug. Reach for e2e
  only when the bug depends on a full user journey or is hard to reproduce
  faithfully below that level.

## Sentry triage

- Reproduce locally before fixing.
- If you cannot reproduce, do not filter by default; confirm external/injected
  evidence first (payload signatures, third-party logs, release/rollout
  correlation, or Sentry metadata pointing to non-app sources).
- If evidence points to app code, file or fix the bug; if it points to
  external/injected noise, open a PR to filter it instead of adding defensive
  code.
- Client SDK filters live in `services/site/app/utils/sentry-noise.ts` (wired
  from `monitoring.client.tsx`): prefer narrow `ignoreErrors` / `denyUrls` /
  `beforeSend` signatures. Do not broadly filter `Failed to fetch` / network
  errors — those can hide real outages. Message/stack drop rules must establish
  an external source (distinctive third-party signature, extension/IAB URL, or
  provider error code such as EIP-1193 `4001`) — never a generic phrase alone.
- Client `RouteErrorResponse: 502/503/524 Route Error` (from
  `useCapturedRouteError` / `getRouteErrorResponseException`) often wraps
  Cloudflare's generic edge HTML (`<title>… | 502: Bad gateway</title>`,
  `503: Service unavailable`, `524: A timeout occurred`, Ray ID). That is
  edge/origin failure during document or SPA data fetch, not an app `throw`.
  Confirm via `extra.route_error_response.data` before treating it as a route
  bug. Related client noise: React Router `Error: 502 `/`503 ` from
  `fetchAndApplyManifestPatches` when `__manifest` hits the same edge
  statuses. Filters: `sentry-noise.ts`
  (`isCloudflareEdgeRouteError` / `isReactRouterEdgeHttpStatusError`). App
  502/503 responses carry a non-empty body (`resources/lookout`, search) and
  must not be filtered.
- Client React Router data-protocol noise (KCD-XF family):
  `Unable to decode turbo-stream response` (`.data` single-fetch) and
  `__manifest` JSON parse failures (`Unexpected token '<', "<!DOCTYPE"…` or
  Safari `The string did not match the expected pattern` from
  `fetchAndApplyManifestPatches`) mean the client got HTML/empty/truncated
  bodies instead of turbo-stream/JSON. Healthy origin returns
  `text/x-script` / `application/json` (or manifest `204` +
  `X-Remix-Reload-Document`). Filter via `isReactRouterDataProtocolNoise`
  (DOCTYPE payload signature; turbo-stream / Safari pattern require RR
  stack or `.data`/`__manifest` breadcrumbs). Do not broaden to generic
  `Failed to fetch`.
- A stack trace that predates a platform migration may still describe a live
  bug. Before writing an issue off as stale, reproduce it against the current
  runtime (Sentry KCD-XP looked like dead Fly/Express noise but reproduced on
  workerd).
