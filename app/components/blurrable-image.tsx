import { clsx } from 'clsx'
import * as React from 'react'

const isServer = typeof document === 'undefined'
const useIsomorphicLayoutEffect = isServer
	? React.useEffect
	: React.useLayoutEffect

function BlurrableImage({
	img,
	blurDataUrl,
	...rest
}: {
	img: React.ReactElement<React.ComponentProps<'img'>>
	blurDataUrl?: string
} & React.HTMLAttributes<HTMLDivElement>) {
	const id = React.useId()
	const [visible, setVisible] = React.useState(false)
	const jsImgElRef = React.useRef<HTMLImageElement>(null)

	useIsomorphicLayoutEffect(() => {
		const imageEl = jsImgElRef.current
		if (!imageEl) return

		// On the client, the image might have already loaded before hydration,
		// which removes the opacity class via the server-rendered onload handler.
		if (imageEl.complete || !imageEl.classList.contains('opacity-0')) {
			setVisible(true)
		}
	}, [])

	React.useEffect(() => {
		const imageEl = jsImgElRef.current
		if (!imageEl) return
		if (imageEl.complete) {
			setVisible(true)
			return
		}

		let current = true
		const handleLoad = () => {
			if (!jsImgElRef.current || !current) return
			setTimeout(() => {
				setVisible(true)
			}, 0)
		}
		imageEl.addEventListener('load', handleLoad)

		return () => {
			current = false
			imageEl.removeEventListener('load', handleLoad)
		}
	}, [])

	const jsImgEl = React.cloneElement(img, {
		ref: jsImgElRef,
		id,

		// React doesn't like the extra onload prop the server's going to send,
		// but it also doesn't like an onload prop and recommends onLoad instead.
		// but we want to use the onload prop because it's a bit more performant
		// and as a result it's possible the user will never see the blurred image
		// at all which would be great. So we suppress the warning here and we use
		// this funny data-evt-prefixed attribute which our server renderer will
		// remove for us (check entry.server).
		suppressHydrationWarning: true,
		// @ts-expect-error this is a funny thing we do...
		'data-evt-onload': isServer
			? "this.classList.remove('opacity-0')"
			: undefined,
		className: clsx(
			'absolute h-full w-full',
			img.props.className,
			'transition-opacity',
			{
				'opacity-0': !visible,
			},
		),
	})

	return (
		<div {...rest} className={clsx('relative', rest.className)}>
			{blurDataUrl ? (
				<>
					<img
						key={blurDataUrl}
						src={blurDataUrl}
						className={clsx('absolute h-full w-full', img.props.className)}
						alt={img.props.alt}
					/>
					<div
						className={clsx(
							'absolute h-full w-full',
							img.props.className,
							'backdrop-blur-xl',
						)}
					/>
				</>
			) : null}
			{jsImgEl}
			<noscript className="absolute z-10 h-full w-full">{img}</noscript>
		</div>
	)
}

export { BlurrableImage }
