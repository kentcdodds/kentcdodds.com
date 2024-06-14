import { type TransformerOption } from '@cld-apis/types'
import { clsx } from 'clsx'
import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion'
import { ArrowLink } from '../arrow-button.tsx'
import { Grid } from '../grid.tsx'
import { H2 } from '../typography.tsx'
import { getImgProps, type ImageBuilder } from '~/images.tsx'
import { heroTextAnimation } from '~/utils/animations.ts'

export type HeroSectionProps = {
	title: string | React.ReactNode
	subtitle?: string | React.ReactNode
	action?: React.ReactNode
	as?: React.ElementType
} & (
	| {
			imageProps?: HTMLMotionProps<'img'> & { className?: string }
			imageSize?: 'medium' | 'large' | 'giant'
			image?: never
			imageBuilder?: never
			imageTransformations?: never
	  }
	| {
			imageProps?: never
			imageSize?: never
			image?: never
			imageBuilder?: never
			imageTransformations?: never
	  }
	| {
			imageProps?: never
			imageSize?: 'medium' | 'large' | 'giant'
			image: React.ReactNode
			imageBuilder?: never
			imageTransformations?: never
	  }
	| {
			imageProps?: never
			imageSize?: 'medium' | 'large' | 'giant'
			image?: never
			imageBuilder: ImageBuilder
			imageTransformations?: TransformerOption
	  }
) &
	(
		| {
				arrowUrl: string
				arrowLabel: string
		  }
		| {
				arrowUrl?: never
				arrowLabel?: never
		  }
	)

function HeroSection({
	action,
	title,
	subtitle,
	arrowUrl,
	arrowLabel,
	image,
	imageProps,
	imageBuilder,
	imageSize = 'medium',
	as = 'header',
}: HeroSectionProps) {
	const hasImage = Boolean(image ?? imageProps ?? imageBuilder)
	const shouldReduceMotion = useReducedMotion()
	let animationStep = 0
	return (
		<Grid
			as={as}
			className={clsx('lg: mb-24 h-auto pt-24 lg:min-h-[40rem] lg:pb-12', {
				'lg:mb-64': arrowLabel,
				'lg:mb-0': !arrowLabel,
			})}
		>
			{hasImage ? (
				<div
					className={clsx('col-span-full mb-12 lg:mb-0', {
						'px-10 lg:col-span-5 lg:col-start-7': imageSize === 'medium',
						'flex items-start justify-end pl-10 lg:col-span-6 lg:col-start-6':
							imageSize === 'large',
						'flex items-center justify-center lg:col-span-7 lg:col-start-6 lg:-mr-5vw lg:-mt-24 lg:px-0':
							imageSize === 'giant',
					})}
				>
					{imageProps ? (
						<motion.img
							{...imageProps}
							// @ts-expect-error framer-motion + latest typescript types has issues
							className={clsx(
								'h-auto w-full object-contain',
								{
									'max-h-50vh': imageSize === 'medium',
									'max-h-75vh': imageSize === 'giant',
								},
								imageProps.className,
							)}
							initial={{ scale: shouldReduceMotion ? 1 : 1.5, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							transition={{ duration: 0.75 }}
						/>
					) : imageBuilder ? (
						<img
							{...getHeroImageProps(imageBuilder, {
								className: clsx(
									'h-auto w-full object-contain motion-safe:animate-hero-image-reveal',
									{
										'max-h-50vh': imageSize === 'medium',
										'max-h-75vh': imageSize === 'giant',
									},
								),
							})}
						/>
					) : (
						image
					)}
				</div>
			) : null}

			<div
				className={clsx(
					'col-span-full pt-6 lg:col-start-1 lg:row-start-1 lg:flex lg:h-full lg:flex-col',
					{
						'lg:col-span-5': hasImage,
						'lg:col-span-7': !hasImage,
					},
				)}
			>
				<div className="flex flex-auto flex-col">
					<H2
						as="h2"
						className="motion-safe:animate-hero-text-reveal"
						style={heroTextAnimation.getVariables(animationStep++)}
					>
						{title}
					</H2>
					{subtitle ? (
						<H2
							as="p"
							variant="secondary"
							className="mt-3 motion-safe:animate-hero-text-reveal"
							style={heroTextAnimation.getVariables(animationStep++)}
						>
							{subtitle}
						</H2>
					) : null}
					{action ? (
						<div
							className="mt-14 flex flex-col space-y-4 motion-safe:animate-hero-text-reveal"
							style={heroTextAnimation.getVariables(animationStep++)}
						>
							{action}
						</div>
					) : null}
				</div>
				{arrowUrl ? (
					<div
						className="hidden pt-12 motion-safe:animate-hero-text-reveal lg:block"
						style={heroTextAnimation.getVariables(animationStep++)}
					>
						<ArrowLink to={arrowUrl} direction="down" textSize="small">
							{arrowLabel}
						</ArrowLink>
					</div>
				) : null}
			</div>
		</Grid>
	)
}

function getHeroImageProps(
	imageBuilder: ImageBuilder,
	{
		transformations,
		style,
		className,
	}: {
		transformations?: TransformerOption
		style?: React.CSSProperties
		className?: string
	} = {},
) {
	return getImgProps(imageBuilder, {
		style,
		className,
		widths: [256, 550, 700, 900, 1300, 1800],
		sizes: [
			'(max-width: 1023px) 80vw',
			'(min-width: 1024px) and (max-width: 1279px) 50vw',
			'(min-width: 1280px) 900px',
		],
		transformations,
	})
}

export { HeroSection, getHeroImageProps }
