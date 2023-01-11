import * as React from 'react'
import type {
  HeadersFunction,
  LoaderFunction,
  MetaFunction,
} from '@remix-run/node'
import {json} from '@remix-run/node'
import {
  Link,
  Outlet,
  useLoaderData,
  useMatches,
  useNavigate,
} from '@remix-run/react'
import clsx from 'clsx'
import {Tab, TabList, TabPanel, TabPanels, Tabs} from '@reach/tabs'
import type {LoaderData as RootLoaderData} from '../root'
import type {Await} from '~/types'
import {ChatsEpisodeUIStateProvider} from '~/utils/providers'
import {Grid} from '~/components/grid'
import {
  getGenericSocialImage,
  getImageBuilder,
  getImgProps,
  images,
} from '~/images'
import {H4, H6, Paragraph} from '~/components/typography'
import {externalLinks} from '../external-links'
import {ChevronDownIcon, ChevronUpIcon} from '~/components/icons'
import {BlogSection} from '~/components/sections/blog-section'
import {getBlogRecommendations} from '~/utils/blog.server'
import {getSeasonListItems} from '~/utils/simplecast.server'
import {FeaturedSection} from '~/components/sections/featured-section'
import {
  listify,
  formatDuration,
  reuseUsefulLoaderHeaders,
  getUrl,
  getDisplayUrl,
} from '~/utils/misc'
import {getCWKEpisodePath, getFeaturedEpisode} from '~/utils/chats-with-kent'
import {HeroSection} from '~/components/sections/hero-section'
import {Spacer} from '~/components/spacer'
import {PodcastSubs} from '~/components/podcast-subs'
import {getSocialMetas} from '~/utils/seo'
import {getServerTimeHeader} from '~/utils/timing.server'

type LoaderData = {
  seasons: Await<ReturnType<typeof getSeasonListItems>>
  blogRecommendations: Await<ReturnType<typeof getBlogRecommendations>>
}

export const loader: LoaderFunction = async ({request}) => {
  const timings = {}
  const blogRecommendations = await getBlogRecommendations({request, timings})
  const data: LoaderData = {
    // we show the seasons in reverse order
    seasons: (await getSeasonListItems({request})).reverse(),
    blogRecommendations,
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

export const meta: MetaFunction = ({data, parentsData}) => {
  const {seasons} = (data as LoaderData | undefined) ?? {}
  if (!seasons) {
    return {
      title: 'Chats with Kent Seasons not found',
    }
  }
  const episodeCount = seasons.reduce(
    (acc, season) => acc + season.episodes.length,
    0,
  )
  const {requestInfo} = parentsData.root as RootLoaderData

  return {
    ...getSocialMetas({
      title: 'Chats with Kent C. Dodds Podcast',
      description: `Become a better person with ${episodeCount} interesting and actionable conversations with interesting people.`,
      keywords: `chats with kent, kent c. dodds`,
      url: getUrl(requestInfo),
      image: getGenericSocialImage({
        words: 'Listen to the Chats with Kent Podcast',
        featuredImage: images.kayak.id,
        url: getDisplayUrl({
          origin: requestInfo.origin,
          path: '/chats',
        }),
      }),
    }),
  }
}

function PodcastHome() {
  const [sortOrder, setSortOrder] = React.useState<'desc' | 'asc'>('asc')
  const navigate = useNavigate()
  const data = useLoaderData<LoaderData>()
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
      navigate(String(chosenSeason.seasonNumber).padStart(2, '0'), {
        preventScrollReset: true,
      })
    }
  }

  const allEpisodes = data.seasons.flatMap(s => s.episodes)
  const featured = getFeaturedEpisode(allEpisodes)

  return (
    <>
      <HeroSection
        title="Listen to chats with Kent C. Dodds here."
        subtitle="Find all episodes of my podcast below."
        imageBuilder={images.kayak}
        imageSize="large"
      />

      <Grid>
        <H6 as="div" className="col-span-full mb-6">
          Listen to the podcasts here
        </H6>

        <PodcastSubs
          apple={externalLinks.applePodcast}
          google={externalLinks.googlePodcast}
          spotify={externalLinks.spotify}
          rss={externalLinks.simpleCast}
        />
      </Grid>

      {featured ? (
        <>
          <Spacer size="xs" />
          <FeaturedSection
            cta="Listen to this episode"
            caption="Featured episode"
            subTitle={`Season ${featured.seasonNumber} Episode ${
              featured.episodeNumber
            } — ${formatDuration(featured.duration)}`}
            title={featured.title}
            href={getCWKEpisodePath(featured)}
            imageUrl={featured.image}
            imageAlt={listify(featured.guests.map(g => g.name))}
          />
        </>
      ) : null}

      <Spacer size="base" />

      <Grid>
        <div className="col-span-full lg:col-span-6">
          <img
            className="rounded-lg object-cover"
            title="Photo by Jukka Aalho / Kertojan ääni: https://kertojanaani.fi"
            {...getImgProps(
              getImageBuilder(
                'unsplash/photo-1590602847861-f357a9332bbc',
                'A SM7B Microphone',
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
                    aspectRatio: '3:4',
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
              {`The goal of the Chats with Kent Podcast is to `}
              <strong>help you become a better person.</strong>
              {`
                With each episode, there's a key takeaway and a specific action
                item to help you on your path to becoming the best person you
                can be.
              `}
            </Paragraph>
            <Paragraph>
              {`
                Before each show, I ask the guest to share with me the change
                they would like to see in the world. Any change at all. Whether
                it's related to software development or not. And then we
                brainstorm a specific thing we can invite you to do at the end
                of the show to help push that change in the world along.
                Something small, but meaningful.
              `}
            </Paragraph>
            <Paragraph>
              {`
                Once we know what we want to commit you to, I kick things off
                and try to steer the conversation in a direction that will
                prepare you to accept that invitation and hopefully help you
                make that change in your life. I hope you take advantage of this
                opportunity.
              `}
            </Paragraph>
            <Paragraph>{`Enjoy the show.`}</Paragraph>
          </div>
        </div>
      </Grid>

      <Spacer size="base" />

      <Tabs
        as={Grid}
        className="mb-24 lg:mb-64"
        index={tabIndex}
        onChange={handleTabChange}
      >
        <TabList className="col-span-full mb-20 flex flex-col items-start bg-transparent lg:flex-row lg:space-x-12">
          {data.seasons.map(season => (
            <Tab
              key={season.seasonNumber}
              // Because we have a link right under the tab, we'll keep this off
              // the tab "tree" and rely on focusing/activating the link.
              tabIndex={-1}
              className="border-none p-0 text-4xl leading-tight focus:bg-transparent focus:outline-none"
            >
              {/*
                The link is here for progressive enhancement. Even though this
                is a tab, it's actually navigating to a route, so semantically
                it should be a link. By making it a link, it'll work with JS
                off, but more importantly it'll allow people to meta-click it.
              */}
              <Link
                preventScrollReset
                className={clsx(
                  'hover:text-primary focus:text-primary focus:outline-none',
                  {
                    'text-primary': season.seasonNumber === seasonNumber,
                    'text-slate-500': season.seasonNumber !== seasonNumber,
                  },
                )}
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
          <div className="col-span-full mb-6 flex flex-col lg:mb-12 lg:flex-row lg:justify-between">
            <H6
              as="h2"
              className="col-span-full mb-10 flex flex-col lg:mb-0 lg:flex-row"
            >
              <span>Chats with Kent C. Dodds</span>
              &nbsp;
              <span>{`Season ${currentSeason.seasonNumber} — ${currentSeason.episodes.length} episodes`}</span>
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
        ) : null}

        <TabPanels className="col-span-full">
          {data.seasons.map(season => (
            <TabPanel
              key={season.seasonNumber}
              className="border-t border-gray-200 focus:outline-none dark:border-gray-600"
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
