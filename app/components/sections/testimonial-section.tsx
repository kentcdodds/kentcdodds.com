import * as React from 'react'
import type {Testimonial} from '~/utils/testimonials.server'
import {ArrowButton} from '../arrow-button'
import {Grid} from '../grid'
import {H2} from '../typography'
import {TestimonialCard} from './testimonial-card'

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
  if (!testimonials.length) return null

  return (
    <Grid className={className} nested={nested}>
      <div className="col-span-full mb-20 flex flex-col space-y-10 lg:flex-row lg:items-end lg:justify-between lg:space-y-0">
        <div className="space-y-2 lg:space-y-0">
          <H2>{`Don't just take my word for it.`}</H2>
          <H2 variant="secondary" as="p">
            {`What participants have to say.`}
          </H2>
        </div>

        {testimonials.length > 3 ? (
          <div className="col-span-2 col-start-11 mb-16 items-end justify-end space-x-3">
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
          <TestimonialCard
            key={testimonialIndex}
            testimonial={testimonial}
            className={index >= 2 ? 'hidden lg:flex' : ''}
          />
        )
      })}
    </Grid>
  )
}

export {TestimonialSection}
