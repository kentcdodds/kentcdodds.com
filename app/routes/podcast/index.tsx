import * as React from 'react'
import {json, useRouteData} from 'remix'

import clsx from 'clsx'
import {Tab, TabList, TabPanel, TabPanels, Tabs} from '@reach/tabs'
import {Grid} from '../../components/grid'
import {images} from '../../images'
import {H2, H6} from '../../components/typography'
import type {KCDLoader, MdxListItem} from '../../../types'
import {AppleIcon} from '../../components/icons/apple-icon'
import {externalLinks} from '../../external-links'
import {RssIcon} from '../../components/icons/rss-icon'
import {SpotifyIcon} from '../../components/icons/spotify-icon'
import {GoogleIcon} from '../../components/icons/google-icon'
import {FeaturedArticleSection} from '../../components/sections/featured-article-section'
import {ChevronDownIcon} from '../../components/icons/chevron-down-icon'
import {BlogSection} from '../../components/sections/blog-section'
import {articles} from '../../../storybook/stories/fixtures'
import {Link} from 'react-router-dom'

type LoaderData = {
  podcasts: Array<MdxListItem>
}

export const loader: KCDLoader = async () => {
  const data: LoaderData = {
    podcasts: Array.from({length: 12}).map((_, idx) => ({
      frontmatter: {
        bannerUrl:
          'https://res.cloudinary.com/kentcdodds-com/image/upload/v1625034139/kentcdodds.com/content/podcast/03/01-alex-anderson/alex-anderson.png',
        bannerAlt: 'Alex Anderson Creates Web-Based Spaceship Controls',
        title: 'Alex Anderson Creates Web-Based Spaceship Controls',
        date: Date.now(),
        season: 3,
        episode: idx + 1,
      },
      duration: formatTime(Math.floor(Math.random() * 3000)),
      slug: `/podcast/${idx}`,
    })),
  }

  return json(data)
}

export function meta() {
  return {
    title: 'Podcasts by Kent C. Dodds',
    description: 'Get really good at making software with Kent C. Dodds',
  }
}

function formatTime(seconds: number) {
  const [h, m, s] = new Date(seconds * 1000)
    .toISOString()
    .substr(11, 8)
    .split(':')
  return h === '00' ? `${m}:${s}` : `${h}:${m}:${s}`
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
  // TODO: save state in url, like the filters on the blog?

  const featured = data.podcasts[0]

  return (
    <div>
      <Grid className="grid-rows-max-content mb-36 mt-16">
        <div className="col-span-full mb-12 lg:col-span-6 lg:col-start-7 lg:row-span-2 lg:mb-0">
          <img
            className="object-contain"
            src={images.kayak.src}
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

      {featured ? (
        <div className="mb-48">
          <FeaturedArticleSection {...featured} />
        </div>
      ) : null}

      <Tabs as={Grid} className="mb-24 lg:mb-64">
        <TabList className="flex flex-col col-span-full items-start mb-20 bg-transparent lg:flex-row lg:space-x-12">
          {/* TODO: make data driven, probably connect to url? */}
          {Array.from({length: 3}).map((_, idx) => (
            <Tab
              key={idx}
              className={clsx(
                'p-0 text-4xl leading-tight focus:bg-transparent border-none',
                {
                  'text-primary': idx === 0,
                  'text-blueGray-500': idx !== 0,
                },
              )}
            >
              {`Season ${3 - idx}`}
            </Tab>
          ))}
        </TabList>

        <div className="flex flex-col col-span-full mb-6 lg:flex-row lg:justify-between lg:mb-12">
          <H6 className="flex flex-col col-span-full mb-10 lg:flex-row lg:mb-0">
            <span>Chats with Kent C. Dodds</span>{' '}
            <span>{`Season 3 — ${data.podcasts.length} episodes`}</span>
          </H6>

          <button className="text-primary inline-flex items-center text-lg font-medium">
            Showing newest first
            <ChevronDownIcon className="ml-2 text-gray-400" />
          </button>
        </div>

        <TabPanels className="col-span-full">
          {Array.from({length: 3}).map((_, idx) => (
            <TabPanel
              key={idx}
              className="border-t border-gray-200 dark:border-gray-600"
            >
              {data.podcasts.map(podcast => (
                <Link key={podcast.slug} to={podcast.slug}>
                  <Grid
                    nested
                    className="group relative py-10 border-b border-gray-200 dark:border-gray-600 lg:py-5"
                  >
                    <div className="bg-secondary absolute -inset-px group-hover:block hidden -mx-6 rounded-lg" />

                    <img
                      className="relative flex-none col-span-1 rounded-lg"
                      src={podcast.frontmatter.bannerUrl}
                      alt={podcast.frontmatter.bannerAlt}
                    />
                    <div className="text-primary relative flex flex-col col-span-3 md:col-span-7 lg:flex-row lg:col-span-11 lg:items-center lg:justify-between">
                      <h4 className="mb-3 text-xl font-medium lg:mb-0">
                        <span className="inline-block w-10 lg:text-lg">
                          {`${podcast.frontmatter.episode
                            ?.toString()
                            .padStart(2, '0')}.`}
                        </span>
                        {podcast.frontmatter.title}
                      </h4>
                      <div className="text-gray-400 text-lg font-medium">
                        {podcast.duration}
                      </div>
                    </div>
                  </Grid>
                </Link>
              ))}
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>

      <BlogSection
        articles={articles}
        title="Looking for more content?"
        description="Have a look at these articles."
      />
    </div>
  )
}

export default PodcastHome
