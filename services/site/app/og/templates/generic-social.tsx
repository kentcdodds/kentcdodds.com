import { OG_COLORS } from '../constants.ts'
import { stripEmoji } from '../assets.server.ts'

export type GenericSocialProps = {
	words: string
	url: string
	background: string
	kentProfile: string
	featuredImage: string
}

export function GenericSocial({
	words,
	url,
	background,
	kentProfile,
	featuredImage,
}: GenericSocialProps) {
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
					padding: '56px 64px',
					width: '58%',
					height: '100%',
					position: 'relative',
					zIndex: 1,
				}}
			>
				<div
					style={{
						color: OG_COLORS.white,
						fontSize: 64,
						fontWeight: 500,
						lineHeight: 1.05,
					}}
				>
					{stripEmoji(words)}
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
					<img
						src={kentProfile}
						alt=""
						style={{
							width: 112,
							height: 112,
							borderRadius: 999,
							objectFit: 'cover',
						}}
					/>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
						<div
							style={{
								color: OG_COLORS.muted,
								fontSize: 36,
								lineHeight: 1.1,
							}}
						>
							Kent C. Dodds
						</div>
						<div
							style={{
								color: OG_COLORS.muted,
								fontSize: 22,
								lineHeight: 1.2,
							}}
						>
							{stripEmoji(url)}
						</div>
					</div>
				</div>
			</div>
			<div
				style={{
					position: 'absolute',
					top: 0,
					right: 64,
					height: '100%',
					display: 'flex',
					alignItems: 'center',
					zIndex: 1,
				}}
			>
				<img
					src={featuredImage}
					alt=""
					style={{
						width: 420,
						height: 420,
						objectFit: 'contain',
					}}
				/>
			</div>
		</div>
	)
}
