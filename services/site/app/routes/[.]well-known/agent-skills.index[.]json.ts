import { getAgentSkillsDiscoveryDocument } from '#app/utils/agent-skills.ts'

export function loader({ request }: { request: Request }) {
	const body = JSON.stringify(getAgentSkillsDiscoveryDocument(request))

	return new Response(body, {
		headers: {
			'Cache-Control': 'public, max-age=3600',
			'Content-Length': String(Buffer.byteLength(body)),
			'Content-Type': 'application/json',
		},
	})
}
