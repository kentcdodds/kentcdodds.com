import { MediaVideo } from './media-video.tsx'

type MediaVideoProps = Parameters<typeof MediaVideo>[0]

export function MissingSomething(
	props: Omit<MediaVideoProps, 'imageId'>,
) {
	return (
		<MediaVideo imageId="kentcdodds.com/misc/where_am_i" {...props} />
	)
}

export function Grimmacing(props: Omit<MediaVideoProps, 'imageId'>) {
	return (
		<MediaVideo imageId="kentcdodds.com/misc/grimmace" {...props} />
	)
}

export function Facepalm(props: Omit<MediaVideoProps, 'imageId'>) {
	return (
		<MediaVideo imageId="kentcdodds.com/misc/facepalm" {...props} />
	)
}
