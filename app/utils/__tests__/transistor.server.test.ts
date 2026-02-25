import { expect, test, vi } from 'vitest'

vi.mock('../cache.server.ts', () => {
	return {
		cache: {},
		cachified: async ({ getFreshValue }: { getFreshValue: (context: {}) => unknown }) =>
			await getFreshValue({}),
		shouldForceFresh: async () => true,
	}
})

test('getEpisodes does not forward signal to fetch', async () => {
	const { getEpisodes } = await import('../transistor.server.ts')
	const controller = new AbortController()
	const fetchSpy = vi
		.spyOn(globalThis, 'fetch')
		.mockImplementation(async (input) => {
			if (String(input).startsWith('https://api.transistor.fm/')) {
				return Response.json({ data: [], meta: { totalPages: 1 } }, { status: 200 })
			}
			return new Response(null, { status: 200 })
		})

	try {
		const episodes = await getEpisodes({
			forceFresh: true,
			signal: controller.signal,
		})

		expect(episodes).toEqual([])

		const transistorCall = fetchSpy.mock.calls.find(([input]) =>
			String(input).startsWith('https://api.transistor.fm/'),
		)
		expect(transistorCall).toBeTruthy()
		const requestInit = transistorCall?.[1] as RequestInit | undefined
		expect(requestInit?.signal).toBeUndefined()
	} finally {
		fetchSpy.mockRestore()
	}
})
