import clsx from 'clsx'
import * as React from 'react'
import type {Testimonial} from '../../utils/testimonials.server'
import {getImageBuilder, getImgProps} from '../../images'
import {H2} from '../typography'
import {ArrowButton} from '../arrow-button'
import {Grid} from '../grid'

function TestimonialSection({
  testimonials,
  className,
  nested,
}: {
  testimonials: Array<Testimonial>
  className?: string
  nested?: boolean
}) {
  const [page, setPage] = React.useState(0)

  return (
    <Grid className={className} nested={nested}>
      <div className="flex flex-col col-span-full mb-20 space-y-10 lg:flex-row lg:items-end lg:justify-between lg:space-y-0">
        <div className="space-y-2 lg:space-y-0">
          <H2>{`Don't just take my word for it.`}</H2>
          <H2 variant="secondary" as="p">
            {`What participants have to say.`}
          </H2>
        </div>

        {testimonials.length > 3 ? (
          <div className="col-span-2 col-start-11 items-end justify-end mb-16 space-x-3">
            <ArrowButton direction="left" onClick={() => setPage(p => p - 1)} />
            <ArrowButton
              direction="right"
              onClick={() => setPage(p => p + 1)}
            />
          </div>
        ) : null}
      </div>

      {Array.from({
        length: testimonials.length > 3 ? 3 : testimonials.length,
      }).map((_, index) => {
        const testimonialIndex = (page * 3 + index) % testimonials.length
        const testimonial = testimonials[testimonialIndex]
        if (!testimonial) return null
        return (
          <div
            key={testimonialIndex}
            className={clsx(
              'bg-secondary flex flex-col col-span-4 justify-between mb-8 p-16 rounded-lg lg:mb-0',
              {
                'hidden lg:flex': index >= 2,
              },
            )}
          >
            <p className="mb-14 text-base">“{testimonial.testimonial}”</p>
            <div className="flex items-center">
              <img
                className="flex-none mr-8 w-16 h-16 rounded-full object-cover"
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
              <div>
                <p className="text-primary mb-2 text-lg font-medium leading-none">
                  {testimonial.author}
                </p>
                <p className="text-secondary text-sm leading-none">
                  {testimonial.company}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </Grid>
  )
}

export {TestimonialSection}
