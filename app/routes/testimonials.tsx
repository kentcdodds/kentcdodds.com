import type {DataFunctionArgs, MetaFunction} from '@remix-run/node'
import {json} from '@remix-run/node'
import {useLoaderData} from '@remix-run/react'
import {ButtonLink} from '~/components/button'
import {Grid} from '~/components/grid'
import {
  getHeroImageProps,
  HeroSection,
} from '~/components/sections/hero-section'
import {TestimonialCard} from '~/components/sections/testimonial-card'
import {getGenericSocialImage, images} from '~/images'
import {getDisplayUrl, getUrl} from '~/utils/misc'
import {getSocialMetas} from '~/utils/seo'
import {getTestimonials} from '~/utils/testimonials.server'
import {getServerTimeHeader} from '~/utils/timing.server'
import type {LoaderData as RootLoaderData} from '../root'

export const meta: MetaFunction<typeof loader> = ({data, parentsData}) => {
  const {testimonials} = data
  const {requestInfo} = parentsData.root as RootLoaderData
  const testimonialCount = testimonials.length
  const title = `${testimonialCount} testimonials about Kent C. Dodds`
  return {
    ...getSocialMetas({
      origin: requestInfo.origin,
      title,
      description: `Check out ${testimonialCount} testimonials about Kent C. Dodds and how the things he's done has helped people in their goals.`,
      url: getUrl(requestInfo),
      image: getGenericSocialImage({
        origin: requestInfo.origin,
        url: getDisplayUrl(requestInfo),
        featuredImage: images.kentHoldingOutCody.id,
        words: title,
      }),
    }),
  }
}

export async function loader({request}: DataFunctionArgs) {
  const timings = {}
  const headers = {
    'Cache-Control': 'private, max-age=3600',
    'Server-Timings': getServerTimeHeader(timings),
  }

  return json(
    {testimonials: await getTestimonials({request, timings})},
    {headers},
  )
}

export default function Testimonials() {
  const data = useLoaderData<typeof loader>()

  return (
    <>
      <HeroSection
        title="Curious to read what people are saying?"
        subtitle="Checkout KCD testimonials below."
        image={
          <img
            className="rounded-lg"
            {...getHeroImageProps(images.kentHoldingOutCody, {
              resize: {
                aspectRatio: '3:4',
                type: 'crop',
              },
              gravity: 'face',
            })}
          />
        }
        arrowUrl="#list"
        arrowLabel="Start reading..."
        action={
          <ButtonLink
            variant="primary"
            to="https://kcd.im/testimonial"
            className="mr-auto"
          >
            Submit your own
          </ButtonLink>
        }
      />

      <Grid className="mb-14 gap-6" id="list">
        {data.testimonials.map(testimonial => (
          <TestimonialCard
            key={testimonial.testimonial}
            testimonial={testimonial}
          />
        ))}
      </Grid>
    </>
  )
}
