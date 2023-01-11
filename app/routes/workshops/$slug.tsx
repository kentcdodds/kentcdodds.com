import * as React from 'react'
import type {
  HeadersFunction,
  LoaderFunction,
  MetaFunction,
} from '@remix-run/node'
import {json} from '@remix-run/node'
import {Link, useCatch, useLoaderData, useParams} from '@remix-run/react'
import type {KCDHandle, MdxListItem, Workshop} from '~/types'
import {Grid} from '~/components/grid'
import {H2, H5, H6, Paragraph} from '~/components/typography'
import {ButtonLink} from '~/components/button'
import {ArrowLink, BackLink} from '~/components/arrow-button'
import {WorkshopCard} from '~/components/workshop-card'
import {NumberedPanel} from '~/components/numbered-panel'
import {Spacer} from '~/components/spacer'
import {TestimonialSection} from '~/components/sections/testimonial-section'
import {FourOhFour} from '~/components/errors'
import {getBlogRecommendations} from '~/utils/blog.server'
import {getWorkshops} from '~/utils/workshops.server'
import {useWorkshopsData} from '../workshops'
import {ConvertKitForm} from '../../convertkit/form'
import {getTestimonials} from '~/utils/testimonials.server'
import type {
  Testimonial,
  TestimonialSubject,
  TestimonialCategory,
} from '~/utils/testimonials.server'
import {
  getDisplayUrl,
  getUrl,
  listify,
  reuseUsefulLoaderHeaders,
} from '~/utils/misc'
import {RegistrationPanel} from '~/components/workshop-registration-panel'
import type {LoaderData as RootLoaderData} from '../../root'
import {getSocialMetas} from '~/utils/seo'
import {getSocialImageWithPreTitle} from '~/images'
import type {WorkshopEvent} from '~/utils/workshop-tickets.server'
import {getServerTimeHeader} from '~/utils/timing.server'

export const handle: KCDHandle = {
  getSitemapEntries: async request => {
    const workshops = await getWorkshops({request})
    return workshops.map(workshop => {
      return {
        route: `/workshops/${workshop.slug}`,
        priority: 0.4,
      }
    })
  },
}

type LoaderData = {
  testimonials: Array<Testimonial>
  blogRecommendations: Array<MdxListItem>
}

export const loader: LoaderFunction = async ({params, request}) => {
  if (!params.slug) {
    throw new Error('params.slug is not defined')
  }
  const timings = {}
  const [workshops, blogRecommendations] = await Promise.all([
    getWorkshops({request, timings}),
    getBlogRecommendations({request, timings}),
  ])
  const workshop = workshops.find(w => w.slug === params.slug)

  if (!workshop) {
    throw json({blogRecommendations}, {status: 404})
  }

  const testimonials = await getTestimonials({
    request,
    timings,
    subjects: [`workshop: ${params.slug}` as TestimonialSubject],
    categories: [
      'workshop',
      ...(workshop.categories as Array<TestimonialCategory>),
    ],
  })
  const data: LoaderData = {
    testimonials,
    blogRecommendations,
  }
  const headers = {
    'Cache-Control': 'private, max-age=3600',
    Vary: 'Cookie',
    'Server-Timings': getServerTimeHeader(timings),
  }

  return json(data, {status: 200, headers})
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export const meta: MetaFunction = ({parentsData, params}) => {
  const {requestInfo} = parentsData.root as RootLoaderData

  let workshop: Workshop | undefined
  const workshopsData = parentsData['routes/workshops']
  if (Array.isArray(workshopsData?.workshops)) {
    workshop = workshopsData?.workshops.find(
      (w: {slug?: string}) => w.slug === params.slug,
    )
  }

  return {
    ...getSocialMetas({
      title: workshop ? workshop.title : 'Workshop not found',
      description: workshop ? workshop.description : 'No workshop here :(',
      ...workshop?.meta,
      keywords:
        workshop?.meta.keywords?.join(',') ??
        workshop?.categories.join(',') ??
        '',
      url: getUrl(requestInfo),
      image: getSocialImageWithPreTitle({
        url: getDisplayUrl(requestInfo),
        featuredImage: 'kent/kent-workshopping-at-underbelly',
        preTitle: 'Check out this workshop',
        title: workshop ? workshop.title : 'Workshop not found',
      }),
    }),
  }
}

interface TopicRowProps {
  number: number
  topicHTML: string
}

function TopicRow({number, topicHTML}: TopicRowProps) {
  return (
    <div className="bg-secondary rounded-lg px-10 pb-14 pt-12 lg:py-12 lg:pl-36 lg:pr-56">
      <H5 className="relative">
        <span className="lg:absolute lg:-left-24 lg:block">
          {number.toString().padStart(2, '0')}.
        </span>{' '}
        <div dangerouslySetInnerHTML={{__html: topicHTML}} />
      </H5>
    </div>
  )
}

function restartArray<ArrayType>(array: Array<ArrayType>, startIndex: number) {
  const newArray: typeof array = []
  for (let i = 0; i < array.length; i++) {
    const value = array[(i + startIndex) % array.length]
    if (value === undefined) {
      console.error('This is unusual...', value, i, array)
      continue
    }
    newArray.push(value)
  }
  return newArray
}

export default function WorkshopScreen() {
  const params = useParams()
  const {workshopEvents: titoEvents, workshops} = useWorkshopsData()
  const data = useLoaderData<LoaderData>()
  const workshop = workshops.find(w => w.slug === params.slug)

  if (!workshop) {
    console.error(
      `This should be impossible. There's no workshop even though we rendered the workshop screen...`,
    )
    return <div>Oh no... Email Kent</div>
  }

  const workshopEvents: Array<Workshop['events'][number] | WorkshopEvent> = [
    ...workshop.events,
    ...titoEvents.filter(e => e.metadata.workshopSlug === params.slug),
  ]
  // restartArray allows us to make sure that the same workshops don't always appear in the list
  // without having to do something complicated to get a deterministic selection between server/client.
  const otherWorkshops = restartArray(
    workshops.filter(w => w.slug !== workshop.slug),
    workshops.indexOf(workshop),
  )
  const scheduledWorkshops = otherWorkshops.filter(w =>
    titoEvents.some(e => e.metadata.workshopSlug === w.slug),
  )
  const similarWorkshops = otherWorkshops.filter(w =>
    w.categories.some(c => workshop.categories.includes(c)),
  )

  const alternateWorkshops = Array.from(
    new Set([...scheduledWorkshops, ...similarWorkshops, ...otherWorkshops]),
  ).slice(0, 3)

  let registerLink = '#sign-up'
  if (workshopEvents.length === 1 && workshopEvents[0]) {
    registerLink = workshopEvents[0].url
  }

  return (
    <>
      <Grid as="header" className="mb-24 mt-20 lg:mb-80 lg:mt-24">
        <div className="col-span-full lg:col-span-8">
          <BackLink to="/workshops" className="mb-10 lg:mb-24">
            Back to overview
          </BackLink>
          <H2 className="mb-2">{`Join Kent C. Dodds for "${workshop.title}"`}</H2>

          <H6 as="p" className="lg:mb-22 mb-16">
            {workshopEvents.length
              ? listify(workshopEvents.map(w => w.date))
              : 'Not currently scheduled'}
          </H6>

          <div id="sign-up">
            {workshopEvents.length ? (
              workshopEvents.map((workshopEvent, index) => (
                <React.Fragment key={workshopEvent.date}>
                  <RegistrationPanel workshopEvent={workshopEvent} />
                  {index === workshopEvents.length - 1 ? null : (
                    <Spacer size="2xs" />
                  )}
                </React.Fragment>
              ))
            ) : workshop.convertKitTag ? (
              <>
                <H6 as="p" className="mb-0">
                  Sign up to be notified when this workshop is scheduled
                </H6>
                <div className="mt-8">
                  <ConvertKitForm
                    formId="workshop-convert-kit"
                    convertKitTagId={workshop.convertKitTag}
                  />
                </div>
              </>
            ) : null}
          </div>
        </div>
        <div className="col-span-1 col-start-12 hidden items-center justify-center lg:flex">
          <ArrowLink to="#problem" direction="down" />
        </div>
      </Grid>

      <Grid as="main" className="mb-48">
        <div className="col-span-full mb-12 lg:col-span-4 lg:mb-0" id="problem">
          <H6>The problem statement</H6>
        </div>
        <div className="col-span-full mb-8 lg:col-span-8 lg:mb-20">
          <H2
            className="mb-8"
            dangerouslySetInnerHTML={{
              __html: workshop.problemStatementHTMLs.part1,
            }}
          />
          <H2
            variant="secondary"
            as="p"
            dangerouslySetInnerHTML={{
              __html: workshop.problemStatementHTMLs.part2,
            }}
          />
        </div>
        <Paragraph
          className="lg:mb:0 col-span-full mb-4 lg:col-span-4 lg:col-start-5 lg:mr-12"
          dangerouslySetInnerHTML={{
            __html: workshop.problemStatementHTMLs.part3,
          }}
        />
        <Paragraph
          className="col-span-full lg:col-span-4 lg:col-start-9 lg:mr-12"
          dangerouslySetInnerHTML={{
            __html: workshop.problemStatementHTMLs.part4,
          }}
        />
      </Grid>

      <div className="mb-24 w-full px-5vw lg:mb-48">
        <div className="bg-secondary w-full rounded-lg py-24 lg:pb-40 lg:pt-36">
          <div className="-mx-5vw">
            <Grid>
              <div className="col-span-full mb-40 flex flex-col items-stretch lg:col-span-5 lg:mb-0 lg:items-start">
                <H2 className="mb-8">
                  {`At the end of this workshop you'll be able to do all of
                  these things yourself.`}
                </H2>
                <H2 className="mb-16" variant="secondary" as="p">
                  {`Here's why you should register for the workshop.`}
                </H2>
                <ButtonLink href={registerLink}>Register here</ButtonLink>
              </div>

              <div className="col-span-full lg:col-span-5 lg:col-start-8 lg:mr-12">
                {workshop.keyTakeawayHTMLs.length ? (
                  <ol className="space-y-24 lg:space-y-16">
                    {workshop.keyTakeawayHTMLs.map(
                      ({title, description}, index) => (
                        <NumberedPanel
                          key={index}
                          number={index + 1}
                          titleHTML={title}
                          descriptionHTML={description}
                        />
                      ),
                    )}
                  </ol>
                ) : (
                  <Paragraph>Key takeaways coming soon...</Paragraph>
                )}
              </div>
            </Grid>
          </div>
        </div>
      </div>

      <Grid>
        <div className="col-span-8 mb-8 lg:mb-16">
          <H2 className="mb-4 lg:mb-2">The topics we will be covering.</H2>
          <H2 variant="secondary">This is what we will talk about.</H2>
        </div>

        <div className="col-span-full mb-16 flex flex-col items-stretch justify-end lg:col-span-4 lg:items-end lg:justify-center">
          <ButtonLink href={registerLink}>Register here</ButtonLink>
        </div>

        {workshop.topicHTMLs.length ? (
          <ol className="col-span-full space-y-4">
            {workshop.topicHTMLs.map((topicHTML, idx) => (
              <TopicRow key={idx} number={idx + 1} topicHTML={topicHTML} />
            ))}
          </ol>
        ) : (
          <Paragraph className="col-span-full">
            Topic list coming soon...
          </Paragraph>
        )}
      </Grid>

      <Spacer size="xs" />

      <Grid>
        {workshop.prerequisiteHTML ? (
          <>
            <div className="col-span-full lg:col-span-5">
              <H6 className="mb-4">Required experience</H6>
              <Paragraph
                dangerouslySetInnerHTML={{__html: workshop.prerequisiteHTML}}
              />
            </div>
            <div className="col-span-full lg:col-span-2">
              <Spacer size="2xs" />
            </div>
          </>
        ) : null}
        <div className="col-span-full lg:col-span-5">
          <H6 className="mb-4">Important Note</H6>
          <Paragraph>
            {`Depending on the questions asked during the workshop, or necessary changes in the material, the actual content of the workshop could differ from the above mentioned topics.`}
          </Paragraph>
        </div>
        <div className="col-span-full">
          <Spacer size="2xs" />
        </div>
        <div className="col-span-full mt-6">
          <H6 className="mb-4">What to expect from a Kent C. Dodds workshop</H6>
          <div className="flex flex-col gap-2">
            <Paragraph>
              {`
                My primary goal is retention. If you can't remember what I've
                taught you, then the whole experience was a waste of our time.
              `}
            </Paragraph>
            <Paragraph>
              {`
                With that in mind, we'll follow the teaching strategy I've
                developed over years of teaching
              `}
              {`(`}
              <Link to="/blog/how-i-teach">
                learn more about my teaching strategy here
              </Link>
              {`).`}
            </Paragraph>
            <Paragraph>
              {`
                The short version is, you'll spend the majority of time working
                through exercises that are specifically crafted to help you
                experiment with topics you may have never experienced before.
                I intentionally put you into the deep end and let you struggle a
                bit to prepare your brain for the instruction.
              `}
            </Paragraph>
            <Paragraph>
              {`
                Based on both my personal experience and scientific research
                around how people learn, this is an incredibly efficient way to
                ensure you understand and remember what you're learning. This is
                just one of the strategies I employ to improve your retention. I
                think you'll love it!
              `}
            </Paragraph>
            <Paragraph>
              {`I'm excited to be your guide as we learn together!`}
            </Paragraph>
          </div>
        </div>
      </Grid>

      {data.testimonials.length ? (
        <>
          <Spacer size="base" />
          <TestimonialSection testimonials={data.testimonials} />
        </>
      ) : null}

      <Spacer size="base" />

      {workshopEvents.length ? (
        <Grid className="mb-24 lg:mb-64">
          <div className="col-span-full lg:col-span-8 lg:col-start-3">
            <H2 className="mb-6 text-center">
              {`Ready to learn more about ${workshop.title} in this workshop?`}
            </H2>
            <H2 className="mb-20 text-center" variant="secondary">
              {`You can register by using the button below. Can't wait to see you.`}
            </H2>
            {workshopEvents.map((workshopEvent, index) => (
              <React.Fragment key={workshopEvent.date}>
                <RegistrationPanel workshopEvent={workshopEvent} />
                {index === workshopEvents.length - 1 ? null : (
                  <Spacer size="2xs" />
                )}
              </React.Fragment>
            ))}
          </div>
        </Grid>
      ) : null}

      {alternateWorkshops.length ? (
        <Grid>
          <div className="col-span-full mb-16">
            <H2 className="mb-2">Have a look at my other workshops.</H2>

            <H2 variant="secondary" as="p">
              Learn more in these workshops.
            </H2>
          </div>

          {alternateWorkshops.map((altWorkshop, idx) => (
            <div key={idx} className="col-span-full mb-4 md:col-span-4 lg:mb-6">
              <WorkshopCard
                workshop={altWorkshop}
                titoEvents={titoEvents.filter(
                  e => e.metadata.workshopSlug === altWorkshop.slug,
                )}
              />
            </div>
          ))}
        </Grid>
      ) : null}
    </>
  )
}

export function CatchBoundary() {
  const caught = useCatch()
  console.error('CatchBoundary', caught)
  if (caught.status === 404) {
    return <FourOhFour articles={caught.data.blogRecommendations} />
  }
  throw new Error(`Unhandled error: ${caught.status}`)
}
