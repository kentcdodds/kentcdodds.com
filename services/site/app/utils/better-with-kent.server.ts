import { z } from 'zod'
import { cache, cachified } from './cache.server.ts'
import { type Timings } from './timing.server.ts'

// The "Better with Kent" playlist on Kent's YouTube channel. Episodes are
// added here by the publishing pipeline in the kcd-youtube repo.
export const betterWithKentPlaylistId = 'PLV5CVI1eNcJhP4nrJt85L7PxHjebFpDfY'

const betterWithKentEpisodeSchema = z.object({
	videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
	title: z.string().min(1),
	description: z.string(),
	publishedAt: z.string().min(1),
})

export type BetterWithKentEpisode = z.infer<typeof betterWithKentEpisodeSchema>

const betterWithKentEpisodesSchema = z.array(betterWithKentEpisodeSchema)

function decodeXmlEntities(value: string) {
	return value
		.replace(/&#(\d+);/g, (_, code: string) =>
			String.fromCodePoint(Number(code)),
		)
		.replace(/&#x([0-9a-fA-F]+);/g, (_, code: string) =>
			String.fromCodePoint(parseInt(code, 16)),
		)
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&')
}

function getTagContent(xml: string, tag: string) {
	const match = xml.match(
		new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`),
	)
	const content = match?.[1]?.trim()
	return content ? decodeXmlEntities(content) : null
}

export function parseYouTubePlaylistFeed(
	xml: string,
): Array<BetterWithKentEpisode> {
	const episodes: Array<BetterWithKentEpisode> = []
	for (const [, entry = ''] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
		const videoId = getTagContent(entry, 'yt:videoId')
		const title = getTagContent(entry, 'title')
		const publishedAt = getTagContent(entry, 'published')
		if (!videoId || !title || !publishedAt) continue

		// The full YouTube description is long (chapters, links, etc.). The first
		// paragraph is the episode summary, which is all we want on the page.
		const description =
			getTagContent(entry, 'media:description')
				?.split(/\n\s*\n/)[0]
				?.trim() ?? ''

		const parsed = betterWithKentEpisodeSchema.safeParse({
			videoId,
			title,
			description,
			publishedAt,
		})
		if (parsed.success) episodes.push(parsed.data)
	}
	return episodes.sort(
		(a, b) =>
			new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
	)
}

export async function getBetterWithKentEpisodes({
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
		key: 'better-with-kent:episodes',
		ttl: 1000 * 60 * 15,
		staleWhileRevalidate: 1000 * 60 * 60 * 24 * 7,
		checkValue: betterWithKentEpisodesSchema,
		getFreshValue: async () => {
			const response = await fetch(
				`https://www.youtube.com/feeds/videos.xml?playlist_id=${betterWithKentPlaylistId}`,
			)
			if (!response.ok) {
				throw new Error(
					`Failed to fetch Better with Kent playlist feed: HTTP ${response.status}`,
				)
			}
			return parseYouTubePlaylistFeed(await response.text())
		},
	}).catch((error: unknown) => {
		console.error('better-with-kent: failed to load episodes', error)
		return [] as Array<BetterWithKentEpisode>
	})
}
