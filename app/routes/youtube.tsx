import {
	data as json,
	type LinksFunction,
	type MetaFunction,
	useLocation,
	useSearchParams,
} from 'react-router'
import {
	LiteYouTubeEmbed,
	links as youTubeEmbedLinks,
} from '#app/components/fullscreen-yt-embed.tsx'
import { Grid } from '#app/components/grid.tsx'
import { IconLink } from '#app/components/icon-link.tsx'
import { XIcon } from '#app/components/icons.tsx'
import { Paragraph, H3 } from '#app/components/typography.tsx'
import { FavoriteToggle } from '#app/routes/resources/favorite.tsx'
import { getEnv } from '#app/utils/env.server.ts'
import { useRootData } from '#app/utils/use-root-data.ts'
import { type Route } from './+types/youtube'

function parseVideoId(value: string | null) {
	if (!value) return null
	return /^[A-Za-z0-9_-]{11}$/.test(value) ? value : null
}

function asNonEmptyString(value: unknown) {
	if (typeof value !== 'string') return null
	const trimmed = value.trim()
	return trimmed ? trimmed : null
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

function formatTimestamp(totalSeconds: number) {
	const seconds = Math.max(0, Math.floor(totalSeconds))
	const hours = Math.floor(seconds / 3600)
	const minutes = Math.floor((seconds % 3600) / 60)
	const secs = seconds % 60

	if (hours > 0) {
		return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(
			2,
			'0',
		)}`
	}
	return `${minutes}:${String(secs).padStart(2, '0')}`
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
	const location = useLocation()
	const { requestInfo } = useRootData()
	const selectedVideoId = parseVideoId(searchParams.get('video'))
	const startSeconds = parseTimestampSeconds(searchParams.get('t'))
	const playlistUrl = `https://www.youtube.com/playlist?list=${encodeURIComponent(
		playlistId,
	)}`
	const playlistEmbedUrl = `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(
		playlistId,
	)}`

	const semanticSearchState = (location.state as any)?.semanticSearch as
		| { title?: unknown; description?: unknown }
		| null
	const semanticTitle = asNonEmptyString(semanticSearchState?.title)
	const semanticDescription = asNonEmptyString(semanticSearchState?.description)

	const videoTitle =
		(selectedVideoId ? semanticTitle : null) ??
		(selectedVideoId ? `YouTube video ${selectedVideoId}` : null)
	const shareUrl = `${requestInfo.origin}${location.pathname}${location.search}`
	const shareText = selectedVideoId
		? startSeconds
			? `Check out "${videoTitle ?? `YouTube video ${selectedVideoId}`}" at ${formatTimestamp(
					startSeconds,
				)}`
			: `Check out "${videoTitle ?? `YouTube video ${selectedVideoId}`}"`
		: `Check out Kent C. Dodds on YouTube`

	return (
		<Grid as="main" className="mb-24 lg:mb-48">
			<div className="col-span-full space-y-4">
				{selectedVideoId ? (
					<>
						<div className="overflow-hidden rounded-lg bg-black">
							<LiteYouTubeEmbed
								id={selectedVideoId}
								title={videoTitle ?? `YouTube video ${selectedVideoId}`}
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

						<div className="space-y-3">
							<H3 className="break-words">
								<a
									href={`https://www.youtube.com/watch?${new URLSearchParams({
										v: selectedVideoId,
										...(startSeconds ? { t: String(startSeconds) } : {}),
									}).toString()}`}
									target="_blank"
									rel="noreferrer noopener"
									className="hover:text-team-current focus:text-team-current transition focus:outline-none"
								>
									{videoTitle ?? `YouTube video ${selectedVideoId}`}
								</a>
							</H3>
							{semanticDescription ? (
								<Paragraph prose={false} className="line-clamp-4">
									{semanticDescription}
								</Paragraph>
							) : null}

							{startSeconds ? (
								<Paragraph prose={false} textColorClassName="text-secondary">
									{`Starting at ${formatTimestamp(startSeconds)}.`}
								</Paragraph>
							) : null}

							<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
								<FavoriteToggle
									contentType="youtube-video"
									contentId={selectedVideoId}
									label="Favorite video"
								/>
								<IconLink
									className="flex items-center gap-2"
									target="_blank"
									rel="noreferrer noopener"
									href={`https://x.com/intent/post?${new URLSearchParams({
										url: shareUrl,
										text: shareText,
									}).toString()}`}
								>
									<XIcon title="Share on 𝕏" />
									<span>Share on 𝕏</span>
								</IconLink>
							</div>
						</div>
					</>
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
