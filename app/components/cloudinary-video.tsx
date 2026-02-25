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
	const transforms = [
		`f_auto:video`,
		`q_auto`,
		`c_${crop}`,
		`ac_none`,
		aspectRatio ? `ar_${aspectRatio}` : null,
		`w_${width}`,
		height ? `h_${height}` : null,
		'fl_keep_dar',
	]
		.filter(Boolean)
		.join(',')
	return (
		<video
			className={className}
			autoPlay
			src={`https://res.cloudinary.com/kentcdodds-com/video/upload/${transforms}/${imageId}`}
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
