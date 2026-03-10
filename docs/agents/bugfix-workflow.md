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
