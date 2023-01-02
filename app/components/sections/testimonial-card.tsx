import {getImageBuilder, getImgProps} from '~/images'
import type {Testimonial} from '~/utils/testimonials.server'

export function TestimonialCard({
  testimonial,
  className = '',
}: {
  testimonial: Testimonial
  className?: string
}) {
  const img = (
    <img
      className={`mr-8 h-16 w-16 flex-none rounded-full object-cover ${className}`}
      {...getImgProps(
        getImageBuilder(
          testimonial.cloudinaryId,
          `${testimonial.author} profile`,
        ),
        {
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
    <div className="bg-secondary col-span-4 mb-8 flex flex-col justify-between rounded-lg p-16 lg:mb-0">
      <p className="text-primary mb-14 text-base">
        “{testimonial.testimonial}”
      </p>
      <div className="flex items-center">
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
