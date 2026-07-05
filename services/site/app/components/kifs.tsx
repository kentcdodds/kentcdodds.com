import { CloudinaryVideo } from './media-video.tsx'

type MediaVideoProps = Parameters<typeof CloudinaryVideo>[0]

export function MissingSomething(
	props: Omit<MediaVideoProps, 'cloudinaryId'>,
) {
	return (
		<CloudinaryVideo cloudinaryId="kentcdodds.com/misc/where_am_i" {...props} />
	)
}

export function Grimmacing(props: Omit<MediaVideoProps, 'cloudinaryId'>) {
	return (
		<CloudinaryVideo cloudinaryId="kentcdodds.com/misc/grimmace" {...props} />
	)
}

export function Facepalm(props: Omit<MediaVideoProps, 'cloudinaryId'>) {
	return (
		<CloudinaryVideo cloudinaryId="kentcdodds.com/misc/facepalm" {...props} />
	)
}
