import * as React from 'react'
import type {LoaderFunction, HeadersFunction, MetaFunction} from 'remix'
import {json, Link, useLoaderData, useMatches} from 'remix'
import {Outlet} from 'react-router-dom'
import {AnimatePresence, motion} from 'framer-motion'
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
import {ChevronUpIcon} from '~/components/icons/chevron-up-icon'
import {ChevronDownIcon} from '~/components/icons/chevron-down-icon'
import {TriangleIcon} from '~/components/icons/triangle-icon'
import {
  formatTime,
  getDisplayUrl,
  getUrl,
  reuseUsefulLoaderHeaders,
} from '~/utils/misc'
import {
  getEpisodeFromParams,
  getEpisodePath,
  Params as CallPlayerParams,
} from '~/utils/call-kent'
import {PodcastSubs} from '~/components/podcast-subs'
import {Spacer} from '~/components/spacer'
import {getSocialMetas} from '~/utils/seo'
import {TwitterIcon} from '~/components/icons/twitter-icon'
import {IconLink} from '~/components/icon-link'
import {useRootData} from '~/utils/use-root-data'

export const handle: KCDHandle & {id: string} = {
  id: 'calls',
}

export type LoaderData = {
  episodes: Await<ReturnType<typeof getEpisodes>>
  blogRecommendations: Await<ReturnType<typeof getBlogRecommendations>>
}

export const loader: LoaderFunction = async ({request}) => {
  const [blogRecommendations, episodes] = await Promise.all([
    getBlogRecommendations(request),
    getEpisodes({request}),
  ])

  const data: LoaderData = {
    blogRecommendations,
    episodes,
  }
  return json(data, {
    headers: {
      'Cache-Control': 'private, max-age=3600',
      Vary: 'Cookie',
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
  const {requestInfo} = useRootData()

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
        <Spacer size="xs" className="block col-span-full lg:hidden" />
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
        <div className="flex flex-col col-span-full mb-6 lg:flex-row lg:justify-between lg:mb-12">
          <H6
            id="episodes"
            as="h2"
            className="flex flex-col col-span-full mb-10 lg:flex-row lg:mb-0"
          >
            {`Calls with Kent C. Dodds — ${data.episodes.length} episodes`}
          </H6>

          <button
            className="group text-primary relative text-lg font-medium focus:outline-none"
            onClick={() => setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'))}
          >
            <div className="bg-secondary absolute -bottom-2 -left-4 -right-4 -top-2 rounded-lg opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition" />
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
            const keywords = Array.from(
              new Set(
                episode.keywords
                  .split(/[,;\s]/g) // split into words
                  .map(x => x.trim()) // trim white spaces
                  .filter(Boolean), // remove empties
              ), // omit duplicates
            ).slice(0, 3) // keep first 3 only

            return (
              <div
                className="border-b border-gray-200 dark:border-gray-600"
                key={path}
              >
                <Link to={path} className="group focus:outline-none">
                  <Grid nested className="relative py-10 lg:py-5">
                    <div className="bg-secondary absolute -inset-px group-hover:block group-focus:block hidden -mx-6 rounded-lg" />
                    <div className="relative flex-none col-span-1">
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-focus:opacity-100 group-hover:opacity-100 transform scale-0 group-focus:scale-100 group-hover:scale-100 transition">
                        <div className="flex-none p-4 text-gray-800 bg-white rounded-full">
                          <TriangleIcon size={12} />
                        </div>
                      </div>
                      <img
                        className="w-full h-16 rounded-lg object-cover"
                        src={episode.imageUrl}
                        alt="" // this is decorative only
                      />
                    </div>
                    <div className="text-primary relative flex flex-col col-span-3 md:col-span-7 lg:flex-row lg:col-span-11 lg:items-center lg:justify-between">
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
                      <div className="text-gray-400 text-lg font-medium">
                        {formatTime(episode.duration)}
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
                        transition={{duration: 0.15}}
                        className="relative col-span-full"
                      >
                        <div className="flex gap-4 justify-between">
                          <div>
                            <H6 as="div" className="flex-auto">
                              Keywords
                            </H6>
                            <Paragraph className="flex mb-8">
                              {keywords.join(', ')}
                            </Paragraph>
                          </div>
                          <IconLink
                            target="_blank"
                            rel="noreferrer noopener"
                            href={`https://twitter.com/intent/tweet?${new URLSearchParams(
                              {
                                url: `${requestInfo.origin}${path}`,
                                text: `I just listened to "${episode.title}" on the Chats with Kent Podcast 🎙 by @kentcdodds`,
                              },
                            )}`}
                          >
                            <TwitterIcon title="Tweet this" />
                          </IconLink>
                        </div>

                        <H6 as="div">Description</H6>
                        <Paragraph
                          as="div"
                          className="mb-8"
                          dangerouslySetInnerHTML={{
                            __html: episode.descriptionHTML,
                          }}
                        />
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
