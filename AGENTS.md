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
- `docs/agents/cloudflare-worker-architecture.md` (worker topology, deploy, D1)
- `docs/agents/cutover-runbook.md` (production cutover procedure)
- `docs/agents/post-cutover-cleanup-playbook.md` (Fly/staging decommission plan; do not execute until Kent gives the go-ahead)
- `docs/agents/data-table-conventions.md` (runtime DB access patterns)
- `docs/agents/code-style.md`
- `docs/agents/bugfix-workflow.md`
- `docs/agents/testing-principles.md`

If you discover a new sharp edge, workflow, or non-obvious project behavior,
update the relevant doc(s) in `docs/agents/` so future agent runs are faster and
more correct. Keep callouts organized under clear headings and prefer concise,
project-specific guidance over generic advice.

## Cursor Cloud specific instructions

- See `docs/agents/project-context.md` for setup, commands, seed data, VM
  snapshot details, and caveats.
