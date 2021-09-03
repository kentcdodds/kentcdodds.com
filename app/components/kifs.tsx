import * as React from 'react'

type CloudinaryVideoProps = {
  className?: string
  width?: number
  aspectRatio?: '16:9' | '4:3' | '3:4'
  cloudinaryId: string
}

function CloudinaryVideo({
  className,
  width = 1000,
  aspectRatio,
  cloudinaryId,
}: CloudinaryVideoProps) {
  const transforms = [
    `f_auto`,
    `q_auto`,
    `c_fill`,
    `ac_none`,
    ...(aspectRatio ? [`ar_${aspectRatio}`, 'c_fill'] : []),
    `w_${width}`,
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
    />
  )
}

function MissingSomething(props: Omit<CloudinaryVideoProps, 'cloudinaryId'>) {
  return (
    <CloudinaryVideo cloudinaryId="kentcdodds.com/misc/where_am_i" {...props} />
  )
}

function Grimmacing(props: Omit<CloudinaryVideoProps, 'cloudinaryId'>) {
  return (
    <CloudinaryVideo cloudinaryId="kentcdodds.com/misc/grimmace" {...props} />
  )
}

export {MissingSomething, Grimmacing, CloudinaryVideo}
