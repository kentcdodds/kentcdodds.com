import { getMediaStreamBaseUrl } from '#app/images.tsx'
import { resolveMediaVideoId } from '#app/utils/media-manifest-resolver.ts'

type MediaVideoProps = {
	className?: string
	width?: number
	height?: number
	aspectRatio?: `${number}:${number}`
	crop?: 'fit' | 'fill'
	imageId: string
}

export function MediaVideo({
	className,
	width = 1000,
	height,
	aspectRatio,
	crop = 'fill',
	imageId,
}: MediaVideoProps) {
	const resolvedVideoId = resolveMediaVideoId(imageId)
	const params = new URLSearchParams()
	params.set('width', String(width))
	params.set('fit', crop)
	if (height) params.set('height', String(height))
	if (aspectRatio) params.set('aspectRatio', aspectRatio)
	const filename = /\.[a-z0-9]+$/i.test(resolvedVideoId)
		? resolvedVideoId
		: `${resolvedVideoId}.mp4`
	const sourceUrl = `${getMediaStreamBaseUrl().replace(/\/+$/, '')}/${filename}?${params.toString()}`

	return (
		<video
			className={className}
			autoPlay
			src={sourceUrl}
			muted
			loop
			controls={false}
			style={{
				width: '100%',
				...(aspectRatio ? { aspectRatio: aspectRatio.replace(':', '/') } : {}),
			}}
		/>
	)
}
