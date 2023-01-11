import type {
  DataFunctionArgs,
  HeadersFunction,
  MetaFunction,
} from '@remix-run/node'
import {json} from '@remix-run/node'
import {useLoaderData} from '@remix-run/react'
import {ArrowLink} from '~/components/arrow-button'
import {ButtonLink} from '~/components/button'
import {Grid} from '~/components/grid'
import {
  getHeroImageProps,
  HeroSection,
} from '~/components/sections/hero-section'
import {TestimonialCard} from '~/components/sections/testimonial-card'
import {Spacer} from '~/components/spacer'
import {H2} from '~/components/typography'
import {getGenericSocialImage, getImgProps, images} from '~/images'
import {getDisplayUrl, getUrl, reuseUsefulLoaderHeaders} from '~/utils/misc'
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
      title,
      description: `Check out ${testimonialCount} testimonials about Kent C. Dodds and how the things he's done has helped people in their goals.`,
      url: getUrl(requestInfo),
      image: getGenericSocialImage({
        url: getDisplayUrl(requestInfo),
        featuredImage: images.kentHoldingOutCody.id,
        words: title,
      }),
    }),
  }
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export async function loader({request}: DataFunctionArgs) {
  const timings = {}

  return json(
    {testimonials: await getTestimonials({request, timings})},
    {
      headers: {
        'Cache-Control': 'private, max-age=3600',
        'Server-Timings': getServerTimeHeader(timings),
      },
    },
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

      <div
        className="mx-10vw mb-14 grid grid-cols-4 gap-6 lg:grid-cols-8 xl:grid-cols-12"
        id="list"
      >
        {data.testimonials.map(testimonial => (
          <TestimonialCard
            key={testimonial.testimonial}
            testimonial={testimonial}
          />
        ))}
      </div>

      <Spacer size="base" />

      <Grid>
        <div className="col-span-1 md:col-span-2 lg:col-span-3">
          <img
            {...getImgProps(images.microphone, {
              widths: [350, 512, 1024, 1536],
              sizes: [
                '20vw',
                '(min-width: 1024px) 30vw',
                '(min-width:1620px) 530px',
              ],
            })}
          />
        </div>

        <div className="col-span-7 col-start-3 md:col-span-6 md:col-start-4 lg:col-span-8 lg:col-start-5">
          <H2 className="mb-8">{`More of a listener?`}</H2>
          <H2 className="mb-16" variant="secondary" as="p">
            {`
              Check out my Call Kent podcast and join in the conversation with your own call.
            `}
          </H2>
          <ArrowLink to="/calls">{`Check out the podcast`}</ArrowLink>
        </div>
      </Grid>
    </>
  )
}
