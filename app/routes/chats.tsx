import * as React from 'react'
import {json, useRouteData, useMatches, Link} from 'remix'
import type {LoaderFunction, HeadersFunction} from 'remix'
import clsx from 'clsx'
import {Tab, TabList, TabPanel, TabPanels, Tabs} from '@reach/tabs'
import {Outlet, useNavigate} from 'react-router-dom'
import type {Await} from 'types'
import {ChatsEpisodeUIStateProvider} from '../utils/providers'
import {Grid} from '../components/grid'
import {images} from '../images'
import {H6} from '../components/typography'
import {AppleIcon} from '../components/icons/apple-icon'
import {externalLinks} from '../external-links'
import {RssIcon} from '../components/icons/rss-icon'
import {SpotifyIcon} from '../components/icons/spotify-icon'
import {GoogleIcon} from '../components/icons/google-icon'
import {ChevronDownIcon} from '../components/icons/chevron-down-icon'
import {ChevronUpIcon} from '../components/icons/chevron-up-icon'
import {BlogSection} from '../components/sections/blog-section'
import {getBlogRecommendations} from '../utils/blog.server'
import {getSeasonListItems, refreshSeasons} from '../utils/simplecast.server'
import {getUser} from '../utils/session.server'
import {FeaturedSection} from '../components/sections/featured-section'
import {listify, formatTime} from '../utils/misc'
import {getCWKEpisodePath, getFeaturedEpisode} from '../utils/chats-with-kent'
import {HeroSection} from '../components/sections/hero-section'

type LoaderData = {
  seasons: Await<ReturnType<typeof getSeasonListItems>>
  blogRecommendations: Await<ReturnType<typeof getBlogRecommendations>>
}

export const loader: LoaderFunction = async ({request}) => {
  if (new URL(request.url).searchParams.has('fresh')) {
    const user = await getUser(request)
    if (user?.role === 'ADMIN') {
      await refreshSeasons()
    }
  }

  const blogRecommendations = (await getBlogRecommendations()).slice(0, 3)
  const data: LoaderData = {
    // we show the seasons in reverse order
    seasons: (await getSeasonListItems()).reverse(),
    blogRecommendations,
  }

  return json(data, {
    headers: {
      'Cache-Control': 'public, max-age=600',
    },
  })
}

export const headers: HeadersFunction = ({loaderHeaders}) => {
  return {
    'Cache-Control': loaderHeaders.get('Cache-Control') ?? 'no-cache',
  }
}

export function meta() {
  return {
    title: 'Podcasts by Kent C. Dodds',
    description: 'Get really good at making software with Kent C. Dodds',
  }
}

function PodcastAppLink({
  icon,
  children,
  ...props
}: JSX.IntrinsicElements['a'] & {icon: React.ReactElement}) {
  return (
    <a
      {...props}
      className="focus-ring text-primary bg-secondary flex flex-none items-center mb-4 mr-4 px-8 py-4 rounded-full space-x-4"
    >
      <span className="text-gray-400">{icon}</span>
      <span>{children}</span>
    </a>
  )
}

function PodcastHome() {
  const [sortOrder, setSortOrder] = React.useState<'desc' | 'asc'>('asc')
  const navigate = useNavigate()
  const data = useRouteData<LoaderData>()
  const matches = useMatches()
  const last = matches[matches.length - 1]

  const seasonNumber = last?.params.season
    ? Number(last.params.season)
    : // we use the first one because the seasons are in reverse order
      // oh, and this should never happen anyway because we redirect
      // in the event there's no season param. But it's just to be safe.
      data.seasons[0]?.seasonNumber ?? 1

  const currentSeason = data.seasons.find(s => s.seasonNumber === seasonNumber)
  const tabIndex = currentSeason ? data.seasons.indexOf(currentSeason) : 0

  function handleTabChange(index: number) {
    const chosenSeason = data.seasons[index]
    if (chosenSeason) {
      navigate(String(chosenSeason.seasonNumber).padStart(2, '0'))
    }
  }

  const allEpisodes = data.seasons.flatMap(s => s.episodes)
  const featured = getFeaturedEpisode(allEpisodes)

  return (
    <>
      <HeroSection
        title="Listen to chats with Kent C. Dodds here."
        subtitle="Find all episodes of my podcast below."
        imageUrl={images.kayak({
          resize: {type: 'crop', width: 2600, height: 1800},
        })}
        imageAlt={images.kayak.alt}
        imageSize="large"
      />

      <Grid className="mb-14">
        <H6 as="div" className="col-span-full mb-6">
          Listen to the podcasts here
        </H6>

        <div className="flex flex-wrap col-span-full items-start justify-start -mb-4 -mr-4 lg:col-span-10">
          <PodcastAppLink
            icon={<AppleIcon />}
            href={externalLinks.applePodcast}
          >
            Apple podcasts
          </PodcastAppLink>
          <PodcastAppLink
            icon={<GoogleIcon />}
            href={externalLinks.googlePodcast}
          >
            Google podcasts
          </PodcastAppLink>
          <div className="flex-no-wrap flex">
            <PodcastAppLink icon={<SpotifyIcon />} href={externalLinks.spotify}>
              Spotify
            </PodcastAppLink>
            <PodcastAppLink icon={<RssIcon />} href={externalLinks.simpleCast}>
              RSS
            </PodcastAppLink>
          </div>
        </div>
      </Grid>

      <div className="mb-48">
        <FeaturedSection
          cta="Listen to this episode"
          caption="Featured episode"
          subTitle={`Season ${featured.seasonNumber} Episode ${
            featured.episodeNumber
          } — ${formatTime(featured.duration)}`}
          title={featured.title}
          href={getCWKEpisodePath(featured)}
          imageUrl={featured.image}
          imageAlt={listify(featured.guests.map(g => g.name))}
        />
      </div>

      <Tabs
        as={Grid}
        className="mb-24 lg:mb-64"
        index={tabIndex}
        onChange={handleTabChange}
      >
        <TabList className="flex flex-col col-span-full items-start mb-20 bg-transparent lg:flex-row lg:space-x-12">
          {data.seasons.map(season => (
            <Tab
              key={season.seasonNumber}
              className={clsx(
                'p-0 text-4xl leading-tight focus:bg-transparent border-none',
                {
                  'text-primary': season.seasonNumber === seasonNumber,
                  'text-blueGray-500': season.seasonNumber !== seasonNumber,
                },
              )}
            >
              {/*
                The link is here for progressive enhancement. Even though this
                is a tab, it's actually navigating to a route, so semantically
                it should be a link. By making it a link, it'll work with JS
                off, but more importantly it'll allow people to meta-click it.
              */}
              <Link
                to={String(season.seasonNumber).padStart(2, '0')}
                onClick={e => {
                  if (e.metaKey) {
                    e.stopPropagation()
                  } else {
                    e.preventDefault()
                  }
                }}
              >
                {`Season ${season.seasonNumber}`}
              </Link>
            </Tab>
          ))}
        </TabList>

        {currentSeason ? (
          <div className="flex flex-col col-span-full mb-6 lg:flex-row lg:justify-between lg:mb-12">
            <H6
              as="h2"
              className="flex flex-col col-span-full mb-10 lg:flex-row lg:mb-0"
            >
              <span>Chats with Kent C. Dodds</span>
              &nbsp;
              <span>{`Season ${currentSeason.seasonNumber} — ${currentSeason.episodes.length} episodes`}</span>
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
              ) : null}
              {sortOrder === 'desc' ? (
                <>
                  Showing newest first
                  <ChevronDownIcon className="ml-2 text-gray-400" />
                </>
              ) : null}
            </button>
          </div>
        ) : null}

        <TabPanels className="col-span-full">
          {data.seasons.map(season => (
            <TabPanel
              key={season.seasonNumber}
              className="border-t border-gray-200 dark:border-gray-600"
            >
              <ChatsEpisodeUIStateProvider value={{sortOrder}}>
                <Outlet />
              </ChatsEpisodeUIStateProvider>
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>

      <BlogSection
        articles={data.blogRecommendations}
        title="Looking for more content?"
        description="Have a look at these articles."
      />
    </>
  )
}

export default PodcastHome
