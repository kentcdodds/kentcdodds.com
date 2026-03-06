This Worker consumes Cloudflare Queue messages for Call Kent FFmpeg jobs and
dispatches them to the container service.

Key files:

- `src/index.ts`: queue consumer entrypoint
- `wrangler.jsonc`: queue binding + retry settings (3 concurrent batch size)

The app enqueues messages via Cloudflare's Queue REST API.
