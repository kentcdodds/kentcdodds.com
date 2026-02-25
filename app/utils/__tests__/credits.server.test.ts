import { cachified } from '@epic-web/cachified'
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
import { downloadFile } from '../github.server.ts'

test('getPeople normalizes stale cached people with missing id values', async () => {
	const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
	try {
		vi.mocked(cachified).mockImplementationOnce(async () => staleCachedPeople)

		const people = await getPeople({})
		expect(people).toHaveLength(1)
		expect(people[0]).toMatchObject({
			id: 'jane-doe',
			name: 'Jane Doe',
		})
	} finally {
		warnSpy.mockRestore()
	}
})

test('getPeople checkValue rejects missing ids and revalidates via getFreshValue', async () => {
	const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
	try {
		vi.mocked(downloadFile).mockResolvedValueOnce('- name: Fresh Person')
		vi.mocked(cachified).mockImplementationOnce(async (...args) => {
			const options = args[0] as {
				checkValue?: (
					value: unknown,
					migrate: (value: unknown, updateCache?: boolean) => unknown,
				) => unknown
				getFreshValue: (context: {
					metadata: { createdTime: number }
					background: boolean
				}) => Promise<unknown>
			}
			expect(options.checkValue?.(staleCachedPeople, () => undefined)).toBe(false)
			return options.getFreshValue({
				metadata: { createdTime: Date.now() },
				background: false,
			})
		})

		const people = await getPeople({})
		expect(people).toHaveLength(1)
		expect(people[0]).toMatchObject({
			id: 'fresh-person',
			name: 'Fresh Person',
		})
		expect(downloadFile).toHaveBeenCalledWith('content/data/credits.yml')
	} finally {
		warnSpy.mockRestore()
	}
})
