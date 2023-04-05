import * as React from 'react'
import type {
  HeadersFunction,
  DataFunctionArgs,
  MetaFunction,
  SerializeFrom,
  LinksFunction,
} from '@remix-run/node'
import {json} from '@remix-run/node'
import {Link, useLoaderData, useSearchParams} from '@remix-run/react'
import clsx from 'clsx'
import {MixedCheckbox} from '@reach/checkbox'
import type {KCDHandle, Team} from '~/types'
import {useRootData} from '~/utils/use-root-data'
import {Grid} from '~/components/grid'
import {
  getImageBuilder,
  getImgProps,
  getSocialImageWithPreTitle,
  images,
} from '~/images'
import {H2, H3, H6, Paragraph} from '~/components/typography'
import {SearchIcon, PlusIcon, RssIcon} from '~/components/icons'
import {ArticleCard} from '~/components/article-card'
import {ArrowLink} from '~/components/arrow-button'
import {FeaturedSection} from '~/components/sections/featured-section'
import {Tag} from '~/components/tag'
import {getBlogMdxListItems, getBannerAltProp} from '~/utils/mdx'
import {filterPosts, getRankingLeader} from '~/utils/blog'
import {HeroSection} from '~/components/sections/hero-section'
import {Button} from '~/components/button'
import {ServerError} from '~/components/errors'
import {
  formatAbbreviatedNumber,
  formatNumber,
  getDisplayUrl,
  getUrl,
  isTeam,
  reuseUsefulLoaderHeaders,
  useUpdateQueryStringValueWithoutNavigation,
} from '~/utils/misc'
import {TeamStats} from '~/components/team-stats'
import {Spacer} from '~/components/spacer'
import {
  getAllBlogPostReadRankings,
  getBlogReadRankings,
  getBlogRecommendations,
  getReaderCount,
  getSlugReadsByUser,
  getTotalPostReads,
} from '~/utils/blog.server'
import {useTeam} from '~/utils/team-provider'
import type {LoaderData as RootLoaderData} from '../root'
import {getSocialMetas} from '~/utils/seo'
import {getServerTimeHeader} from '~/utils/timing.server'

const handleId = 'blog'
export const handle: KCDHandle = {
  id: handleId,
  getSitemapEntries: () => [{route: `/blog`, priority: 0.7}],
}

export const links: LinksFunction = () => {
  return [
    {
      rel: 'alternate',
      type: 'application/rss+xml',
      title: 'Kent C. Dodds Blog',
      href: '/blog/rss.xml',
    },
  ]
}

export async function loader({request}: DataFunctionArgs) {
  const timings = {}
  const [
    posts,
    [recommended],
    readRankings,
    totalReads,
    totalBlogReaders,
    allPostReadRankings,
    userReads,
  ] = await Promise.all([
    getBlogMdxListItems({request}).then(allPosts =>
      allPosts.filter(p => !p.frontmatter.draft),
    ),
    getBlogRecommendations({request, limit: 1, timings}),
    getBlogReadRankings({request, timings}),
    getTotalPostReads({request, timings}),
    getReaderCount({request, timings}),
    getAllBlogPostReadRankings({request, timings}),
    getSlugReadsByUser({request, timings}),
  ])

  const tags = new Set<string>()
  for (const post of posts) {
    for (const category of post.frontmatter.categories ?? []) {
      tags.add(category)
    }
  }

  const data = {
    posts,
    recommended,
    readRankings,
    allPostReadRankings,
    totalReads: formatAbbreviatedNumber(totalReads),
    totalBlogReaders: formatAbbreviatedNumber(totalBlogReaders),
    userReads,
    tags: Array.from(tags),
    overallLeadingTeam: getRankingLeader(readRankings)?.team ?? null,
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
  const {requestInfo} = parentsData.root as RootLoaderData
  const {totalBlogReaders, posts} = data as SerializeFrom<typeof loader>

  return {
    ...getSocialMetas({
      title: 'The Kent C. Dodds Blog',
      description: `Join ${totalBlogReaders} people who have read Kent's ${formatNumber(
        posts.length,
      )} articles on JavaScript, TypeScript, React, Testing, Career, and more.`,
      keywords:
        'JavaScript, TypeScript, React, Testing, Career, Software Development, Kent C. Dodds Blog',
      url: getUrl(requestInfo),
      image: getSocialImageWithPreTitle({
        url: getDisplayUrl(requestInfo),
        featuredImage: images.skis.id,
        preTitle: 'Check out this Blog',
        title: `Priceless insights, ideas, and experiences for your dev work`,
      }),
    }),
  }
}

// should be divisible by 3 and 2 (large screen, and medium screen).
const PAGE_SIZE = 12
const initialIndexToShow = PAGE_SIZE

const specialQueryRegex = /(?<not>!)?leader:(?<team>\w+)(\s|$)?/g

function BlogHome() {
  const {requestInfo} = useRootData()
  const [searchParams] = useSearchParams()
  const [userReadsState, setUserReadsState] = React.useState<
    'read' | 'unread' | 'unset'
  >('unset')
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  const [userTeam] = useTeam()

  const resultsRef = React.useRef<HTMLDivElement>(null)
  /**
   * This is here to make sure that a user doesn't hit "enter" on the search
   * button, which focuses the input and then keyup the enter on the input
   * which will trigger the scroll down. We should *only* scroll when the
   * "enter" keypress and keyup happen on the input.
   */
  const ignoreInputKeyUp = React.useRef<boolean>(false)
  const [queryValue, setQuery] = React.useState<string>(() => {
    return searchParams.get('q') ?? ''
  })
  const query = queryValue.trim()

  useUpdateQueryStringValueWithoutNavigation('q', query)

  const data = useLoaderData<typeof loader>()
  const {posts: allPosts, userReads} = data

  const getLeadingTeamForSlug = React.useCallback(
    (slug: string) => {
      return getRankingLeader(data.allPostReadRankings[slug])?.team
    },
    [data.allPostReadRankings],
  )

  const regularQuery = query.replace(specialQueryRegex, '').trim()

  const matchingPosts = React.useMemo(() => {
    const r = new RegExp(specialQueryRegex)
    let match = r.exec(query)
    const leaders: Array<Team> = []
    const nonLeaders: Array<Team> = []
    while (match) {
      const {team, not} = match.groups ?? {}
      const upperTeam = team?.toUpperCase()
      if (isTeam(upperTeam)) {
        if (not) {
          nonLeaders.push(upperTeam)
        } else {
          leaders.push(upperTeam)
        }
      }
      match = r.exec(query)
    }

    let filteredPosts = allPosts

    filteredPosts =
      userReadsState === 'unset'
        ? filteredPosts
        : filteredPosts.filter(post => {
            const isRead = userReads.includes(post.slug)
            if (userReadsState === 'read' && !isRead) return false
            if (userReadsState === 'unread' && isRead) return false
            return true
          })

    filteredPosts =
      leaders.length || nonLeaders.length
        ? filteredPosts.filter(post => {
            const leader = getLeadingTeamForSlug(post.slug)
            if (leaders.length && leader && leaders.includes(leader)) {
              return true
            }
            if (
              nonLeaders.length &&
              (!leader || !nonLeaders.includes(leader))
            ) {
              return true
            }
            return false
          })
        : filteredPosts

    return filterPosts(filteredPosts, regularQuery)
  }, [
    allPosts,
    query,
    regularQuery,
    getLeadingTeamForSlug,
    userReadsState,
    userReads,
  ])

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

  function toggleTeam(team: string) {
    team = team.toLowerCase()
    let newSpecialQuery = ''
    if (query.includes(`!leader:${team}`)) {
      newSpecialQuery = ''
    } else if (query.includes(`leader:${team}`)) {
      newSpecialQuery = `!leader:${team}`
    } else {
      newSpecialQuery = `leader:${team}`
    }
    setQuery(`${newSpecialQuery} ${regularQuery}`.trim())
  }

  const isSearching = query.length > 0 || userReadsState !== 'unset'

  const posts = isSearching
    ? matchingPosts.slice(0, indexToShow)
    : matchingPosts
        .filter(p => p.slug !== data.recommended?.slug)
        .slice(0, indexToShow)

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

  // this is a remix bug
  // eslint-disable-next-line
  const recommendedPermalink = data.recommended
    ? `${requestInfo.origin}/blog/${data.recommended.slug}`
    : undefined

  const checkboxLabel =
    userReadsState === 'read'
      ? 'Showing only posts you have not read'
      : userReadsState === 'unread'
      ? `Showing only posts you have read`
      : `Showing all posts`

  const searchInputPlaceholder =
    userReadsState === 'read'
      ? 'Search posts you have read'
      : userReadsState === 'unread'
      ? 'Search posts you have not read'
      : 'Search posts'

  return (
    <div
      className={
        data.overallLeadingTeam
          ? `set-color-team-current-${data.overallLeadingTeam.toLowerCase()}`
          : ''
      }
    >
      <HeroSection
        title="Learn development with great articles."
        subtitle={
          <>
            <span>{`Find the latest of my writing here.`}</span>
            <Link
              reloadDocument
              to="rss.xml"
              className="text-secondary underlined ml-2 inline-block hover:text-team-current focus:text-team-current"
            >
              <RssIcon title="Get my blog as RSS" />
            </Link>
          </>
        }
        imageBuilder={images.skis}
        action={
          <div className="w-full">
            <form
              action="/blog"
              method="GET"
              onSubmit={e => e.preventDefault()}
            >
              <div className="relative">
                <button
                  title={query === '' ? 'Search' : 'Clear search'}
                  type="button"
                  onClick={() => {
                    setQuery('')
                    ignoreInputKeyUp.current = true
                    searchInputRef.current?.focus()
                  }}
                  onKeyDown={() => {
                    ignoreInputKeyUp.current = true
                  }}
                  onKeyUp={() => {
                    ignoreInputKeyUp.current = false
                  }}
                  className={clsx(
                    'absolute left-6 top-0 flex h-full items-center justify-center border-none bg-transparent p-0 text-slate-500',
                    {
                      'cursor-pointer': query !== '',
                      'cursor-default': query === '',
                    },
                  )}
                >
                  <SearchIcon />
                </button>
                <input
                  ref={searchInputRef}
                  type="search"
                  value={queryValue}
                  onChange={event =>
                    setQuery(event.currentTarget.value.toLowerCase())
                  }
                  onKeyUp={e => {
                    if (!ignoreInputKeyUp.current && e.key === 'Enter') {
                      resultsRef.current
                        ?.querySelector('a')
                        ?.focus({preventScroll: true})
                      resultsRef.current?.scrollIntoView({behavior: 'smooth'})
                    }
                    ignoreInputKeyUp.current = false
                  }}
                  name="q"
                  placeholder={searchInputPlaceholder}
                  className="text-primary bg-primary border-secondary focus:bg-secondary w-full appearance-none rounded-full border py-6 pl-14 pr-6 text-lg font-medium hover:border-team-current focus:border-team-current focus:outline-none md:pr-24"
                />
                <div className="absolute right-6 top-0 hidden h-full w-14 items-center justify-between text-lg font-medium text-slate-500 md:flex">
                  <MixedCheckbox
                    title={checkboxLabel}
                    aria-label={checkboxLabel}
                    onChange={() => {
                      setUserReadsState(s => {
                        if (s === 'unset') return 'unread'
                        if (s === 'unread') return 'read'
                        return 'unset'
                      })
                    }}
                    checked={
                      userReadsState === 'unset'
                        ? 'mixed'
                        : userReadsState === 'read'
                    }
                  />
                  <div className="flex-1" />
                  {matchingPosts.length}
                </div>
              </div>
            </form>
          </div>
        }
      />

      <Grid className="mb-14">
        <div className="relative col-span-full h-20">
          <div className="absolute">
            <TeamStats
              totalReads={data.totalReads}
              rankings={data.readRankings}
              pull="left"
              direction="down"
              onStatClick={toggleTeam}
            />
          </div>
        </div>

        <Spacer size="2xs" className="col-span-full" />

        <Paragraph className="col-span-full" prose={false}>
          {data.overallLeadingTeam ? (
            <>
              {`The `}
              <strong
                className={`text-team-current set-color-team-current-${data.overallLeadingTeam.toLowerCase()}`}
              >
                {data.overallLeadingTeam.toLowerCase()}
              </strong>
              {` team is in the lead. `}
              {userTeam === 'UNKNOWN' ? (
                <>
                  <Link to="/login" className="underlined">
                    Login or sign up
                  </Link>
                  {` to choose your team!`}
                </>
              ) : userTeam === data.overallLeadingTeam ? (
                `That's your team! Keep your lead!`
              ) : (
                <>
                  {`Keep reading to get the `}
                  <strong
                    className={`text-team-current set-color-team-current-${userTeam.toLowerCase()}`}
                  >
                    {userTeam.toLowerCase()}
                  </strong>{' '}
                  {` team on top!`}
                </>
              )}
            </>
          ) : (
            `No team is in the lead! Read read read!`
          )}
        </Paragraph>

        <Spacer size="xs" className="col-span-full" />

        {data.tags.length > 0 ? (
          <>
            <H6 as="div" className="col-span-full mb-6">
              Search blog by topics
            </H6>
            <div className="col-span-full -mb-4 -mr-4 flex flex-wrap lg:col-span-10">
              {data.tags.map(tag => {
                const selected = regularQuery.includes(tag)
                return (
                  <Tag
                    key={tag}
                    tag={tag}
                    selected={selected}
                    onClick={() => toggleTag(tag)}
                    disabled={
                      Boolean(!visibleTags.has(tag)) ? !selected : false
                    }
                  />
                )
              })}
            </div>
          </>
        ) : null}
      </Grid>

      {/* this is a remix bug */}
      {/* eslint-disable-next-line */}
      {!isSearching && data.recommended ? (
        <div className="mb-10">
          <FeaturedSection
            subTitle={[
              data.recommended.dateDisplay,
              data.recommended.readTime?.text ?? 'quick read',
            ]
              .filter(Boolean)
              .join(' — ')}
            title={data.recommended.frontmatter.title}
            blurDataUrl={data.recommended.frontmatter.bannerBlurDataUrl}
            imageBuilder={
              data.recommended.frontmatter.bannerCloudinaryId
                ? getImageBuilder(
                    data.recommended.frontmatter.bannerCloudinaryId,
                    getBannerAltProp(data.recommended.frontmatter),
                  )
                : undefined
            }
            caption="Featured article"
            cta="Read full article"
            slug={data.recommended.slug}
            permalink={recommendedPermalink}
            leadingTeam={getLeadingTeamForSlug(data.recommended.slug)}
          />
        </div>
      ) : null}

      <Grid className="mb-64" ref={resultsRef}>
        {posts.length === 0 ? (
          <div className="col-span-full flex flex-col items-center">
            <img
              className="mt-24 h-auto w-full max-w-lg"
              {...getImgProps(images.bustedOnewheel, {
                widths: [350, 512, 1024, 1536],
                sizes: ['(max-width: 639px) 80vw', '512px'],
              })}
            />
            <H3 as="p" variant="secondary" className="mt-24 max-w-lg">
              {`Couldn't find anything to match your criteria. Sorry.`}
            </H3>
          </div>
        ) : (
          posts.map(article => (
            <div key={article.slug} className="col-span-4 mb-10">
              <ArticleCard
                article={article}
                leadingTeam={getLeadingTeamForSlug(article.slug)}
              />
            </div>
          ))
        )}
      </Grid>

      {hasMorePosts ? (
        <div className="mb-64 flex w-full justify-center">
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
    </div>
  )
}

export default BlogHome

export function ErrorBoundary({error}: {error: Error}) {
  console.error(error)
  return <ServerError />
}

/*
eslint
  complexity: "off",
*/
