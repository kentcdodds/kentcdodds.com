import {
	computeCallKentEpisodeArtLayout,
	formatCallKentEpisodeArtTitle,
} from '../call-kent-episode-art-layout.ts'
import { OG_COLORS } from '../constants.ts'
import { stripEmoji } from '../assets.server.ts'

export type CallKentEpisodeArtProps = {
	title: string
	url: string
	name: string
	avatarIsRound: boolean
	background: string
	avatar: string
	mic: string
	size?: number
}

export function CallKentEpisodeArt({
	title,
	url,
	name,
	avatarIsRound,
	background,
	avatar,
	mic,
	size = 1400,
}: CallKentEpisodeArtProps) {
	const layout = computeCallKentEpisodeArtLayout(size, title)
	const displayTitle = formatCallKentEpisodeArtTitle(title)

	return (
		<div
			style={{
				width: size,
				height: size,
				display: 'flex',
				position: 'relative',
				backgroundColor: '#1f2028',
				fontFamily: 'Matter',
			}}
		>
			<img
				src={background}
				alt=""
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					width: size,
					height: size,
					objectFit: 'cover',
				}}
			/>
			<div
				style={{
					position: 'absolute',
					left: layout.title.left,
					top: layout.title.top,
					width: layout.title.width,
					height: layout.title.height,
					display: '-webkit-box',
					WebkitBoxOrient: 'vertical',
					WebkitLineClamp: 3,
					overflow: 'hidden',
					color: OG_COLORS.white,
					fontSize: layout.title.fontSize,
					fontWeight: 500,
					lineHeight: 1.1,
				}}
			>
				{displayTitle}
			</div>
			<img
				src={avatar}
				alt=""
				style={{
					position: 'absolute',
					top: layout.avatar.top,
					left: layout.avatar.left,
					width: layout.avatar.width,
					height: layout.avatar.height,
					borderRadius: avatarIsRound ? layout.avatar.width / 2 : 0,
					objectFit: 'cover',
				}}
			/>
			<div
				style={{
					position: 'absolute',
					left: layout.name.left,
					bottom: layout.name.bottom,
					width: layout.name.width,
					height: layout.name.height,
					display: 'flex',
					alignItems: 'flex-end',
					color: OG_COLORS.muted,
					fontSize: layout.name.fontSize,
					fontWeight: 400,
					lineHeight: 1.2,
				}}
			>
				{stripEmoji(name)}
			</div>
			<div
				style={{
					position: 'absolute',
					left: layout.url.left,
					bottom: layout.url.bottom,
					width: layout.url.width,
					height: layout.url.height,
					display: 'flex',
					alignItems: 'flex-end',
					color: OG_COLORS.muted,
					fontSize: layout.url.fontSize,
					fontWeight: 400,
					lineHeight: 1.2,
				}}
			>
				{stripEmoji(url)}
			</div>
			<img
				src={mic}
				alt=""
				style={{
					position: 'absolute',
					top: layout.mic.top,
					right: layout.mic.right,
					width: layout.mic.width,
					height: layout.mic.height,
					objectFit: 'contain',
				}}
			/>
		</div>
	)
}
