import { createHash } from 'node:crypto'
import { getDomainUrl } from './misc.ts'

const agentSkillsDiscoverySchemaUrl =
	'https://schemas.agentskills.io/discovery/0.2.0/schema.json'

const contentSearchSkill = {
	name: 'content-search',
	type: 'skill-md',
	description:
		'Find relevant kentcdodds.com content and retrieve it from canonical, agent-friendly endpoints.',
	path: '/.well-known/agent-skills/content-search/SKILL.md',
	markdown: `---
name: content-search
description: Search kentcdodds.com content quickly and prefer canonical, agent-friendly sources.
---

# Search kentcdodds.com content

Use this skill when you need articles, podcast episodes, or other published content from kentcdodds.com.

## Preferred workflow

1. Query \`https://kentcdodds.com/search?query=<terms>\` first and review the highest-signal results.
2. Fetch the canonical page that best matches the request.
3. If the request might involve broader site discovery or you need alternate candidates, fetch \`https://kentcdodds.com/sitemap.xml\`.
4. When reading a page, prefer \`Accept: text/markdown\` so the site can return markdown instead of HTML when available.

## Selection heuristics

- Prefer canonical \`https://kentcdodds.com\` URLs over mirrors, embeds, or syndicated copies.
- Prefer \`/blog/\` articles when the user wants detailed written guidance.
- Use the search results page to shortlist candidates before opening full pages.
- If several results match, prefer the newest relevant post unless the user asks for historical context.
`,
} as const

const agentSkillDefinitions = [contentSearchSkill] as const

function createSha256Digest(contents: string) {
	return `sha256:${createHash('sha256').update(contents, 'utf8').digest('hex')}`
}

function createSha256ContentDigest(contents: string) {
	const digest = createHash('sha256').update(contents, 'utf8').digest('base64')
	return `sha-256=:${digest}:`
}

export function getAgentSkillsDiscoveryDocument(request: Request) {
	const origin = getDomainUrl(request)

	return {
		$schema: agentSkillsDiscoverySchemaUrl,
		skills: agentSkillDefinitions.map((skill) => ({
			name: skill.name,
			type: skill.type,
			description: skill.description,
			url: `${origin}${skill.path}`,
			digest: createSha256Digest(skill.markdown),
		})),
	} as const
}

export function getContentSearchSkillMarkdown() {
	return contentSearchSkill.markdown
}

export function getContentSearchSkillDigest() {
	return createSha256Digest(contentSearchSkill.markdown)
}

export function getContentSearchSkillContentDigest() {
	return createSha256ContentDigest(contentSearchSkill.markdown)
}
