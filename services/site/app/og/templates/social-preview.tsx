import { OG_COLORS } from '../constants.ts'
import { stripEmoji } from '../assets.server.ts'

export type SocialPreviewProps = {
	title: string
	preTitle: string
	url: string
	featuredImageStyle?: 'portrait' | 'square'
	background: string
	kentProfile: string
	featuredImage: string
}

export function SocialPreview({
	title,
	preTitle,
	url,
	featuredImageStyle = 'portrait',
	background,
	kentProfile,
	featuredImage,
}: SocialPreviewProps) {
	const titleWidth = featuredImageStyle === 'square' ? '52%' : '58%'
	const featuredWidth = featuredImageStyle === 'square' ? 360 : 320
	const featuredHeight = featuredImageStyle === 'square' ? 360 : 420
	const featuredRadius = featuredImageStyle === 'square' ? 24 : 12

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
					width: titleWidth,
					height: '100%',
					position: 'relative',
					zIndex: 1,
				}}
			>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
					<div
						style={{
							color: OG_COLORS.muted,
							fontSize: 28,
							lineHeight: 1.2,
						}}
					>
						{stripEmoji(preTitle)}
					</div>
					<div
						style={{
							color: OG_COLORS.white,
							fontSize: 64,
							fontWeight: 500,
							lineHeight: 1.05,
						}}
					>
						{stripEmoji(title)}
					</div>
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
						width: featuredWidth,
						height: featuredHeight,
						borderRadius: featuredRadius,
						objectFit: 'cover',
					}}
				/>
			</div>
		</div>
	)
}
