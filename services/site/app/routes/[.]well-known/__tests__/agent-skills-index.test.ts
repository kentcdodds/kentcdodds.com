// @vitest-environment node
import { createHash } from 'node:crypto'
import { expect, test } from 'vitest'
import {
	getContentSearchSkillDigest,
	getContentSearchSkillMarkdown,
} from '#app/utils/agent-skills.ts'
import { loader as skillIndexLoader } from '../agent-skills.index[.]json.ts'
import { loader as skillMarkdownLoader } from '../agent-skills.content-search.SKILL[.]md.ts'
import { type Route as IndexRoute } from '../+types/agent-skills.index[.]json'

function createIndexLoaderArgs(request: Request): IndexRoute.LoaderArgs {
	return {
		context: {},
		params: {},
		request,
		unstable_pattern: '/.well-known/agent-skills/index.json',
	}
}

test('loader returns a populated agent skills discovery index', async () => {
	const request = new Request(
		'https://kentcdodds.com/.well-known/agent-skills/index.json',
		{
			headers: { host: 'kentcdodds.com' },
		},
	)
	const response = await skillIndexLoader(createIndexLoaderArgs(request))
	const payload = await response.json()

	expect(response.headers.get('Content-Type')).toContain('application/json')
	expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600')
	expect(payload).toEqual({
		$schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
		skills: [
			{
				name: 'content-search',
				type: 'skill-md',
				description:
					'Find relevant kentcdodds.com content and retrieve it from canonical, agent-friendly endpoints.',
				url: 'https://kentcdodds.com/.well-known/agent-skills/content-search/SKILL.md',
				digest: getContentSearchSkillDigest(),
			},
		],
	})
})

test('skill markdown route serves the same artifact referenced by the index', async () => {
	const response = await skillMarkdownLoader()
	const body = await response.text()
	const expectedContentDigest = `sha-256=:${createHash('sha256')
		.update(getContentSearchSkillMarkdown(), 'utf8')
		.digest('base64')}:`

	expect(response.headers.get('Content-Type')).toContain('text/markdown')
	expect(response.headers.get('Content-Digest')).toBe(expectedContentDigest)
	expect(body).toBe(getContentSearchSkillMarkdown())
	expect(body).toContain('https://kentcdodds.com/search?query=<terms>')
	expect(body).toContain('Accept: text/markdown')
})
