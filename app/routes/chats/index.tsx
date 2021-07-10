import * as React from 'react'
import {json, useRouteData} from 'remix'
import clsx from 'clsx'
import {Tab, TabList, TabPanel, TabPanels, Tabs} from '@reach/tabs'
import {Outlet} from 'react-router-dom'
import type {KCDLoader, MdxListItem} from 'types'
import {Grid} from '../../components/grid'
import {images} from '../../images'
import {H2, H6} from '../../components/typography'
import {AppleIcon} from '../../components/icons/apple-icon'
import {externalLinks} from '../../external-links'
import {RssIcon} from '../../components/icons/rss-icon'
import {SpotifyIcon} from '../../components/icons/spotify-icon'
import {GoogleIcon} from '../../components/icons/google-icon'
import {ChevronDownIcon} from '../../components/icons/chevron-down-icon'
import {BlogSection} from '../../components/sections/blog-section'
import {getBlogRecommendations} from '../../utils/blog.server'
// import {FeaturedSection} from '../../components/sections/featured-section'

type LoaderData = {
  seasons: Array<number>
  blogRecommendations: Array<MdxListItem>
}

export const loader: KCDLoader = async () => {
  const blogRecommendations = (await getBlogRecommendations()).slice(0, 3)
  // TODO: this should support the season dirs
  const data: LoaderData = {
    seasons: [3, 2, 1],
    blogRecommendations,
  }

  return json(data)
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
  const data = useRouteData<LoaderData>()

  // TODO: load the latest podcast episode:
  const featured = null

  return (
    <div>
      <Grid className="grid-rows-max-content mb-36 mt-16">
        <div className="col-span-full mb-12 lg:col-span-6 lg:col-start-7 lg:row-span-2 lg:mb-0">
          <img
            className="object-contain"
            src={images.kayak()}
            alt={images.kayak.alt}
          />
        </div>

        <div className="col-span-full lg:col-span-6 lg:row-start-1">
          <div className="space-y-2 lg:max-w-sm">
            <H2>Listen to chats with Kent C. Dodds here.</H2>
            <H2 variant="secondary" as="p">
              Find all episodes of my podcast below.
            </H2>
          </div>
        </div>
      </Grid>

      <Grid className="mb-14">
        <H6 className="col-span-full mb-6">Listen to the podcasts here</H6>

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

      {/* TODO: find a place to take season, episode and duration from */}
      {/* TODO: fix this */}
      {/* {featured ? (
        <div className="mb-48">
          <FeaturedSection
            cta="Listen to this episode"
            caption="Latest episode"
            subTitle="Season 03, Episode 01 — 48:12"
            title={featured.frontmatter.title}
            slug={featured.slug}
            imageUrl={featured.frontmatter.guest!.image}
            imageAlt={featured.frontmatter.guest!.name}
          />
        </div>
      ) : null} */}

      <Tabs as={Grid} className="mb-24 lg:mb-64">
        <TabList className="flex flex-col col-span-full items-start mb-20 bg-transparent lg:flex-row lg:space-x-12">
          {/* TODO: connect to state */}
          {data.seasons.map(season => (
            <Tab
              key={season}
              className={clsx(
                'p-0 text-4xl leading-tight focus:bg-transparent border-none',
                {
                  'text-primary': season === 3,
                  'text-blueGray-500': season !== 3,
                },
              )}
            >
              {`Season ${season}`}
            </Tab>
          ))}
        </TabList>

        <div className="flex flex-col col-span-full mb-6 lg:flex-row lg:justify-between lg:mb-12">
          <H6 className="flex flex-col col-span-full mb-10 lg:flex-row lg:mb-0">
            <span>Chats with Kent C. Dodds</span>{' '}
            <span>{`Season 3 — ${data.podcasts.length} episodes`}</span>
          </H6>

          {/* TODO: add sorting */}
          <button className="text-primary inline-flex items-center text-lg font-medium">
            Showing newest first
            <ChevronDownIcon className="ml-2 text-gray-400" />
          </button>
        </div>

        <TabPanels className="col-span-full">
          {/* TODO: support other seasons*/}
          {data.seasons.map(season => (
            <TabPanel
              key={season}
              className="border-t border-gray-200 dark:border-gray-600"
            >
              <Outlet />
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>

      <BlogSection
        articles={data.blogRecommendations}
        title="Looking for more content?"
        description="Have a look at these articles."
      />
    </div>
  )
}

export default PodcastHome
