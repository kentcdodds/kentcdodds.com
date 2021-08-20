import * as React from 'react'
import type {LoaderFunction, HeadersFunction, MetaFunction} from 'remix'
import {json, useLoaderData} from 'remix'
import type {Await, KCDHandle, MdxListItem} from '~/types'
import formatDate from 'date-fns/format'
import parseISO from 'date-fns/parseISO'
import {useSearchParams} from 'react-router-dom'
import {Grid} from '~/components/grid'
import {getImageBuilder, getImgProps, images} from '~/images'
import {H2, H3, H6} from '~/components/typography'
import {SearchIcon} from '~/components/icons/search-icon'
import {ArticleCard} from '~/components/article-card'
import {ArrowLink} from '~/components/arrow-button'
import {FeaturedSection} from '~/components/sections/featured-section'
import {Tag} from '~/components/tag'
import {getBlogMdxListItems} from '~/utils/mdx'
import {filterPosts} from '~/utils/blog'
import {useRequestInfo} from '~/utils/providers'
import {HeroSection} from '~/components/sections/hero-section'
import {PlusIcon} from '~/components/icons/plus-icon'
import {Button} from '~/components/button'
import type {Timings} from '~/utils/metrics.server'
import {getServerTimeHeader} from '~/utils/metrics.server'
import {ServerError} from '~/components/errors'
import {
  formatNumber,
  reuseUsefulLoaderHeaders,
  useUpdateQueryStringValueWithoutNavigation,
} from '~/utils/misc'
import {TeamStats} from '~/components/team-stats'
import {Spacer} from '~/components/spacer'
import {
  getBlogReadRankings,
  getBlogRecommendations,
  getReaderCount,
  getTotalPostReads,
} from '~/utils/blog.server'

export const handle: KCDHandle = {
  getSitemapEntries: () => [
    {
      route: `/blog`,
      priority: 0.7,
    },
  ],
}

type LoaderData = {
  posts: Array<MdxListItem>
  recommended: MdxListItem | undefined
  tags: Array<string>
  readRankings: Await<ReturnType<typeof getBlogReadRankings>>
  totalReads: string
  totalBlogReaders: string
}

export const loader: LoaderFunction = async ({request}) => {
  const timings: Timings = {}

  const [posts, [recommended], readRankings, totalReads, totalBlogReaders] =
    await Promise.all([
      getBlogMdxListItems({request, timings}),
      getBlogRecommendations(request, {limit: 1}),
      getBlogReadRankings(),
      getTotalPostReads(),
      getReaderCount(),
    ])

  const tags = new Set<string>()
  for (const post of posts) {
    for (const category of post.frontmatter.categories ?? []) {
      tags.add(category)
    }
  }

  const data: LoaderData = {
    posts,
    recommended,
    readRankings,
    totalReads: formatNumber(totalReads),
    totalBlogReaders: formatNumber(totalBlogReaders),
    tags: Array.from(tags),
  }

  return json(data, {
    headers: {
      'Cache-Control': 'private, max-age=3600',
      'Server-Timing': getServerTimeHeader(timings),
    },
  })
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export const meta: MetaFunction = ({data}: {data: LoaderData}) => {
  return {
    title: 'The Kent C. Dodds Blog',
    description: `Join ${
      data.totalBlogReaders
    } people who have read Kent's ${formatNumber(
      data.posts.length,
    )} articles on JavaScript, TypeScript, React, Testing, Career, and more.`,
  }
}

// should be divisible by 3 and 2 (large screen, and medium screen).
const PAGE_SIZE = 12
const initialIndexToShow = PAGE_SIZE

function BlogHome() {
  const requestInfo = useRequestInfo()
  const [searchParams] = useSearchParams()

  const [queryValue, setQuery] = React.useState<string>(() => {
    return searchParams.get('q') ?? ''
  })
  const query = queryValue.trim()

  useUpdateQueryStringValueWithoutNavigation('q', query)

  const data = useLoaderData<LoaderData>()
  const allPosts = data.posts
  const matchingPosts = React.useMemo(() => {
    return filterPosts(allPosts, query)
  }, [allPosts, query])

  const [indexToShow, setIndexToShow] = React.useState(initialIndexToShow)
  // when the query changes, we want to reset the index
  React.useEffect(() => {
    setIndexToShow(initialIndexToShow)
  }, [query])

  // this bit is very similar to what's on the blogs page.
  // Next time we need to do work in here, let's make an abstraction for them

  function toggleTag(tag: string) {
    setQuery(q => {
      // create a regexp so that we can replace multiple occurrences (`react node react`)
      const expression = new RegExp(tag, 'ig')

      const newQuery = expression.test(q)
        ? q.replace(expression, '')
        : `${q} ${tag}`

      // trim and remove subsequent spaces (`react   node ` => `react node`)
      return newQuery.replace(/\s+/g, ' ').trim()
    })
  }

  const isSearching = query.length > 0

  const posts = isSearching
    ? matchingPosts.slice(0, indexToShow)
    : matchingPosts
        .slice(0, indexToShow)
        .filter(p => p.slug !== data.recommended?.slug)

  const hasMorePosts = isSearching
    ? indexToShow < matchingPosts.length
    : indexToShow < matchingPosts.length - 1

  const visibleTags = isSearching
    ? new Set(
        matchingPosts
          .flatMap(post => post.frontmatter.categories)
          .filter(Boolean),
      )
    : new Set(data.tags)

  const recommendedPermalink = data.recommended
    ? `${requestInfo.origin}/blog/${data.recommended.slug}`
    : undefined

  return (
    <>
      <HeroSection
        title="Learn development with great articles."
        subtitle="Find the latest of my writing here."
        imageBuilder={images.skis}
        action={
          <div>
            <form
              action="/blog"
              method="GET"
              onSubmit={e => e.preventDefault()}
            >
              <div className="relative">
                <div className="absolute left-8 top-0 flex items-center justify-center h-full text-blueGray-500">
                  <SearchIcon />
                </div>
                <input
                  value={queryValue}
                  onChange={event =>
                    setQuery(event.currentTarget.value.toLowerCase())
                  }
                  name="q"
                  placeholder="Search blog"
                  aria-label="Search blog"
                  className="text-primary bg-primary border-secondary hover:border-primary focus:border-primary focus:bg-secondary px-16 py-6 w-full text-lg font-medium border rounded-full focus:outline-none"
                />
                <div className="absolute right-8 top-0 flex items-center justify-center h-full text-blueGray-500 text-lg font-medium">
                  {matchingPosts.length}
                </div>
              </div>
            </form>
            <Spacer size="xs" />
            <TeamStats
              totalReads={data.totalReads}
              rankings={data.readRankings}
              direction="down"
            />
          </div>
        }
      />

      {data.tags.length > 0 ? (
        <Grid className="mb-14">
          <H6 as="div" className="col-span-full mb-6">
            Search blog by topics
          </H6>
          <div className="flex flex-wrap col-span-full -mb-4 -mr-4 lg:col-span-10">
            {data.tags.map(tag => {
              const selected = query.includes(tag)
              return (
                <Tag
                  key={tag}
                  tag={tag}
                  selected={selected}
                  onClick={() => toggleTag(tag)}
                  disabled={!visibleTags.has(tag) && !selected}
                />
              )
            })}
          </div>
        </Grid>
      ) : null}

      {!isSearching && data.recommended ? (
        <div className="mb-10">
          <FeaturedSection
            subTitle={
              data.recommended.frontmatter.date
                ? `${formatDate(
                    parseISO(data.recommended.frontmatter.date),
                    'PPP',
                  )} — ${data.recommended.readTime?.text ?? 'quick read'}`
                : 'TBA'
            }
            title={data.recommended.frontmatter.title}
            imageBuilder={
              data.recommended.frontmatter.bannerCloudinaryId
                ? getImageBuilder(
                    data.recommended.frontmatter.bannerCloudinaryId,
                    data.recommended.frontmatter.bannerAlt ??
                      data.recommended.frontmatter.bannerCredit ??
                      data.recommended.frontmatter.title ??
                      'Post banner',
                  )
                : undefined
            }
            caption="Featured article"
            cta="Read full article"
            slug={data.recommended.slug}
            permalink={recommendedPermalink}
          />
        </div>
      ) : null}

      <Grid className="mb-64">
        {posts.length === 0 ? (
          <div className="flex flex-col col-span-full items-center">
            <img
              className="mt-24 w-full max-w-lg h-auto"
              {...getImgProps(images.bustedOnewheel, {
                widths: [350, 512, 1024, 1536],
                sizes: ['(max-width: 639px) 80vw', '512px'],
              })}
            />
            <H3 variant="secondary" className="mt-24 max-w-lg">
              Looks like there are no articles for this topic. Use the tags
              above to find articles.
            </H3>
          </div>
        ) : (
          posts.map(article => (
            <div key={article.slug} className="col-span-4 mb-10">
              <ArticleCard {...article} />
            </div>
          ))
        )}
      </Grid>

      {hasMorePosts ? (
        <div className="flex justify-center mb-64 w-full">
          <Button
            variant="secondary"
            onClick={() => setIndexToShow(i => i + PAGE_SIZE)}
          >
            <span>Load more articles</span> <PlusIcon />
          </Button>
        </div>
      ) : null}

      <Grid>
        <div className="col-span-full lg:col-span-5">
          <img
            {...getImgProps(images.kayak, {
              widths: [350, 512, 1024, 1536],
              sizes: [
                '80vw',
                '(min-width: 1024px) 30vw',
                '(min-width:1620px) 530px',
              ],
            })}
          />
        </div>

        <div className="col-span-full mt-4 lg:col-span-6 lg:col-start-7 lg:mt-0">
          <H2 className="mb-8">{`More of a listener?`}</H2>
          <H2 className="mb-16" variant="secondary" as="p">
            {`
              Check out my podcast Chats with Kent and learn about software
              development, career, life, and more.
            `}
          </H2>
          <ArrowLink to="/chats">{`Check out the podcast`}</ArrowLink>
        </div>
      </Grid>
    </>
  )
}

export default BlogHome

export function ErrorBoundary({error}: {error: Error}) {
  console.error(error)
  return <ServerError />
}
