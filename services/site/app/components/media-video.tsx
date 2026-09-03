import { buildMediaUrl } from '#app/utils/media.ts'

type MediaVideoProps = {
	className?: string
	width?: number
	height?: number
	aspectRatio?: `${number}:${number}`
	mediaId: string
}

export function MediaVideo({
	className,
	aspectRatio,
	mediaId,
}: MediaVideoProps) {
	return (
		<video
			className={className}
			autoPlay
			src={buildMediaUrl(mediaId)}
			muted
			loop
			controls={false}
			playsInline
			style={{
				width: '100%',
				...(aspectRatio ? { aspectRatio: aspectRatio.replace(':', '/') } : {}),
			}}
		/>
	)
}
