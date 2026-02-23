import {
	data as json,
	type LinksFunction,
	type MetaFunction,
	useSearchParams,
} from 'react-router'
import {
	LiteYouTubeEmbed,
	links as youTubeEmbedLinks,
} from '#app/components/fullscreen-yt-embed.tsx'
import { Grid } from '#app/components/grid.tsx'
import { Paragraph } from '#app/components/typography.tsx'
import { getEnv } from '#app/utils/env.server.ts'
import { type Route } from './+types/youtube'

function parseVideoId(value: string | null) {
	if (!value) return null
	return /^[A-Za-z0-9_-]{11}$/.test(value) ? value : null
}

function parseTimestampSeconds(value: string | null) {
	if (!value) return null
	const trimmed = value.trim()
	if (!trimmed) return null
	// Keep it simple: `t=123` (seconds). This is what our semantic search deep links emit.
	if (!/^\d+$/.test(trimmed)) return null
	const n = Number(trimmed)
	if (!Number.isFinite(n)) return null
	// Cap to something reasonable just to avoid nonsense inputs.
	return Math.max(0, Math.min(n, 60 * 60 * 24))
}

function parsePlaylistId(value: string | undefined) {
	if (!value) return null
	const trimmed = value.trim()
	if (!trimmed) return null
	if (/^[A-Za-z0-9_-]{10,}$/.test(trimmed)) return trimmed
	try {
		const url = new URL(trimmed)
		const list = url.searchParams.get('list')
		return list && /^[A-Za-z0-9_-]{10,}$/.test(list) ? list : null
	} catch {
		return null
	}
}

export async function loader() {
	const env = getEnv()
	const configuredPlaylistId = parsePlaylistId(env.YOUTUBE_PLAYLIST_ID)
	if (!configuredPlaylistId) {
		throw new Error(
			`Invalid YOUTUBE_PLAYLIST_ID: "${env.YOUTUBE_PLAYLIST_ID}". Expected a playlist ID or URL.`,
		)
	}
	return json({
		playlistId: configuredPlaylistId,
	})
}

export const meta: MetaFunction = () => {
	return [
		{ title: 'YouTube Videos | Kent C. Dodds' },
		{
			name: 'description',
			content:
				'Watch Kent C. Dodds YouTube videos here. Search results can deep-link to each video.',
		},
	]
}

export const links: LinksFunction = () => {
	return youTubeEmbedLinks()
}

export default function YouTubePage({
	loaderData: { playlistId },
}: Route.ComponentProps) {
	const [searchParams] = useSearchParams()
	const selectedVideoId = parseVideoId(searchParams.get('video'))
	const startSeconds = parseTimestampSeconds(searchParams.get('t'))
	const playlistUrl = `https://www.youtube.com/playlist?list=${encodeURIComponent(
		playlistId,
	)}`
	const playlistEmbedUrl = `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(
		playlistId,
	)}`

	return (
		<Grid as="main" className="mb-24 lg:mb-48">
			<div className="col-span-full space-y-4">
				{selectedVideoId ? (
					<div className="overflow-hidden rounded-lg bg-black">
						<LiteYouTubeEmbed
							id={selectedVideoId}
							title={`YouTube video ${selectedVideoId}`}
							announce="Play video"
							params={new URLSearchParams({
								rel: '0',
								modestbranding: '1',
								// Do not include the configured playlist when deep-linking to a
								// specific video. If the video is not in the playlist, YouTube will
								// fall back to playing the first playlist entry instead.
								...(startSeconds ? { start: String(startSeconds) } : {}),
							}).toString()}
						/>
					</div>
				) : (
					<div className="aspect-video overflow-hidden rounded-lg bg-black">
						<iframe
							title="YouTube playlist"
							src={playlistEmbedUrl}
							className="h-full w-full"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
							referrerPolicy="strict-origin-when-cross-origin"
							allowFullScreen
						/>
					</div>
				)}

				<Paragraph>
					{selectedVideoId
						? 'Showing the selected video from semantic search results.'
						: 'Showing the configured playlist.'}
				</Paragraph>
				<Paragraph>
					<a
						href={playlistUrl}
						className="underlined"
						target="_blank"
						rel="noreferrer noopener"
					>
						Open this playlist on YouTube
					</a>
				</Paragraph>
			</div>
		</Grid>
	)
}
