import {CloudinaryVideo} from './cloudinary-video'

type CloudinaryVideoProps = Parameters<typeof CloudinaryVideo>[0]

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
