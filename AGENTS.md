# AGENTS.md

This file is included in full context for every agent conversation. Keep it tiny
and stable.

## Editing policy

- Avoid adding operational details to `AGENTS.md`.
- Only update `AGENTS.md` to reference other docs/files.
- Put project callouts and workflow details in `docs/agents/` and link them from
  here.

## Agent docs (source of truth)

- `docs/agents/project-context.md` (setup, commands, project-specific caveats)
- `docs/agents/code-style.md`
- `docs/agents/bugfix-workflow.md`
- `docs/agents/testing-principles.md`

If you discover a new sharp edge, workflow, or non-obvious project behavior,
update the relevant doc(s) in `docs/agents/` so future agent runs are faster and
more correct. Keep callouts organized under clear headings and prefer concise,
project-specific guidance over generic advice.

## Cursor Cloud specific instructions

- **Node 24 required.** The VM snapshot uses nvm; `nvm use 24` is automatic.
- **Quick-start:** `npm install` from repo root handles everything (including
  `prisma generate` via postinstall). Copy `services/site/.env.example` →
  `services/site/.env` if `.env` doesn't exist yet, then reset the DB with
  `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=yes npm exec --workspace kentcdodds.com prisma migrate reset -- --force`.
- **Dev server:** `npm run dev` (port 3000). First request compiles all MDX
  blog posts and can take ~30 s; subsequent loads are instant.
- See `docs/agents/project-context.md` for the full command table, caveats, and
  testing notes.
