import * as React from 'react'
import {json, Link, useRouteData} from 'remix'
import type {LoaderFunction} from 'remix'
import {Outlet, useLocation} from 'react-router-dom'
import type {Await} from 'types'
import {getEpisodes} from '../utils/call-kent.server'
import {CallKentEpisodesProvider, useTeam} from '../utils/providers'
import {getUser} from '../utils/session.server'
import {refreshEpisodes} from '../utils/transistor.server'
import {HeroSection} from '../components/sections/hero-section'
import {alexProfiles} from '../images'
import {ButtonLink} from '../components/button'
import {Grid} from '../components/grid'
import {getBlogRecommendations} from '../utils/blog.server'
import {BlogSection} from '../components/sections/blog-section'
import {H6} from '../components/typography'
import {ChevronUpIcon} from '../components/icons/chevron-up-icon'
import {ChevronDownIcon} from '../components/icons/chevron-down-icon'
import {HeaderSection} from '../components/sections/header-section'
import {TriangleIcon} from '../components/icons/triangle-icon'
import {formatTime} from '../utils/misc'
import {AnimatePresence, motion} from 'framer-motion'
import {useRef} from 'react'

type LoaderData = {
  episodes: Await<ReturnType<typeof getEpisodes>>
  blogRecommendations: Await<ReturnType<typeof getBlogRecommendations>>
}

export const loader: LoaderFunction = async ({request}) => {
  if (new URL(request.url).searchParams.has('fresh')) {
    const user = await getUser(request)
    if (user?.role === 'ADMIN') {
      await refreshEpisodes()
    }
  }

  const [blogRecommendations, episodes] = await Promise.all([
    getBlogRecommendations({limit: 3}),
    getEpisodes(),
  ])

  return json({
    blogRecommendations,
    episodes,
  })
}

export default function CallHomeScreen() {
  const {pathname} = useLocation()
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc')

  const data = useRouteData<LoaderData>()
  const [team] = useTeam()
  const avatar = alexProfiles[team]

  const activeSlug = pathname.replace('/call/', '')
  const initialActiveSlugRef = useRef(activeSlug)

  const sortedEpisodes =
    sortOrder === 'desc' ? data.episodes : [...data.episodes].reverse()

  // An effect to scroll to the episode's position when opening a direct link,
  // use a ref so that it doesn't hijack scroll when the user is browsing episodes
  React.useEffect(() => {
    const episode = initialActiveSlugRef.current
    if (episode) {
      document.querySelector(`[data-episode="${episode}"]`)?.scrollIntoView()
    }
  }, [initialActiveSlugRef])

  return (
    <>
      <HeroSection
        title="Calls with Kent C. Dodds."
        subtitle="You call, I'll answer."
        imageUrl={avatar.src}
        imageAlt={avatar.alt}
        arrowUrl="#episodes"
        arrowLabel="Wanna see my call logs?"
        action={
          <ButtonLink variant="primary" to="./record">
            Record your call
          </ButtonLink>
        }
      />

      <HeaderSection
        className="mb-16"
        title="This thing is a bit new."
        subTitle="But here is what we got."
      />

      {/*
        IDEA: when there will be many episodes, we could split this by year, and
        display it with tabs like on the podcast page. [2023, 2022, 2021]
      */}
      <Grid className="mb-24 lg:mb-64">
        <div className="flex flex-col col-span-full mb-6 lg:flex-row lg:justify-between lg:mb-12">
          <H6
            id="episodes"
            as="h2"
            className="flex flex-col col-span-full mb-10 lg:flex-row lg:mb-0"
          >
            <span>Calls with Kent C. Dodds</span>
            &nbsp;
            <span>{` — ${data.episodes.length} episodes`}</span>
          </H6>

          <button
            className="text-primary inline-flex items-center text-lg font-medium"
            onClick={() => setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'))}
          >
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
          </button>
        </div>

        <div className="col-span-full">
          <CallKentEpisodesProvider value={data.episodes}>
            {sortedEpisodes.map((episode, idx, {length}) => {
              const number =
                sortOrder === 'asc' ? idx + 1 : Math.abs(length - idx)

              return (
                <div
                  className="border-b border-gray-200 dark:border-gray-600"
                  key={episode.slug}
                >
                  <Link
                    data-episode={episode.slug}
                    key={episode.slug}
                    to={
                      activeSlug === episode.slug ? './' : `./${episode.slug}`
                    }
                  >
                    <Grid nested className="group relative py-10 lg:py-5">
                      <div className="bg-secondary absolute -inset-px group-hover:block hidden -mx-6 rounded-lg" />
                      <div className="relative flex-none col-span-1">
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-0 group-hover:scale-100 transition">
                          <div className="flex-none p-4 text-gray-800 bg-white rounded-full">
                            <TriangleIcon size={12} />
                          </div>
                        </div>
                        <img
                          className="w-full rounded-lg object-cover"
                          src={episode.imageUrl}
                          alt={episode.title}
                        />
                      </div>
                      <div className="text-primary relative flex flex-col col-span-3 md:col-span-7 lg:flex-row lg:col-span-11 lg:items-center lg:justify-between">
                        <div className="mb-3 text-xl font-medium lg:mb-0">
                          {/* TODO: make it three digits? How many calls do we expect? */}
                          <span className="inline-block w-10 lg:text-lg">
                            {`${number.toString().padStart(2, '0')}.`}
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
                      {activeSlug === episode.slug ? (
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
                          <Outlet />
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </Grid>
                </div>
              )
            })}
          </CallKentEpisodesProvider>
        </div>
      </Grid>

      <BlogSection
        articles={data.blogRecommendations}
        title="Looking for more content?"
        description="Have a look at these articles."
      />
    </>
  )
}
