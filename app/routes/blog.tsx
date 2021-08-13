import * as React from 'react'
import type {LoaderFunction, HeadersFunction, MetaFunction} from 'remix'
import {json, useLoaderData} from 'remix'
import type {KCDHandle, MdxListItem} from 'types'
import formatDate from 'date-fns/format'
import parseISO from 'date-fns/parseISO'
import {Grid} from '../components/grid'
import {getImageBuilder, getImgProps, images} from '../images'
import {H2, H3, H6} from '../components/typography'
import {SearchIcon} from '../components/icons/search-icon'
import {ArticleCard} from '../components/article-card'
import {ArrowLink} from '../components/arrow-button'
import {FeaturedSection} from '../components/sections/featured-section'
import {Tag} from '../components/tag'
import {getBlogMdxListItems} from '../utils/mdx'
import {filterPosts} from '../utils/blog'
import {useRequestInfo} from '../utils/providers'
import {HeroSection} from '../components/sections/hero-section'
import {PlusIcon} from '../components/icons/plus-icon'
import {Button} from '../components/button'
import type {Timings} from '../utils/metrics.server'
import {getServerTimeHeader} from '../utils/metrics.server'

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
  tags: Array<string>
}

export const loader: LoaderFunction = async ({request}) => {
  const timings: Timings = {}
  const posts = await getBlogMdxListItems({request, timings})

  const tags = new Set<string>()
  for (const post of posts) {
    for (const category of post.frontmatter.categories ?? []) {
      tags.add(category)
    }
  }

  const data: LoaderData = {
    posts,
    tags: Array.from(tags),
  }

  return json(data, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Server-Timing': getServerTimeHeader(timings),
    },
  })
}

export const headers: HeadersFunction = ({loaderHeaders}) => {
  return {
    'Cache-Control': loaderHeaders.get('Cache-Control') ?? 'no-cache',
    'Server-Timing': loaderHeaders.get('Server-Timing') ?? '',
  }
}

export const meta: MetaFunction = () => {
  return {
    title: 'Blog | Kent C. Dodds',
    description: 'This is the Kent C. Dodds blog',
  }
}

// should be divisible by 3 and 2 (large screen, and medium screen).
const PAGE_SIZE = 12
const initialIndexToShow = PAGE_SIZE + 1 // + 1 for the featured blog

function BlogHome() {
  const requestInfo = useRequestInfo()

  // alright, let's talk about the query params...
  // Normally with remix, you'd useSearchParams from react-router-dom
  // and updating the search params will trigger the search to update for you.
  // However, it also triggers a navigation to the new url, which will trigger
  // the loader to run which we do not want because all our data is already
  // on the client and we're just doing client-side filtering of data we
  // already have. So we manually call `window.history.pushState` to avoid
  // the router from triggering the loader.
  const [queryValue, setQuery] = React.useState<string>(() => {
    const initialSearchParams = requestInfo.searchParams
    return new URLSearchParams(initialSearchParams).get('q') ?? ''
  })
  const query = queryValue.trim()

  React.useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const oldQuery = searchParams.get('q') ?? ''
    if (query === oldQuery) return

    if (query) {
      searchParams.set('q', query)
    } else {
      searchParams.delete('q')
    }
    const newUrl = [window.location.pathname, searchParams.toString()]
      .filter(Boolean)
      .join('?')
    window.history.pushState(null, '', newUrl)
  }, [query])

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
  const postsToShow = matchingPosts.slice(0, indexToShow)

  const hasMorePosts = indexToShow < matchingPosts.length

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

  // feature the most recent post, unless we're searching
  // TODO: determine featured posts using some smarts on the backend
  // based on the user's read posts etc.
  const featured = isSearching ? null : matchingPosts[0]
  const featuredPermalink = featured
    ? `${requestInfo.origin}/blog/${featured.slug}`
    : undefined

  const posts = isSearching
    ? matchingPosts.slice(0, indexToShow)
    : postsToShow.slice(1, indexToShow)

  const visibleTags = isSearching
    ? new Set(
        matchingPosts
          .flatMap(post => post.frontmatter.categories)
          .filter(Boolean),
      )
    : new Set(data.tags)

  return (
    <>
      <HeroSection
        title="Learn development with great articles."
        subtitle="Find the latest of my writing here."
        imageBuilder={images.skis}
        action={
          <form action="/blog" method="GET" onSubmit={e => e.preventDefault()}>
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

      {featured ? (
        <div className="mb-10">
          <FeaturedSection
            subTitle={
              featured.frontmatter.date
                ? `${formatDate(
                    parseISO(featured.frontmatter.date),
                    'PPP',
                  ).toLowerCase()} — ${featured.readTime?.text ?? 'quick read'}`
                : 'TBA'
            }
            title={featured.frontmatter.title}
            imageBuilder={
              featured.frontmatter.bannerCloudinaryId
                ? getImageBuilder(
                    featured.frontmatter.bannerCloudinaryId,
                    featured.frontmatter.bannerAlt ??
                      featured.frontmatter.bannerCredit ??
                      featured.frontmatter.title ??
                      'Post banner',
                  )
                : undefined
            }
            caption="Featured article"
            cta="Read full article"
            slug={featured.slug}
            permalink={featuredPermalink}
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
          <H2 className="mb-8">
            More of a listener when it comes to learning development?
          </H2>
          <H2 className="mb-16" variant="secondary" as="p">
            Check out my podcast Chats with Kent and learn about development and
            more.
          </H2>
          <ArrowLink to="/chats">Check out the podcast</ArrowLink>
        </div>
      </Grid>
    </>
  )
}

export default BlogHome
