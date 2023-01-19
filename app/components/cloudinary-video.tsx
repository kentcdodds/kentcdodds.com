type CloudinaryVideoProps = {
  className?: string
  width?: number
  height?: number
  aspectRatio?: `${number}:${number}`
  crop?: 'fit' | 'fill'
  cloudinaryId: string
}

export function CloudinaryVideo({
  className,
  width = 1000,
  height,
  aspectRatio,
  crop = 'fill',
  cloudinaryId,
}: CloudinaryVideoProps) {
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
      src={`https://res.cloudinary.com/kentcdodds-com/video/upload/${transforms}/${cloudinaryId}`}
      muted
      loop
      controls={false}
      style={{
        width: '100%',
        ...(aspectRatio ? {aspectRatio: aspectRatio.replace(':', '/')} : {}),
      }}
    />
  )
}
