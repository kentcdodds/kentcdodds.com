import { buildMediaUrl } from '#app/utils/media.ts'

type MediaVideoProps = {
	className?: string
	width?: number
	height?: number
	aspectRatio?: `${number}:${number}`
	cloudinaryId: string
}

export function MediaVideo({
	className,
	aspectRatio,
	cloudinaryId,
}: MediaVideoProps) {
	return (
		<video
			className={className}
			autoPlay
			src={buildMediaUrl(cloudinaryId)}
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

/** MDX content contract alias — existing posts use `<CloudinaryVideo>`. */
export const CloudinaryVideo = MediaVideo
