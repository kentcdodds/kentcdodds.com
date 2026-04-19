import {
	getContentSearchSkillDigest,
	getContentSearchSkillMarkdown,
} from '#app/utils/agent-skills.ts'

export function loader() {
	const markdown = getContentSearchSkillMarkdown()

	return new Response(markdown, {
		headers: {
			'Cache-Control': 'public, max-age=3600',
			'Content-Digest': getContentSearchSkillDigest(),
			'Content-Length': String(Buffer.byteLength(markdown)),
			'Content-Type': 'text/markdown; charset=utf-8',
		},
	})
}
