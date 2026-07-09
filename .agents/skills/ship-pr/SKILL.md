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
   already-fixed / wrong)
4. Green and no valid feedback left → break
5. Push → repeat

## Mode

By default, continue to Discord message with summary and include PR link

If explicitly requested, merge PR as Kody with
`kody:@kentcdodds/github/pr/merge` using `{ prUrl, mergeMethod: 'squash' }` (or
`{ owner, repo, prNumber, ... }`; optional `commitTitle`), watch CI deploy, when
finished, continue to the discord message and include a summary with link to PR,
deployed URL link, or failing job link.

Other useful exports on the same package: `pr/get-checks` for check-run status
without `gh`, and `request` / `graphql` (`kody:@kentcdodds/github/request`,
`kody:@kentcdodds/github/graphql`) for one-off authenticated GitHub calls.

## Done → Discord

Post the summary to channel `1491568683737157683`:

```javascript
import postMessage from 'kody:@kentcdodds/discord/post-message'

export default async function main() {
	const content = ` ... `
	return postMessage({
		channelId: '1491568683737157683',
		content,
	})
}
```
