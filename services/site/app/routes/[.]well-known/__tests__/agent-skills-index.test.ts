// @vitest-environment node
import { expect, test } from 'vitest'

import { loader } from '../agent-skills.index[.]json.ts'

test('loader returns the placeholder agent skills discovery index', async () => {
	const response = await loader()
	const payload = await response.json()

	expect(response.headers.get('Content-Type')).toContain('application/json')
	expect(payload).toEqual({
		$schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
		skills: [],
	})
})
