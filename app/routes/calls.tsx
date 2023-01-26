import * as React from 'react'
import type {
  HeadersFunction,
  LoaderFunction,
  MetaFunction,
} from '@remix-run/node'
import {json} from '@remix-run/node'
import {Link, Outlet, useLoaderData, useMatches} from '@remix-run/react'
import {AnimatePresence, motion, useReducedMotion} from 'framer-motion'
import clsx from 'clsx'
import type {LoaderData as RootLoaderData} from '../root'
import type {Await, CallKentEpisode, KCDHandle} from '~/types'
import {externalLinks} from '~/external-links'
import {getEpisodes} from '~/utils/transistor.server'
import {useMatchLoaderData} from '~/utils/providers'
import {HeroSection} from '~/components/sections/hero-section'
import {
  getGenericSocialImage,
  getImageBuilder,
  getImgProps,
  images,
} from '~/images'
import {ButtonLink} from '~/components/button'
import {Grid} from '~/components/grid'
import {getBlogRecommendations} from '~/utils/blog.server'
import {BlogSection} from '~/components/sections/blog-section'
import {H4, H6, Paragraph} from '~/components/typography'
import {ChevronUpIcon, ChevronDownIcon, TriangleIcon} from '~/components/icons'
import {
  formatDuration,
  getDisplayUrl,
  getUrl,
  reuseUsefulLoaderHeaders,
} from '~/utils/misc'
import type {Params as CallPlayerParams} from '~/utils/call-kent'
import {getEpisodeFromParams, getEpisodePath} from '~/utils/call-kent'
import {PodcastSubs} from '~/components/podcast-subs'
import {Spacer} from '~/components/spacer'
import {getSocialMetas} from '~/utils/seo'
import {getServerTimeHeader} from '~/utils/timing.server'

export const handle: KCDHandle & {id: string} = {
  id: 'calls',
}

export type LoaderData = {
  episodes: Await<ReturnType<typeof getEpisodes>>
  blogRecommendations: Await<ReturnType<typeof getBlogRecommendations>>
}

export const loader: LoaderFunction = async ({request}) => {
  const timings = {}
  const [blogRecommendations, episodes] = await Promise.all([
    getBlogRecommendations({request, timings}),
    getEpisodes({request, timings}),
  ])

  const data: LoaderData = {
    blogRecommendations,
    episodes,
  }
  return json(data, {
    headers: {
      'Cache-Control': 'private, max-age=3600',
      Vary: 'Cookie',
      'Server-Timing': getServerTimeHeader(timings),
    },
  })
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export const meta: MetaFunction = ({parentsData}) => {
  const {requestInfo} = parentsData.root as RootLoaderData
  return {
    ...getSocialMetas({
      title: 'Call Kent Podcast',
      description: `Leave Kent an audio message here, then your message and Kent's response are published in the podcast.`,
      keywords: 'podcast, call kent, call kent c. dodds, the call kent podcast',
      url: getUrl(requestInfo),
      image: getGenericSocialImage({
        words: 'Listen to the Call Kent Podcast and make your own call.',
        featuredImage: images.microphone({
          // if we don't do this resize, the narrow microphone appears on the
          // far right of the social image
          resize: {
            type: 'pad',
            width: 1200,
            height: 1200,
          },
        }),
        url: getDisplayUrl({
          origin: requestInfo.origin,
          path: '/calls',
        }),
      }),
    }),
  }
}

export default function CallHomeScreen() {
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc')
  const shouldReduceMotion = useReducedMotion()

  const data = useLoaderData<LoaderData>()

  const sortedEpisodes =
    sortOrder === 'desc' ? [...data.episodes].reverse() : data.episodes

  const matches = useMatches()
  const callPlayerMatch = matches.find(
    match => (match.handle as KCDHandle | undefined)?.id === 'call-player',
  )
  let selectedEpisode: CallKentEpisode | undefined
  if (callPlayerMatch) {
    const callPlayerParams = callPlayerMatch.params as CallPlayerParams
    selectedEpisode = getEpisodeFromParams(sortedEpisodes, callPlayerParams)
  }
  const initialSelectedEpisode = React.useRef(selectedEpisode)

  // An effect to scroll to the episode's position when opening a direct link,
  // use a ref so that it doesn't hijack scroll when the user is browsing episodes
  React.useEffect(() => {
    if (!initialSelectedEpisode.current) return
    const href = getEpisodePath(initialSelectedEpisode.current)
    document.querySelector(`[href="${href}"]`)?.scrollIntoView()
  }, [])

  // used to automatically prefix numbers with the correct amount of zeros
  let numberLength = sortedEpisodes.length.toString().length
  if (numberLength < 2) numberLength = 2

  return (
    <>
      <HeroSection
        title="Calls with Kent C. Dodds."
        subtitle="You call, I'll answer."
        imageBuilder={images.microphone}
        arrowUrl="#episodes"
        arrowLabel="Take a listen"
        action={
          <ButtonLink variant="primary" to="./record" className="mr-auto">
            Record your call
          </ButtonLink>
        }
      />

      <Grid>
        <H6 as="div" className="col-span-full mb-6">
          Listen to the podcasts here
        </H6>

        <PodcastSubs
          apple={externalLinks.callKentApple}
          google={externalLinks.callKentGoogle}
          spotify={externalLinks.callKentSpotify}
          rss={externalLinks.callKentRSS}
        />
      </Grid>

      <Spacer size="base" />

      <Grid>
        <div className="col-span-full lg:col-span-6">
          <img
            className="w-full rounded-lg object-cover"
            title="Photo by Luke Southern"
            {...getImgProps(
              getImageBuilder(
                'unsplash/photo-1571079570759-8b8800f7c412',
                'Phone sitting on a stool',
              ),
              {
                widths: [512, 650, 840, 1024, 1300, 1680, 2000, 2520],
                sizes: [
                  '(max-width: 1023px) 80vw',
                  '(min-width: 1024px) and (max-width: 1620px) 40vw',
                  '630px',
                ],
                transformations: {
                  resize: {
                    type: 'fill',
                    aspectRatio: '4:3',
                  },
                },
              },
            )}
          />
        </div>
        <Spacer size="xs" className="col-span-full block lg:hidden" />
        <div className="col-span-full lg:col-span-5 lg:col-start-8">
          <H4 as="p">{`What's this all about?`}</H4>
          <div className="flex flex-col gap-3">
            <Paragraph>
              {`The goal of the Call Kent Podcast is to `}
              <strong>get my answers to your questions.</strong>
              {`
              You record your brief question (120 seconds or less) right from
              your browser. Then I listen to it later and give my response,
              and through the magic of technology (ffmpeg), our question
              and answer are stitched together and published to the podcast
              feed.
            `}
            </Paragraph>
            <Paragraph>{`I look forward to hearing from you!`}</Paragraph>
            <Spacer size="2xs" />
            <ButtonLink variant="primary" to="./record">
              Record your call
            </ButtonLink>
          </div>
        </div>
      </Grid>

      <Spacer size="base" />

      {/*
        IDEA: when there will be many episodes, we could split this by year, and
        display it with tabs like on the podcast page. [2023, 2022, 2021]
      */}
      <Grid as="main">
        <div className="col-span-full mb-6 flex flex-col lg:mb-12 lg:flex-row lg:justify-between">
          <H6
            id="episodes"
            as="h2"
            className="col-span-full mb-10 flex flex-col lg:mb-0 lg:flex-row"
          >
            {`Calls with Kent C. Dodds — ${data.episodes.length} episodes`}
          </H6>

          <button
            className="text-primary group relative text-lg font-medium focus:outline-none"
            onClick={() => setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'))}
          >
            <div className="bg-secondary absolute -bottom-2 -left-4 -right-4 -top-2 rounded-lg opacity-0 transition group-hover:opacity-100 group-focus:opacity-100" />
            <span className="relative inline-flex items-center">
              {sortOrder === 'asc' ? (
                <>
                  Showing oldest first
                  <ChevronUpIcon className="ml-2 text-gray-400" />
                </>
              ) : (
                <>
                  Showing newest first
                  <ChevronDownIcon className="ml-2 text-gray-400" />
                </>
              )}
            </span>
          </button>
        </div>

        <div className="col-span-full">
          {sortedEpisodes.map(episode => {
            const path = getEpisodePath(episode)

            return (
              <div
                className="border-b border-gray-200 dark:border-gray-600"
                key={path}
              >
                <Link
                  preventScrollReset
                  to={path}
                  className="group focus:outline-none"
                  prefetch="intent"
                >
                  <Grid nested className="relative py-10 lg:py-5">
                    <div className="bg-secondary absolute -inset-px -mx-6 hidden rounded-lg group-hover:block group-focus:block" />
                    <div className="relative col-span-1 flex-none">
                      <div className="absolute inset-0 flex scale-0 transform items-center justify-center opacity-0 transition group-hover:scale-100 group-hover:opacity-100 group-focus:scale-100 group-focus:opacity-100">
                        <div className="flex-none rounded-full bg-white p-4 text-gray-800">
                          <TriangleIcon size={12} />
                        </div>
                      </div>
                      <img
                        className="h-16 w-full rounded-lg object-cover"
                        src={episode.imageUrl}
                        loading="lazy"
                        alt="" // this is decorative only
                      />
                    </div>
                    <div className="text-primary relative col-span-3 flex flex-col md:col-span-7 lg:col-span-11 lg:flex-row lg:items-center lg:justify-between">
                      <div className="mb-3 text-xl font-medium lg:mb-0">
                        {/* For most optimal display, this will needs adjustment once you'll hit 5 digits */}
                        <span
                          className={clsx('inline-block lg:text-lg', {
                            'w-10': numberLength <= 3,
                            'w-14': numberLength === 4,
                            'w-auto pr-4': numberLength > 4,
                          })}
                        >
                          {`${episode.episodeNumber
                            .toString()
                            .padStart(2, '0')}.`}
                        </span>

                        {episode.title}
                      </div>
                      <div className="text-lg font-medium text-gray-400">
                        {formatDuration(episode.duration)}
                      </div>
                    </div>
                  </Grid>
                </Link>

                <Grid nested>
                  <AnimatePresence>
                    {selectedEpisode === episode ? (
                      <motion.div
                        variants={{
                          collapsed: {
                            height: 0,
                            marginTop: 0,
                            marginBottom: 0,
                            opacity: 0,
                          },
                          expanded: {
                            height: 'auto',
                            marginTop: '1rem',
                            marginBottom: '3rem',
                            opacity: 1,
                          },
                        }}
                        initial="collapsed"
                        animate="expanded"
                        exit="collapsed"
                        transition={
                          shouldReduceMotion ? {duration: 0} : {duration: 0.15}
                        }
                        className="relative col-span-full"
                      >
                        <Outlet />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </Grid>
              </div>
            )
          })}
        </div>
      </Grid>

      <Spacer size="base" />

      <BlogSection
        articles={data.blogRecommendations}
        title="Looking for more content?"
        description="Have a look at these articles."
      />
    </>
  )
}

export const useCallsData = () => useMatchLoaderData<LoaderData>(handle.id)
