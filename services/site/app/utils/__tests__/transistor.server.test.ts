import { expect, test, vi } from 'vitest'

const { bumpGeneration, cacheDelete, getGeneration } = vi.hoisted(() => ({
	bumpGeneration: vi.fn().mockResolvedValue('next'),
	cacheDelete: vi.fn(),
	getGeneration: vi.fn().mockResolvedValue('test'),
}))

vi.mock('../cache.server.ts', () => {
	return {
		cache: { delete: cacheDelete },
		cachified: async ({
			getFreshValue,
		}: {
			getFreshValue: (context: {}) => unknown
		}) => await getFreshValue({}),
		shouldForceFresh: async () => true,
	}
})

vi.mock('../runtime-bindings.server.ts', () => ({
	getRuntimeBinding: () => ({ bumpGeneration, getGeneration }),
}))

function makeEpisode({
	id,
	audioProcessing,
}: {
	id: string
	audioProcessing: boolean
}) {
	return {
		id,
		type: 'episode',
		attributes: {
			number: 28,
			season: 5,
			title: 'Exploring Interests at 15',
			summary: 'summary',
			description: '<p>description</p>',
			keywords: 'testing',
			duration: 231,
			status: 'published',
			image_url: 'https://example.com/image.jpg',
			media_url: 'https://example.com/audio.mp3',
			share_url: 'https://example.com/share',
			embed_html: '',
			embed_html_dark: '',
			published_at: '2026-07-15T03:14:21.000Z',
			updated_at: '2026-07-15T03:14:21.000Z',
			audio_processing: audioProcessing,
		},
	}
}

test('getEpisodes does not forward signal to fetch', async () => {
	const { getEpisodes } = await import('../transistor.server.ts')
	const controller = new AbortController()
	const fetchSpy = vi
		.spyOn(globalThis, 'fetch')
		.mockImplementation(async (input) => {
			if (String(input).startsWith('https://api.transistor.fm/')) {
				return Response.json(
					{ data: [], meta: { totalPages: 1 } },
					{ status: 200 },
				)
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

test('getEpisodes returns the empty fallback when cache generation lookup fails', async () => {
	getGeneration.mockRejectedValueOnce(new Error('generation unavailable'))
	const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
	const { getEpisodes } = await import('../transistor.server.ts')

	try {
		await expect(getEpisodes({ forceFresh: true })).resolves.toEqual([])
		expect(consoleError).toHaveBeenCalledWith(
			'transistor: cachified failed to resolve episodes, returning empty fallback',
			expect.any(Error),
		)
	} finally {
		consoleError.mockRestore()
	}
})

test('getCurrentSeason uses the highest season across unordered pages', async () => {
	const { getCurrentSeason } = await import('../transistor.server.ts')
	const fetchSpy = vi
		.spyOn(globalThis, 'fetch')
		.mockImplementation(async (input) => {
			const url = new URL(String(input))
			const page = url.searchParams.get('pagination[page]')
			return Response.json({
				data: [
					{
						id: page === '1' ? 'season-one' : 'season-five',
						attributes: { season: page === '1' ? 1 : 5 },
					},
				],
				meta: { totalPages: 2 },
			})
		})

	try {
		await expect(getCurrentSeason()).resolves.toBe(5)
		expect(fetchSpy).toHaveBeenCalledTimes(2)
		for (const [input] of fetchSpy.mock.calls) {
			expect(new URL(String(input)).searchParams.get('show_id')).toBe('12345')
		}
	} finally {
		fetchSpy.mockRestore()
	}
})

test('bumps a show-scoped episode cache generation', async () => {
	bumpGeneration.mockClear()
	const { bumpEpisodesCacheGeneration } =
		await import('../transistor.server.ts')

	await expect(bumpEpisodesCacheGeneration()).resolves.toBe('next')
	expect(bumpGeneration).toHaveBeenCalledWith('transistor-episodes:12345')
})

test('an immediate refresh can cache an episode before it is list-ready', async () => {
	const { getEpisodes } = await import('../transistor.server.ts')
	const episodeId = 'new-episode'
	let listRequest = 0
	const fetchSpy = vi
		.spyOn(globalThis, 'fetch')
		.mockImplementation(async (input) => {
			if (!String(input).startsWith('https://api.transistor.fm/')) {
				return new Response(null, { status: 200 })
			}
			listRequest++
			const audioProcessing = listRequest === 1
			return Response.json({
				data: [makeEpisode({ id: episodeId, audioProcessing })],
				meta: { totalPages: 1 },
			})
		})

	try {
		const immediate = await getEpisodes({ forceFresh: true })

		const later = await getEpisodes({ forceFresh: true })

		expect(immediate).toEqual([])
		expect(later.map((episode) => episode.transistorEpisodeId)).toContain(
			episodeId,
		)
	} finally {
		fetchSpy.mockRestore()
	}
})

test('post-publish refresh polls until the new episode is list-ready', async () => {
	const { refreshEpisodesAfterPublish } =
		await import('../transistor.server.ts')
	const episodeId = 'eventually-ready-episode'
	let listRequest = 0
	const fetchSpy = vi
		.spyOn(globalThis, 'fetch')
		.mockImplementation(async (input) => {
			if (!String(input).startsWith('https://api.transistor.fm/')) {
				return new Response(null, { status: 200 })
			}
			listRequest++
			return Response.json({
				data: [
					makeEpisode({
						id: episodeId,
						audioProcessing: listRequest === 1,
					}),
				],
				meta: { totalPages: 1 },
			})
		})

	try {
		const ready = await refreshEpisodesAfterPublish({
			episodeId,
			attempts: 3,
			delayMs: 1,
			sleep: async () => {},
		})

		expect(ready).toBe(true)
		expect(listRequest).toBe(2)
		expect(cacheDelete).not.toHaveBeenCalled()
	} finally {
		fetchSpy.mockRestore()
	}
})

test('post-publish refresh clears an incomplete list after timeout', async () => {
	cacheDelete.mockClear()
	const { refreshEpisodesAfterPublish } =
		await import('../transistor.server.ts')
	const episodeId = 'still-processing-episode'
	const fetchSpy = vi
		.spyOn(globalThis, 'fetch')
		.mockImplementation(async (input) => {
			if (!String(input).startsWith('https://api.transistor.fm/')) {
				return new Response(null, { status: 200 })
			}
			return Response.json({
				data: [makeEpisode({ id: episodeId, audioProcessing: true })],
				meta: { totalPages: 1 },
			})
		})

	try {
		await expect(
			refreshEpisodesAfterPublish({
				episodeId,
				attempts: 2,
				delayMs: 1,
				sleep: async () => {},
			}),
		).resolves.toBe(false)
		expect(cacheDelete).toHaveBeenCalledWith('transistor:episodes:12345:test')
	} finally {
		fetchSpy.mockRestore()
	}
})
