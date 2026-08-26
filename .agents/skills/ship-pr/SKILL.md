---
name: ship-pr
description: >
  Babysit a PR. Iterate with AI reviewers and CI. Get it ready and maybe merge.
  Send summary message.
---

# Ship PR

## Loop

1. Mark ready — `kody:@kentcdodds/github/pr/set-review-status` with
   `{ prUrl, status: 'ready' }`, or `{ owner, repo, prNumber, status: 'ready' }`
2. Wait for CI — `gh pr checks` (compose `loop-on-ci`, `fix-ci`)
3. Fix failures; address valid AI-reviewer feedback (ignore insignificant nits /
   already-fixed / wrong); check mergability with base branch and rebase if
   needed
4. Green and no valid feedback left → break
5. Push → repeat

## Merge and Deploy if requested or the change is low risk

Squash and merge PR as Kody with
`kody:@kentcdodds/github/pr/merge` using
`{ prUrl, mergeMethod: 'squash' }` (or `{ owner, repo, prNumber, ... }`;
optional `commitTitle`), watch CI deploy. Relevant links for the discord message
include: agent, PR, CI job, and relevant deployment page(s).

Other useful exports on the same package: `pr/get-checks` for check-run status
without `gh`, and `request` / `graphql` (`kody:@kentcdodds/github/request`,
`kody:@kentcdodds/github/graphql`) for one-off authenticated GitHub calls.

## Done → Discord

Always summarize (merged or not) by calling
`kody:@kentcdodds/discord/send-shipped-pr` with structured fields. Do **not**
use raw `post-message` and do **not** compute or guess token cost — the export
fetches the billed Cursor Cloud Agent usage and formats the cost line.

**agentId (required):**
- In a Cursor Cloud Agent VM, read it from the metadata socket:
  curl -fsS --unix-socket "${CURSOR_AGENT_SOCKET:-/run/cursor/api.sock}" http://cursor-agent/v1/meta-data/agent/id
- Otherwise pass the `bc-` id from the agent URL you were launched as
  (https://cursor.com/agents/{id}).

```javascript
import sendShippedPr from 'kody:@kentcdodds/discord/send-shipped-pr'

export default async function main() {
	return sendShippedPr({
		agentId, // bc- id from the metadata socket or launch URL
		title: 'PR title',
		summary: 'What shipped / parked / blocked and why.',
		prUrl: 'https://github.com/owner/repo/pull/1',
		repo: 'owner/repo',
		extras: ['CI green', 'preview verified'],
		status: 'Shipped', // or 'Parked' | 'Blocked'
	})
}
```
