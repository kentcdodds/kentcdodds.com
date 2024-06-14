import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { ArrowLink } from './arrow-button.tsx'
import { ButtonLink } from './button.tsx'
import { ArrowIcon } from './icons.tsx'
import { H2, H3, Paragraph } from './typography.tsx'
import { getImgProps, type ImageBuilder } from '~/images.tsx'
import { Themed } from '~/utils/theme.tsx'

const MotionButtonLink = motion(ButtonLink)

const arrowVariants: Variants = {
	initial: { x: 0, y: 0 },
	hover: { x: 8, y: -8 },
	tap: { x: 24, y: -24 },
}
export type CourseCardProps = {
	title: string
	description: string
	courseUrl: string
} & (
	| {
			imageBuilder: ImageBuilder
			lightImageBuilder?: never
			darkImageBuilder?: never
	  }
	| {
			imageBuilder?: never
			lightImageBuilder: ImageBuilder
			darkImageBuilder: ImageBuilder
	  }
)

export function CourseCard({
	title,
	description,
	imageBuilder,
	darkImageBuilder,
	lightImageBuilder,
	courseUrl,
}: CourseCardProps) {
	const shouldReduceMotion = useReducedMotion()

	function getImg(builder: ImageBuilder) {
		return (
			<img
				loading="lazy"
				{...getImgProps(builder, {
					className: 'h-32 object-contain',
					widths: [128, 256, 384],
					sizes: ['8rem'],
				})}
			/>
		)
	}

	return (
		<div className="relative h-full w-full pt-12">
			<div className="relative block h-full w-full rounded-lg bg-gray-100 px-8 pb-10 pt-36 dark:bg-gray-800 md:px-16 md:pb-20">
				<H2 as="h3">{title}</H2>
				<div className="mt-4 max-w-[75%]">
					<H2 variant="secondary" as="p">
						{description}
					</H2>
				</div>

				<div className="mt-16">
					<MotionButtonLink
						initial="initial"
						whileHover="hover"
						whileTap="tap"
						animate="initial"
						href={courseUrl}
						prefetch="intent"
					>
						<span>Visit course</span>
						<motion.span variants={shouldReduceMotion ? {} : arrowVariants}>
							<ArrowIcon direction="top-right" size={24} />
						</motion.span>
					</MotionButtonLink>
				</div>
			</div>

			<div className="absolute left-16 top-0">
				{imageBuilder ? (
					getImg(imageBuilder)
				) : (
					<Themed
						light={getImg(lightImageBuilder)}
						dark={getImg(darkImageBuilder)}
					/>
				)}
			</div>
		</div>
	)
}

export function SmallCourseCard({
	title,
	description,
	imageBuilder,
	lightImageBuilder,
	darkImageBuilder,
	courseUrl,
}: CourseCardProps) {
	function getImg(builder: ImageBuilder) {
		return (
			<img
				loading="lazy"
				{...getImgProps(builder, {
					className: 'h-32 w-auto flex-none object-contain',
					widths: [128, 256, 384],
					sizes: ['8rem'],
				})}
			/>
		)
	}

	return (
		<div className="bg-secondary relative col-span-full mt-12 flex flex-col items-start rounded-lg px-8 py-12 lg:col-span-4 lg:mt-0 lg:px-12">
			{imageBuilder ? (
				getImg(imageBuilder)
			) : (
				<Themed
					light={getImg(lightImageBuilder)}
					dark={getImg(darkImageBuilder)}
				/>
			)}
			<div className="mb-4 flex flex-none items-end">
				<H3>{title}</H3>
			</div>
			<Paragraph className="mb-16 max-w-sm flex-auto">{description}</Paragraph>

			<ArrowLink href={courseUrl} className="flex-none">
				Visit course
			</ArrowLink>
		</div>
	)
}
