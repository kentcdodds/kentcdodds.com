import {
	data as json,
	type LinksFunction,
	type MetaFunction,
	useLoaderData,
	useSearchParams,
} from 'react-router'
import {
	LiteYouTubeEmbed,
	links as youTubeEmbedLinks,
} from '#app/components/fullscreen-yt-embed.tsx'
import { Grid } from '#app/components/grid.tsx'
import { HeroSection } from '#app/components/sections/hero-section.tsx'
import { Paragraph } from '#app/components/typography.tsx'
import { images } from '#app/images.tsx'

const DEFAULT_PLAYLIST_ID = 'PLV5CVI1eNcJgNqzNwcs4UKrlJdhfDjshf'

function parseVideoId(value: string | null) {
	if (!value) return null
	return /^[A-Za-z0-9_-]{11}$/.test(value) ? value : null
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
	const playlistInput =
		process.env.YOUTUBE_PLAYLIST_URL ?? process.env.YOUTUBE_PLAYLIST_ID
	const configuredPlaylistId =
		parsePlaylistId(playlistInput) ?? DEFAULT_PLAYLIST_ID
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

export default function YouTubePage() {
	const { playlistId } = useLoaderData<typeof loader>()
	const [searchParams] = useSearchParams()
	const selectedVideoId = parseVideoId(searchParams.get('video'))
	const playlistUrl = `https://www.youtube.com/playlist?list=${encodeURIComponent(
		playlistId,
	)}`
	const playlistEmbedUrl = `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(
		playlistId,
	)}`

	return (
		<>
			<HeroSection
				title="Watch YouTube videos here."
				subtitle="Use semantic search to jump straight to a specific video."
				imageBuilder={images.microphoneWithHands}
			/>

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
		</>
	)
}
