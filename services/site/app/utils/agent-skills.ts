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

1. Fetch \`https://kentcdodds.com/blog.json\` first to enumerate blog posts with titles, descriptions, categories, dates, and canonical URLs.
2. If the request might involve non-blog pages, fetch \`https://kentcdodds.com/sitemap.xml\` to discover canonical URLs across the site.
3. If you need topical matching, query \`https://kentcdodds.com/search?query=<terms>\` and review the highest-signal results.
4. Fetch the canonical page that best matches the request.
5. When reading a page, prefer \`Accept: text/markdown\` so the site can return markdown instead of HTML when available.

## Selection heuristics

- Prefer canonical \`https://kentcdodds.com\` URLs over mirrors, embeds, or syndicated copies.
- Prefer \`/blog/\` articles when the user wants detailed written guidance.
- Use titles, descriptions, and categories from \`blog.json\` to narrow candidates before opening full pages.
- If several posts match, prefer the newest relevant post unless the user asks for historical context.
`,
} as const

const agentSkillDefinitions = [contentSearchSkill] as const

function createSha256Digest(contents: string) {
	return `sha256:${createHash('sha256').update(contents, 'utf8').digest('hex')}`
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
