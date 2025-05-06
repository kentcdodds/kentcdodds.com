import { clsx } from 'clsx'
import { getImgProps, type ImageBuilder } from '#app/images.tsx'
import { Themed } from '#app/utils/theme.tsx'
import { ArrowIcon } from './icons.tsx'

export type CourseCardProps = {
	title: string
	description: string
	courseUrl: string
	horizontal?: boolean
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

const titleClassName =
	'text-xl/7 font-semibold text-balance tracking-tight text-gray-800 @sm:text-2xl/7 @2xl/grid:text-xl/7 @3xl/grid:text-2xl/7 @6xl/grid:text-3xl/9 dark:font-medium dark:tracking-normal dark:text-gray-200'
const descriptionClassName =
	'mt-2 text-balance text-base/6 text-gray-500 dark:prose-dark @6xl/grid:text-lg/6'

export function CourseCard({
	title,
	description,
	imageBuilder,
	darkImageBuilder,
	lightImageBuilder,
	courseUrl,
	label,
	horizontal = false,
}: CourseCardProps) {
	function getImg(builder: ImageBuilder) {
		return (
			<img
				loading="lazy"
				{...getImgProps(builder, {
					className: clsx('z-10 h-[70%] w-auto'),
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
				'course-card-gradient dark:bg-gray-850 relative flex h-full gap-5 overflow-hidden rounded-2xl bg-gray-100 p-6 ring-1 ring-inset ring-[rgba(0,0,0,0.05)] @sm:gap-6 @sm:p-9 @2xl/grid:gap-6 @2xl/grid:p-9 @6xl/grid:p-12 dark:ring-[rgba(255,255,255,0.05)]',
				horizontal ? 'flex-col @2xl:flex-row' : 'flex-col',
			)}
		>
			<div
				className={clsx(
					'relative',
					horizontal && 'w-full @2xl:order-last @2xl:w-[62%]',
				)}
			>
				<div className="absolute right-0 top-0 hidden origin-bottom-right -translate-y-full translate-x-5 -rotate-90 text-right font-mono text-[11px]/none uppercase tracking-widest text-gray-400 opacity-80 @sm:block @2xl/grid:block @6xl/grid:translate-x-6 @6xl/grid:text-xs/none dark:text-slate-500 dark:opacity-60">
					{label ?? `${title} course`}
				</div>
				<div
					className={clsx(
						'dark:border-gray-950 flex aspect-4/3 items-center justify-center rounded-xl border border-gray-300 dark:border-black',
						horizontal && '@2xl:aspect-[11/6]',
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
							horizontal && '@2xl:block',
						)}
					>
						<path
							d="M0 40H440M0 80H440M0 120H440M0 160H440M0 200H440M40 0V240M80 0V240M120 0V240M160 0V240M200 0V240M240 0V240M280 0V240M320 0V240M360 0V240M400 0V240"
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
							horizontal && '@2xl:hidden',
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
					'flex flex-1 items-start gap-2 @xs:gap-4 @sm:gap-8',
					horizontal && '@sm:gap-1 @2xl:flex-col',
				)}
			>
				<div className="flex-1">
					<h2 className={titleClassName}>{title}</h2>
					<p className={descriptionClassName}>{description}</p>
				</div>
				<a
					className={clsx(
						'course-card-button-gradient inline-flex h-11 w-11 shrink-0 translate-x-0.5 translate-y-0.5 items-center justify-center gap-0.5 self-end rounded-full border border-gray-300 bg-gray-100 text-gray-900 transition-all duration-200 hover:scale-105 hover:border-gray-300 hover:bg-white @lg:h-12 @lg:w-auto @lg:pl-6 @lg:pr-4 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-transparent dark:hover:bg-gray-300 dark:hover:text-gray-900',
						horizontal && '@2xl:self-auto',
					)}
					href={courseUrl}
				>
					<span
						className={clsx(
							'sr-only shrink-0 -translate-y-px whitespace-nowrap text-base @lg:not-sr-only @6xl/grid:text-lg',
						)}
					>
						Visit course
					</span>
					<ArrowIcon direction="top-right" className="shrink-0" size={24} />
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
		<div className="course-card-gradient dark:bg-gray-850 relative col-span-full flex flex-col items-start overflow-hidden rounded-2xl bg-gray-100 p-6 ring-1 ring-inset ring-[rgba(0,0,0,0.05)] @sm:p-9 @2xl/grid:col-span-6 @2xl/grid:p-9 @6xl/grid:p-12 dark:ring-[rgba(255,255,255,0.05)] [&:nth-child(3n-2)]:col-span-12">
			{imageBuilder ? (
				getImg(imageBuilder)
			) : (
				<Themed
					light={getImg(lightImageBuilder)}
					dark={getImg(darkImageBuilder)}
				/>
			)}

			<h2 className={clsx(titleClassName, 'mt-12 pr-10')}>{title}</h2>
			<p className={clsx(descriptionClassName, 'mb-6 mt-2 max-w-[700px]')}>
				{description}
			</p>

			<a
				className="course-card-button-gradient mt-auto inline-flex h-12 shrink-0 -translate-x-0.5 items-center justify-center gap-0.5 rounded-full border border-gray-300 bg-gray-100 pl-6 pr-4 text-gray-900 transition-all duration-200 hover:scale-105 hover:border-gray-300 hover:bg-white @lg:w-auto dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-transparent dark:hover:bg-gray-300 dark:hover:text-gray-900"
				href={courseUrl}
			>
				<span className="shrink-0 -translate-y-px whitespace-nowrap text-base @6xl/grid:text-lg">
					Visit course
				</span>

				<ArrowIcon direction="top-right" className="shrink-0" size={24} />
			</a>
		</div>
	)
}
