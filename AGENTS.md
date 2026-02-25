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
- `docs/agents/cloudflare-managed-controls.md`
- `docs/agents/mock-api-servers.md`

If you discover a new sharp edge, workflow, or non-obvious project behavior,
update the relevant doc(s) in `docs/agents/` so future agent runs are faster and
more correct. Keep callouts organized under clear headings and prefer concise,
project-specific guidance over generic advice.
