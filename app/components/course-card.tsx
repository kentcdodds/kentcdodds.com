import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { getImgProps, type ImageBuilder } from '#app/images.tsx'
import { Themed } from '#app/utils/theme.tsx'
import { ArrowLink } from './arrow-button.tsx'
import { ButtonLink } from './button.tsx'
import { ArrowIcon } from './icons.tsx'
import { H2, H3, Paragraph } from './typography.tsx'
import { clsx } from 'clsx'

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
	horizontal?: boolean
	imageClassName?: string
	label?: string
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
	imageClassName,
	label,
	horizontal = false,
}: CourseCardProps) {
	const shouldReduceMotion = useReducedMotion()

	function getImg(builder: ImageBuilder) {
		return (
			<img
				loading="lazy"
				{...getImgProps(builder, {
					className: clsx('z-10 h-[70%] w-auto', imageClassName),
					widths: [152, 304, 456, 608, 760, 940],
					sizes: [
						'(max-width: 375px) 152px',
						'(min-width: 376px) and (max-width: 767px) 304px',
						'470px',
					],
				})}
			/>
		)
	}

	return (
		<div
			className={clsx(
				'flex h-full gap-5 rounded-2xl border border-gray-200 bg-gray-100 p-6 dark:border-gray-700 dark:bg-gray-800 sm:p-9 xl:gap-6 xl:p-12',
				horizontal ? 'flex-col lg:flex-row' : 'flex-col',
			)}
		>
			<div
				className={clsx('relative', horizontal && 'min-w-[64%] lg:order-last')}
			>
				<div className="absolute right-0 top-0 hidden origin-bottom-right -translate-y-full translate-x-5 -rotate-90 text-right font-mono text-[11px]/none uppercase tracking-widest text-gray-400 opacity-80 dark:text-slate-500 dark:opacity-60 sm:block xl:translate-x-6 xl:text-xs/none">
					{label ?? `${title} course`}
				</div>
				<div
					className={clsx(
						'dark:border-gray-950 flex aspect-4/3 items-center justify-center rounded-xl border border-gray-300 dark:border-black',
						horizontal && 'lg:aspect-[11/6]',
					)}
				>
					{imageBuilder ? (
						getImg(imageBuilder)
					) : (
						<Themed
							light={getImg(lightImageBuilder)}
							dark={getImg(darkImageBuilder)}
						/>
					)}

					<svg
						viewBox="0 0 440 240"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						className={clsx(
							'pointer-events-none absolute z-0 hidden h-full w-full text-gray-300 dark:text-black',
							horizontal && 'lg:block',
						)}
					>
						<path
							d="M0 40H440M0 80H440M0 120H440M0 160H440M0 200H440M40 0V240M80 0V240M120 0V240M160 0V160M200 0V160M240 0V160M280 0V160M320 0V240M360 0V240M400 0V240M160 200V240M200 200V240M240 200V240M280 200V240"
							stroke="currentColor"
							strokeWidth="1"
							vectorEffect="non-scaling-stroke"
						/>
					</svg>
					<svg
						viewBox="0 0 320 240"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						className={clsx(
							'pointer-events-none absolute z-0 h-full w-full text-gray-300 dark:text-black',
							horizontal && 'lg:hidden',
						)}
					>
						<path
							d="M0 39.5H320M0 79.5H320M0 119.5H320M0 159.5H320M0 199.5H320M39.5 240L39.5 0M79.5 240L79.5 0M119.5 240L119.5 0M159.5 240V0M199.5 240L199.5 0M239.5 240L239.5 0M279.5 240V0"
							stroke="currentColor"
							strokeWidth="1"
							vectorEffect="non-scaling-stroke"
						/>
					</svg>
				</div>
			</div>

			<div
				className={clsx(
					'flex flex-1 items-start gap-6 sm:gap-8',
					horizontal && 'lg:flex-col',
				)}
			>
				<div className="flex-1">
					<h2 className="text-2xl/6 font-semibold tracking-tight text-gray-800 dark:font-medium dark:text-gray-200 xl:text-3xl/8">
						{title}
					</h2>
					<p className="mt-2 text-balance text-base/[22px] text-gray-500 dark:text-gray-400 xl:text-xl/7">
						{description}
					</p>
				</div>
				<a
					className={clsx(
						'inline-flex h-11 w-11 shrink-0 translate-x-0.5 translate-y-0.5 items-center justify-center gap-0.5 self-end rounded-full border border-gray-300 bg-gray-200 text-gray-900 transition-all duration-200 hover:scale-105 hover:border-gray-300 hover:bg-white dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-transparent dark:hover:bg-gray-300 dark:hover:text-gray-900 xl:h-12 xl:w-auto xl:pl-6 xl:pr-4',
						horizontal && 'lg:w-auto lg:self-auto lg:pl-6 lg:pr-4',
					)}
					href={courseUrl}
				>
					<span
						className={clsx(
							'sr-only -translate-y-px whitespace-nowrap xl:not-sr-only xl:text-lg',
							horizontal && 'lg:not-sr-only',
						)}
					>
						Visit course
					</span>
					<ArrowIcon direction="top-right" size={24} />
				</a>
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
