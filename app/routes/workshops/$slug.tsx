import * as React from 'react'
import {useLoaderData, json} from 'remix'
import type {MetaFunction} from 'remix'
import {useParams} from 'react-router-dom'
import type {KCDHandle, KCDLoader, MdxListItem} from 'types'
import {Grid} from '../../components/grid'
import {H2, H5, H6, Paragraph} from '../../components/typography'
import {ButtonLink} from '../../components/button'
import {ArrowButton, ArrowLink, BackLink} from '../../components/arrow-button'
import {WorkshopCard} from '../../components/workshop-card'
import {NumberedPanel} from '../../components/numbered-panel'
import {TestimonialSection} from '../../components/sections/testimonial-section'
import {FourOhFour} from '../../components/errors'
import {getBlogRecommendations} from '../../utils/blog.server'
import type {Timings} from '../../utils/metrics.server'
import {getServerTimeHeader} from '../../utils/metrics.server'
import {getWorkshop, getWorkshops} from '../../utils/workshops.server'
import {useWorkshops} from '../../utils/providers'
import {ConvertKitForm} from '../../convertkit/form'
import {getTestimonials} from '../../utils/testimonials.server'
import type {
  Testimonial,
  TestimonialSubject,
  TestimonialCategory,
} from '../../utils/testimonials.server'

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

export const loader: KCDLoader<{slug: string}> = async ({params, request}) => {
  const timings: Timings = {}
  const workshop = await getWorkshop(params.slug, {request, timings})
  const testimonials = await getTestimonials({
    request,
    subjects: [`workshop: ${params.slug}` as TestimonialSubject],
    categories: [
      'workshop',
      ...((workshop?.categories ?? []) as Array<TestimonialCategory>),
    ],
  })
  const headers = {'Server-Timing': getServerTimeHeader(timings)}

  return json(
    {
      testimonials,
      blogRecommendations: workshop
        ? await getBlogRecommendations(request)
        : [],
    },
    {status: workshop ? 200 : 404, headers},
  )
}

export const meta: MetaFunction = ({parentsData, params}) => {
  let workshop
  const workshopsData = parentsData['routes/workshops']
  if (Array.isArray(workshopsData?.workshops)) {
    workshop = workshopsData?.workshops.find(
      (w: {slug?: string}) => w.slug === params.slug,
    )
  }

  return {
    title: workshop ? workshop.title : 'Workshop not found',
    description: workshop ? workshop.description : 'No workshop here :(',
    ...workshop?.meta,
  }
}

export default function WorkshopScreenBase() {
  const loaderData = useLoaderData<LoaderData>()
  const params = useParams()
  const {workshops} = useWorkshops()
  const workshop = workshops.find(w => w.slug === params.slug)

  if (workshop) {
    return <WorkshopScreen />
  } else {
    return <FourOhFour articles={loaderData.blogRecommendations} />
  }
}

interface TopicRowProps {
  number: number
  topicHTML: string
}

function TopicRow({number, topicHTML}: TopicRowProps) {
  return (
    <div className="bg-secondary pb-14 pt-12 px-10 rounded-lg lg:pl-36 lg:pr-56 lg:py-12">
      <H5 className="relative">
        <span className="lg:absolute lg:-left-24 lg:block">
          {number.toString().padStart(2, '0')}.
        </span>{' '}
        <div dangerouslySetInnerHTML={{__html: topicHTML}} />
      </H5>
    </div>
  )
}

interface RegistrationPanelProps {
  workshop: string
  eventLink: string
  totalSeats: number
  availableSeats: number
}

function RegistrationPanel({
  workshop,
  eventLink,
  availableSeats,
  totalSeats,
}: RegistrationPanelProps) {
  return (
    <div
      id="register"
      className="bg-secondary flex flex-col items-stretch pb-10 pt-12 px-10 w-full rounded-lg lg:flex-row-reverse lg:items-center lg:justify-end lg:py-8"
    >
      <div className="mb-10 lg:mb-0 lg:ml-16">
        <div className="inline-flex items-baseline mb-10 lg:mb-2">
          <div className="block flex-none w-3 h-3 bg-green-600 rounded-full" />
          <H6 as="p" className="pl-4">
            {`${availableSeats} of ${totalSeats} spots left`}
          </H6>
        </div>
        {/* note: this heading doesn't scale on narrow screens */}
        <h5 className="text-black dark:text-white text-2xl font-medium">
          {workshop}
        </h5>
      </div>

      <ButtonLink to={eventLink} className="flex-none">
        Register here
      </ButtonLink>
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

function WorkshopScreen() {
  const params = useParams()
  const {workshopEvents, workshops} = useWorkshops()
  const data = useLoaderData<LoaderData>()
  const workshop = workshops.find(w => w.slug === params.slug)

  if (!workshop) {
    console.error(
      `This should be impossible. There's no workshop even though we rendered the workshop screen...`,
    )
    return <div>Oh no... Email Kent</div>
  }

  const workshopEvent = workshopEvents.find(
    e => e.metadata.workshopSlug === params.slug,
  )

  // restartArray allows us to make sure that the same workshops don't always appear in the list
  // without having to do something complicated to get a deterministic selection between server/client.
  const otherWorkshops = restartArray(
    workshops.filter(w => w.slug !== workshop.slug),
    workshops.indexOf(workshop),
  )
  const scheduledWorkshops = otherWorkshops.filter(w =>
    workshopEvents.find(e => e.metadata.workshopSlug === w.slug),
  )
  const similarWorkshops = otherWorkshops.filter(w =>
    w.categories.some(c => workshop.categories.includes(c)),
  )

  const alternateWorkshops = Array.from(
    new Set([...scheduledWorkshops, ...similarWorkshops, ...otherWorkshops]),
  ).slice(0, 3)

  return (
    <>
      <Grid as="header" className="mb-24 mt-20 lg:mb-80 lg:mt-24">
        <div className="col-span-full lg:col-span-8">
          <BackLink to="/workshops" className="mb-10 lg:mb-24">
            Back to overview
          </BackLink>
          <H2 className="mb-2">{`Join Kent C. Dodds for "${workshop.title}"`}</H2>

          <H6 as="p" className="lg:mb-22 mb-16 lowercase">
            {workshopEvent ? workshopEvent.date : 'Not currently scheduled'}
          </H6>

          {workshopEvent ? (
            <RegistrationPanel
              workshop={workshop.title}
              eventLink={workshopEvent.url}
              totalSeats={workshopEvent.quantity}
              availableSeats={workshopEvent.remaining}
            />
          ) : workshop.convertKitTag ? (
            <div id="sign-up">
              <H6 as="p" className="mb-0">
                Sign up to be notified when this workshop is scheduled
              </H6>
              <ConvertKitForm
                formId="workshop-convert-kit"
                convertKitTagId={workshop.convertKitTag}
              />
            </div>
          ) : null}
        </div>
        <div className="hidden col-span-1 col-start-12 items-center justify-center lg:flex">
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

      <div className="mb-24 px-5vw w-full lg:mb-48">
        <div className="bg-secondary py-24 w-full rounded-lg lg:pb-40 lg:pt-36">
          <div className="-mx-5vw">
            <Grid>
              <div className="flex flex-col col-span-full items-stretch mb-40 lg:col-span-5 lg:items-start lg:mb-0">
                <H2 className="mb-8">
                  At the end of this workshop you'll be able to do all of these
                  things yourself.
                </H2>
                <H2 className="mb-16" variant="secondary" as="p">
                  Here's why you should register for the workshop.
                </H2>
                <ButtonLink to={workshopEvent ? workshopEvent.url : '#sign-up'}>
                  Register here
                </ButtonLink>
              </div>

              <div className="col-span-full lg:col-span-5 lg:col-start-8 lg:mr-12">
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
              </div>
            </Grid>
          </div>
        </div>
      </div>

      <Grid className="mb-48 lg:mb-64">
        <div className="col-span-8 mb-8 lg:mb-16">
          <H2 className="mb-4 lg:mb-2">The topics we will be covering.</H2>
          <H2 variant="secondary">This is what we will talk about.</H2>
        </div>

        <div className="flex flex-col col-span-full items-stretch justify-end mb-16 lg:col-span-4 lg:items-end lg:justify-center">
          <ButtonLink to={workshopEvent ? workshopEvent.url : '#sign-up'}>
            Register here
          </ButtonLink>
        </div>

        <ol className="col-span-full mb-16 space-y-4 lg:mb-20">
          {workshop.topicHTMLs.map((topicHTML, idx) => (
            <TopicRow key={idx} number={idx + 1} topicHTML={topicHTML} />
          ))}
        </ol>

        <div className="col-span-full lg:col-span-5">
          <H6 className="mb-4">Required experience</H6>
          <Paragraph
            dangerouslySetInnerHTML={{__html: workshop.prerequisiteHTML}}
          />
        </div>
      </Grid>

      {data.testimonials.length ? (
        <>
          <TestimonialSection
            testimonials={data.testimonials}
            className="mb-10 lg:mb-64"
          />

          <Grid className="mb-24 lg:hidden">
            <div className="flex col-span-full items-center justify-between">
              <p className="text-black dark:text-white text-2xl">1 — 4</p>
              <div className="flex space-x-3">
                <ArrowButton direction="left" />
                <ArrowButton direction="right" />
              </div>
            </div>
          </Grid>
        </>
      ) : null}

      {workshopEvent ? (
        <Grid className="mb-24 lg:mb-64">
          <div className="col-span-full lg:col-span-8 lg:col-start-3">
            <H2 className="mb-6 text-center">
              {`Ready to learn more about ${workshop.title} in this workshop?`}
            </H2>
            <H2 className="mb-20 text-center" variant="secondary">
              You can register by using the button below. Can't wait to see you.
            </H2>
            <RegistrationPanel
              workshop={workshop.title}
              totalSeats={workshopEvent.quantity}
              availableSeats={workshopEvent.remaining}
              eventLink={workshopEvent.url}
            />
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
                workshopEvent={workshopEvents.find(
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
