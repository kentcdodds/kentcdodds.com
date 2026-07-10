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

When finished (whether merged or not), send a discord summary with relevant links.

```javascript
import postMessage from 'kody:@kentcdodds/discord/post-message'

export default async function main() {
	const content = ` ... `
	const shipPrChannelId = '1491568683737157683'
	return postMessage({ channelId: shipPrChannelId, content })
}
```
