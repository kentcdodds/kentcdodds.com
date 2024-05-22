import { getImageBuilder, getImgProps } from '~/images.tsx'
import { type Testimonial } from '~/utils/testimonials.server.ts'

export function TestimonialCard({
	testimonial,
	className = '',
}: {
	testimonial: Testimonial
	className?: string
}) {
	const img = (
		<img
			{...getImgProps(
				getImageBuilder(
					testimonial.cloudinaryId,
					`${testimonial.author} profile`,
				),
				{
					className: 'mr-8 h-16 w-16 flex-none rounded-full object-cover',
					widths: [64, 128, 256],
					sizes: ['4rem'],
					transformations: {
						gravity: 'face:center',
						resize: {
							aspectRatio: '1:1',
							type: 'fill',
						},
					},
				},
			)}
		/>
	)
	return (
		<div
			className={`bg-secondary col-span-4 flex flex-col justify-between gap-2 rounded-lg p-16 ${className}`}
			id={testimonial.id}
		>
			<div
				className="quote-child prose-base mb-6"
				dangerouslySetInnerHTML={{ __html: testimonial.testimonial }}
			/>

			<div className="flex items-center gap-2">
				{testimonial.link ? (
					<a href={testimonial.link} target="_blank" rel="noreferrer">
						{img}
					</a>
				) : (
					img
				)}
				<div>
					<p className="text-primary mb-2 text-lg font-medium leading-none">
						{testimonial.link ? (
							<a
								className="underline"
								href={testimonial.link}
								target="_blank"
								rel="noreferrer"
							>
								{testimonial.author}
							</a>
						) : (
							testimonial.author
						)}
					</p>
					<p className="text-secondary text-sm leading-none">
						{testimonial.company}
					</p>
				</div>
			</div>
		</div>
	)
}
