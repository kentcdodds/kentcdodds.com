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
- Client `TypeError: Failed to fetch` / Firefox `NetworkError when attempting to
fetch resource` / Safari `Load failed` with React Router stacks
  (`fetchAndDecodeViaTurboStream`, `fetchAndApplyManifestPatches`) and a
  failing `.data` / `__manifest` breadcrumb **without** `status_code` are
  browser network-layer failures during SPA nav (idle tab, offline, flaky
  mobile) — not an app throw. Live endpoints often still return 200. Do not
  broadly `ignoreErrors` these (KCD-XZ / KCD-QG family); optional product UX is
  a hard-reload fallback on nav TypeError.
- Blog `markAsRead()` (`routes/action/mark-as-read.tsx`) is best-effort read
  tracking. Uncaught `fetch` rejections from that path are app noise: keep the
  catch inside `markAsRead` (KCD-FY / KCD-1R / KCD-ZW / KCD-WV), do not filter
  generic network strings in `sentry-noise.ts`.
- Server: React Router `throwIfPotentialCSRFAttack` aborts (`…from a forwarded
action request. Aborting the action.`, invalid/`missing host` Origin variants)
  are expected 400s for mismatched Origin probes. Skip Sentry in
  `entry.server.tsx` `handleError` via `isReactRouterCsrfAbortError` (KCD-YN);
  do not weaken CSRF checks to silence the alert.
- Page-translator DOM mutation (Google/Chrome Translate) often surfaces as
  `RangeError: Maximum call stack size exceeded` with an unattributed
  `filename: "undefined"` frame **or** HTML-document-path frames
  (`https://kentcdodds.com/`, `/clubs`) plus UI breadcrumbs like
  `a > font > font` / `font > font`, or `html.translated-ltr` /
  `translated-rtl`. Do not broadly ignore call-stack overflows — require that
  unusable/HTML-document stack plus translator evidence (KCD-QW / KCD-108).
  Check both Sentry `filename` and `absPath`: a placeholder in one field is not
  enough when the other identifies a first-party bundle URL.
- The same translators also cause React `NotFoundError` on `removeChild` /
  `insertBefore` (Chrome) or Safari `The object can not be found here.` during
  `react-dom` deletion (facebook/react#11538). Filter via
  `isTranslatorDomMutationNoise` only when the stack is react-dom/native with no
  in-app frames — do not add `Node.prototype` monkey-patches for triage
  (KCD-S5 / KCD-XQ / KCD-ZE).
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
- Client `Error: No result found for routeId "…"` is React Router's
  `SingleFetchNoResultError` from `unwrapSingleFetchResult` when a stale client
  route tree asks for a routeId missing from the server's single-fetch `.data`
  response (tab held open across deploys). Stack is entirely in `react-router`;
  the same signature appears for many still-existing routes (`routes/courses`,
  `routes/blog_/$slug`, etc.). Filter via `sentry-noise.ts` — do not "fix" by
  re-adding routes that already exist.
- Client `Error: Unexpected Server Error` with an empty / unusable stack is
  React Router production `sanitizeError` (and turbo-stream `SanitizedError`):
  the real Error was stripped before leaving the server. `entry.server`
  `handleError` already reports the actionable server event — the client echo
  is noise (KCD-SE). Filter via `isReactRouterSanitizedServerError` / skip
  capture in `useCapturedRouteError` only when the message is exact and stack
  frames are unusable / `Error.stack` is falsy. Do not ignore the phrase alone.
  Keep events that still have an `inApp: true` frame even if Sentry omitted
  `filename`. Soft-degrade known transient search timeouts on `/search` the
  same way as `resources/search` (`SearchWorkerTimeoutError` → user-facing
  unavailable message) so they never become sanitized client 500s; when that
  soft-error resolves, clear any prior deferred `resolved` results so a new
  timed-out query cannot keep showing hits from the previous successful query.
- Client React Router data-protocol noise (KCD-XF family):
  `Unable to decode turbo-stream response` (`.data` single-fetch) and
  `__manifest` JSON parse failures (`Unexpected token '<', "<!DOCTYPE"…` or
  Safari `The string did not match the expected pattern` from
  `fetchAndApplyManifestPatches`) mean the client got HTML/empty/truncated
  bodies instead of turbo-stream/JSON. Healthy origin returns
  `text/x-script` / `application/json` (or manifest `204` +
  `X-Remix-Reload-Document`). Filter via `isReactRouterDataProtocolNoise`
  (DOCTYPE payload signature; turbo-stream / Safari pattern require RR stack
  or `.data`/`__manifest` breadcrumbs). Do not broaden to generic
  `Failed to fetch`.
- Client Firefox `SyntaxError: illegal character U+XXXX` with the HTML page
  URL as the script filename (often `<!DOCTYPE` in frame context) is the same
  HTML-where-JS-expected class as Chrome's DOCTYPE JSON SyntaxError, but
  Firefox reports a C1/control codepoint instead of `Unexpected token '<'`
  (KCD-105). Filter via `isHtmlDocumentAsScriptNoise` only with that message
  plus HTML-document evidence (document-path filename or DOCTYPE context) —
  never the illegal-character phrase alone (a real `.js` bundle with C1
  controls should still alert).
- Client `TypeError: … reading 'ok'|'status'` from React Router's
  `fetchAndApplyManifestPatches` / `fetchAndDecodeViaTurboStream` means
  `fetch` resolved to `undefined` (native `fetch` never does). That signature
  alone is not enough to drop — a first-party broken wrapper would look the
  same. Only filter via `isBrokenClientFetchContractError` when trailing
  console breadcrumbs are the injected interceptor's adjacent `URL:` →
  `Options:` sequence (KCD-ZY / KCD-ZX); otherwise retain for triage.
- Client `Error: Should not already be working.` from React's scheduler →
  `react-dom` work loop (`performWorkUntilDeadline` /
  `performWorkOnRootViaSchedulerTask`) is Firefox MessageChannel re-entrancy
  during blocking APIs (facebook/react#17355, Bugzilla 758004) — not an app
  bug. Filter via `isReactSchedulerAlreadyWorkingNoise` only when the exact
  message has an exclusively scheduler/react-dom stack (every frame) and no
  in-app frames (KCD-YT). Do not ignore the phrase alone.
- Client `<unknown>` unhandledrejection titles with empty stacks are often
  non-Error rejections. Inspect the event JSON `extra.__serialized__` before
  filtering: EIP-1193 wallet disconnect uses codes `4900` /
  "The provider is disconnected from all chains." and `4901` /
  "…from the requested chain" with `chrome-extension://…/background.js`
  stacks (KCD-YX — extend `isWalletUserRejection`); Safari/extension
  `Event \`CustomEvent\` (type=unhandledrejection) captured as promise rejection`
  is external CustomEvent wrapping (KCD-S8). Never drop bare
  "Object captured as promise rejection with keys…" without a provider signal.
- A stack trace that predates a platform migration may still describe a live
  bug. Before writing an issue off as stale, reproduce it against the current
  runtime (Sentry KCD-XP looked like dead Fly/Express noise but reproduced on
  workerd).
- Client `TypeError: …constructor is not a constructor` from date-fns
  `constructFrom` (`normalizeDates` → `Array.map` → `new date.constructor`)
  means the browser environment made `Date.constructor` non-constructable
  (extensions/polyfills). Stack often lands in homepage
  `ProblemSolutionSection` via `differenceInYears`. Prefer plain calendar-year
  math (`getYearsTeaching` in `utils/years-teaching.ts`) for static marketing
  copy — do not filter the generic constructor TypeError (KCD-100).
- Client `ReferenceError: zp_token is not defined` from `/3/zp.js` is Check
  Point Zero Phishing (`zerophishing.iaas.checkpoint.com`) injected into the
  visitor's browser — not site code. Filter via `denyUrls` for that host plus
  the distinctive `zp_token` ignoreErrors (KCD-102); do not chase app fixes.
- Client `TypeError: … reading 'location'` with function
  `HTMLInputElement.onchange` and exclusively unusable or HTML-document stack
  frames (`https://kentcdodds.com/…`, source context that is page HTML / route
  manifest JSON) is password-manager / autofill extension noise — not app
  `navigation.location` (KCD-109). Filter via
  `isInjectedInputOnchangeLocationError` (uses
  `hasOnlyUnusableOrHtmlDocumentStackFrames`); never drop the location
  TypeError from first-party `/assets/` bundles.
