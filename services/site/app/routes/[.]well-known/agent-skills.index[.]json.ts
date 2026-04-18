const agentSkillsDiscoveryDocument = {
	$schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
	skills: [],
} as const

export function loader() {
	const body = JSON.stringify(agentSkillsDiscoveryDocument)

	return new Response(body, {
		headers: {
			'Content-Length': String(Buffer.byteLength(body)),
			'Content-Type': 'application/json',
		},
	})
}
