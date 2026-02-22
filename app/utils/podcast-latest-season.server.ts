import { z } from 'zod'
import { cache, cachified } from './cache.server.ts'
import { type Timings } from './timing.server.ts'

const latestPodcastSeasonLinksSchema = z.object({
	chats: z.object({
		latestSeasonNumber: z.number().nullable(),
		latestSeasonPath: z.string().min(1),
	}),
	calls: z.object({
		latestSeasonNumber: z.number().nullable(),
		latestSeasonPath: z.string().min(1),
	}),
})

function formatSeasonParam(seasonNumber: number) {
	return String(seasonNumber).padStart(2, '0')
}

async function getLatestChatsSeasonNumber({
	request,
	timings,
}: {
	request: Request
	timings?: Timings
}) {
	try {
		// Dynamic import so missing podcast env vars don't crash the whole app.
		const { getSeasonListItems } = await import('./simplecast.server.ts')
		const seasons = await getSeasonListItems({ request, timings })
		const latestSeasonNumber = seasons.reduce(
			(max, s) => Math.max(max, s.seasonNumber),
			0,
		)
		return latestSeasonNumber || null
	} catch (error: unknown) {
		console.error('podcast-latest-season: failed to load chats seasons', error)
		return null
	}
}

async function getLatestCallsSeasonNumber({
	request,
	timings,
}: {
	request: Request
	timings?: Timings
}) {
	try {
		// Dynamic import so missing podcast env vars don't crash the whole app.
		const { getEpisodes } = await import('./transistor.server.ts')
		const episodes = await getEpisodes({ request, timings })
		const latestSeasonNumber = episodes.reduce(
			(max, e) => Math.max(max, e.seasonNumber ?? 0),
			0,
		)
		return latestSeasonNumber || null
	} catch (error: unknown) {
		console.error('podcast-latest-season: failed to load calls episodes', error)
		return null
	}
}

export async function getLatestPodcastSeasonLinks({
	request,
	timings,
}: {
	request: Request
	timings?: Timings
}) {
	return cachified({
		cache,
		request,
		timings,
		key: 'podcasts:latest-season-links',
		// Keep this fairly fresh; it's used on every page load for nav links.
		ttl: 1000 * 60 * 5,
		staleWhileRevalidate: 1000 * 60 * 60 * 24,
		checkValue: latestPodcastSeasonLinksSchema,
		getFreshValue: async () => {
			const [latestChatsSeasonNumber, latestCallsSeasonNumber] =
				await Promise.all([
					getLatestChatsSeasonNumber({ request, timings }),
					getLatestCallsSeasonNumber({ request, timings }),
				])

			return {
				chats: {
					latestSeasonNumber: latestChatsSeasonNumber,
					latestSeasonPath: latestChatsSeasonNumber
						? `/chats/${formatSeasonParam(latestChatsSeasonNumber)}`
						: '/chats',
				},
				calls: {
					latestSeasonNumber: latestCallsSeasonNumber,
					latestSeasonPath: latestCallsSeasonNumber
						? `/calls/${formatSeasonParam(latestCallsSeasonNumber)}`
						: '/calls',
				},
			}
		},
	})
}

