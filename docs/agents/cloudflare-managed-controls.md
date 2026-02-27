# Cloudflare managed controls

This project is migrating operational protections from app-local logic to
Cloudflare-managed controls wherever possible.

## Rate limiting

The app no longer applies an in-process limiter for paid text-to-speech calls.
Configure Cloudflare rate limiting for this route instead:

- Path: `/resources/calls/text-to-speech`
- Method: `POST`
- Action: block or managed challenge (environment-specific)
- Suggested baseline window: 10 minutes
- Suggested baseline threshold: 20 requests per client identifier

Use Cloudflare-native client identifiers (IP, bot signals, and/or custom
request characteristics) based on your environment and threat model.

## Scheduled cleanup

Expired session/verification cleanup is now Worker-scheduled (cron trigger in
`wrangler.jsonc`), not process-local interval timers.

## Shared cache binding

When running in Workers, configure a KV namespace binding named
`SITE_CACHE_KV`. Without that binding, the app falls back to sqlite (or
in-memory fallback when sqlite is unavailable).
