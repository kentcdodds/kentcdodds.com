import { expect, test, vi } from 'vitest'

const staleCachedPeople = [
	{
		name: 'Jane Doe',
		id: undefined,
	},
]

vi.mock('@epic-web/cachified', () => ({
	cachified: vi.fn(async () => staleCachedPeople),
	verboseReporter: vi.fn(() => undefined),
}))

vi.mock('../cache.server.ts', () => ({
	cache: {
		name: 'test-cache',
		get: vi.fn(),
		set: vi.fn(),
		delete: vi.fn(),
	},
	shouldForceFresh: vi.fn(async () => false),
}))

vi.mock('../github.server.ts', () => ({
	downloadFile: vi.fn(async () => ''),
}))

import { getPeople } from '../credits.server.ts'

test('getPeople normalizes stale cached people with missing id values', async () => {
	const people = await getPeople({})
	expect(people).toHaveLength(1)
	expect(people[0]).toMatchObject({
		id: 'jane-doe',
		name: 'Jane Doe',
	})
})
