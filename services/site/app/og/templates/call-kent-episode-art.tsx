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
}

export function CallKentEpisodeArt({
	title,
	url,
	name,
	avatarIsRound,
	background,
	avatar,
	mic,
}: CallKentEpisodeArtProps) {
	const titleLines = Math.ceil(Math.min(stripEmoji(title).length, 50) / 18)
	const avatarTop = 120 + titleLines * 34

	return (
		<div
			style={{
				width: '100%',
				height: '100%',
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
					width: '100%',
					height: '100%',
					objectFit: 'cover',
				}}
			/>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'space-between',
					width: '100%',
					height: '100%',
					padding: '56px',
					position: 'relative',
					zIndex: 1,
				}}
			>
				<div
					style={{
						color: OG_COLORS.white,
						fontSize: 72,
						fontWeight: 500,
						lineHeight: 1.05,
						maxWidth: '62%',
					}}
				>
					{stripEmoji(title)}
				</div>
				<img
					src={avatar}
					alt=""
					style={{
						position: 'absolute',
						top: avatarTop,
						left: 56,
						width: 360,
						height: 360,
						borderRadius: avatarIsRound ? 999 : 0,
						objectFit: 'cover',
					}}
				/>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
					<div
						style={{
							color: OG_COLORS.muted,
							fontSize: 34,
							lineHeight: 1.2,
						}}
					>
						{stripEmoji(url)}
					</div>
					<div
						style={{
							color: OG_COLORS.muted,
							fontSize: 40,
							lineHeight: 1.2,
						}}
					>
						{stripEmoji(name)}
					</div>
				</div>
			</div>
			<img
				src={mic}
				alt=""
				style={{
					position: 'absolute',
					right: 56,
					top: '50%',
					transform: 'translateY(-50%)',
					width: 420,
					height: 420,
					objectFit: 'contain',
					zIndex: 1,
				}}
			/>
		</div>
	)
}
