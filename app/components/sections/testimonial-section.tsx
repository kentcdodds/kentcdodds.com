import clsx from 'clsx'
import * as React from 'react'
import type {Testimonial} from 'types'
import {getImageBuilder, getImgProps} from '../../images'
import {H2, H4} from '../typography'
import {ArrowButton} from '../arrow-button'
import {Grid} from '../grid'

interface TestimonialSectionProps {
  testimonials: Array<Testimonial>
  className?: string
}

function TestimonialSection({
  testimonials,
  className,
}: TestimonialSectionProps) {
  return (
    <Grid className={className}>
      <div className="flex flex-col col-span-full mb-20 space-y-10 lg:flex-row lg:items-end lg:justify-between lg:space-y-0">
        <div className="space-y-2 lg:space-y-0">
          <H2>Don't just take my word for it.</H2>
          <H2 variant="secondary" as="p">
            What participants have to say.
          </H2>
        </div>

        {/* TODO: either connect these button, or add a "testimonial page" and turn this in a "show all testimonials" link */}
        <div className="hidden col-span-2 col-start-11 items-end justify-end mb-16 space-x-3 lg:flex">
          <ArrowButton direction="left" />
          <ArrowButton direction="right" />
        </div>
      </div>

      {testimonials.slice(0, 3).map((testimonial, idx) => (
        <div
          key={idx}
          className={clsx(
            'bg-secondary flex flex-col col-span-4 justify-between mb-8 p-16 rounded-lg lg:mb-0',
            {
              'hidden lg:block': idx >= 2,
            },
          )}
        >
          <H4 as="p" className="mb-24">
            “{testimonial.testimonial}”
          </H4>
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
                },
              )}
            />
            <div>
              <p className="text-primary mb-2 text-xl font-medium leading-none">
                {testimonial.author}
              </p>
              <p className="text-secondary text-xl leading-none">
                {testimonial.company}
              </p>
            </div>
          </div>
        </div>
      ))}
    </Grid>
  )
}

export {TestimonialSection}
