# D1 Prisma transaction audit

This audit lists every `prisma.$transaction` usage found under `services/site`
with `rg '\$transaction' services/site`. Use it when preparing the D1 phase of
the Cloudflare migration.

## Recommended defaults for D1

- Avoid interactive Prisma transactions on D1 until the selected Prisma adapter
  and deployment shape prove they support them safely.
- Prefer short, sequential write groups. Use an atomic batch only when D1 and the
  Prisma path both guarantee the required all-or-nothing behavior.
- Make each write path idempotent so a retry after a Worker interruption,
  network error, or partial write is safe.
- Keep external side effects outside database batches, then make the database
  record of that side effect retry-safe with unique keys or upserts.

## Transaction inventory

### `app/utils/prisma.server.ts`

Function: `migrateHomeworkCompletionsToUser`

Current behavior:

- Uses an interactive transaction.
- Reads anonymous `HomeworkCompletion` rows for `clientId`.
- Upserts each row for the authenticated `userId`.
- Ignores unique-conflict races for already-migrated completions.
- Deletes the anonymous rows after the upserts finish.

Recommended D1 behavior:

- Replace the interactive transaction with a sequential, idempotent migration
  flow.
- Keep the per-completion upsert keyed by
  `userId_seasonNumber_episodeNumber_itemIndex`.
- Delete `clientId` rows only after all user upserts finish.
- If an atomic D1 batch is available through the final Prisma path, batch the
  upserts and delete in one ordered unit; otherwise rely on idempotency so a
  retry can safely resume.

### `app/routes/resources/calls/save.tsx` publish cleanup

Current behavior:

- Uses array-form `$transaction`.
- Creates a `CallKentCallerEpisode` after a Transistor episode is created.
- Deletes the source `Call` row in the same transaction.
- Relies on `transistorEpisodeId` being unique.

Recommended D1 behavior:

- Keep this as a short atomic batch if supported: create the caller episode,
  then delete the raw call.
- Consider changing the create to an upsert keyed by `transistorEpisodeId`
  before D1 cutover so retrying after the external Transistor side effect is
  safe.
- Do not put the Transistor publish call inside any database transaction or
  batch.

### `app/routes/resources/calls/save.tsx` draft replacement

Current behavior:

- Uses array-form `$transaction`.
- Deletes any existing `CallKentEpisodeDraft` for `callId`.
- Creates a new draft for the same `callId`.
- Cleans up old stored audio blobs before replacing the database draft.

Recommended D1 behavior:

- Prefer an atomic batch for delete-then-create so `callId` does not temporarily
  have no draft if the Worker stops between writes.
- If an atomic batch is not available, keep the flow retry-safe: the unique
  `callId` constraint and repeatable delete-then-create make admin retries
  straightforward.
- Keep blob cleanup best-effort and outside the database batch.

### `app/routes/reset-password.tsx`

Current behavior:

- Uses array-form `$transaction`.
- Upserts the user's `Password` row.
- Deletes all sessions for the user so password reset signs out other sessions.

Recommended D1 behavior:

- Prefer an atomic batch because the password update and session invalidation
  are one security-sensitive state change.
- If the final D1 path cannot batch this atomically, run the password upsert and
  session delete sequentially and retry the session delete on failure.
- Both operations are naturally idempotent and safe to retry.

### `app/routes/me_.password.tsx`

Current behavior:

- Uses array-form `$transaction`.
- Upserts the authenticated user's `Password` row.
- Deletes all sessions for the user so password change invalidates existing
  sessions.

Recommended D1 behavior:

- Match the reset-password path: prefer an atomic batch for the password update
  and session invalidation.
- If batching is unavailable, keep the sequential fallback explicit and retry
  the session delete.
- Both operations are naturally idempotent and safe to retry.

## GitHub issue checklist

- [ ] Confirm the final Prisma+D1 adapter behavior for array-form
      `$transaction`.
- [ ] Confirm whether interactive Prisma transactions are supported and safe for
      the deployed Worker shape.
- [ ] Replace `migrateHomeworkCompletionsToUser` with a D1-safe sequential or
      batched migration flow.
- [ ] Make Call Kent publish cleanup retry-safe after Transistor publish, likely
      with an upsert keyed by `transistorEpisodeId`.
- [ ] Decide whether Call Kent draft replacement must be atomic on D1 or can rely
      on admin retry.
- [ ] Preserve atomic or retry-safe password update plus session invalidation for
      both reset-password and change-password routes.
- [ ] Add D1/staging tests or manual verification notes for each updated write
      path before production cutover.
