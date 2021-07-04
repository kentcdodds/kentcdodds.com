import * as React from 'react'
import type {LoaderFunction, HeadersFunction, MetaFunction} from 'remix'
import {json, useRouteData} from 'remix'
import type {MdxListItem} from 'types'
import {matchSorter, rankings as matchSorterRankings} from 'match-sorter'
import {Grid} from '../../components/grid'
import {images} from '../../images'
import {H2, H3, H6} from '../../components/typography'
import {SearchIcon} from '../../components/icons/search-icon'
import {ArticleCard} from '../../components/article-card'
import {ArrowLink} from '../../components/arrow-button'
import {FeaturedArticleSection} from '../../components/sections/featured-article-section'
import {Tag} from '../../components/tag'
import {
  getMdxPagesInDirectory,
  mapFromMdxPageToMdxListItem,
} from '../../utils/mdx'
import {useRequestInfo} from '../../utils/providers'

type LoaderData = {
  posts: Array<MdxListItem>
  tags: Array<string>
}

export const loader: LoaderFunction = async ({request}) => {
  const url = new URL(request.url)
  let pages = await getMdxPagesInDirectory(
    'blog',
    url.searchParams.get('bust-cache') === 'true',
  )

  pages = pages.sort((a, z) => {
    const aTime = new Date(a.frontmatter.date ?? '').getTime()
    const zTime = new Date(z.frontmatter.date ?? '').getTime()
    return aTime > zTime ? -1 : aTime === zTime ? 0 : 1
  })

  const tags = new Set<string>()
  for (const page of pages) {
    for (const category of page.frontmatter.categories ?? []) {
      tags.add(category)
    }
  }

  const data: LoaderData = {
    posts: pages.map(mapFromMdxPageToMdxListItem),
    tags: Array.from(tags),
  }

  return json(data, {
    headers: {
      'Cache-Control': 'public, max-age=60',
    },
  })
}

export const headers: HeadersFunction = ({loaderHeaders}) => {
  return {
    'Cache-Control': loaderHeaders.get('Cache-Control') ?? 'no-cache',
  }
}

export const meta: MetaFunction = () => {
  return {
    title: 'Blog | Kent C. Dodds',
    description: 'This is the Kent C. Dodds blog',
  }
}

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

  const data = useRouteData<LoaderData>()
  const allPosts = data.posts
  const matchingPosts = React.useMemo(() => {
    return filterPosts(allPosts, query)
  }, [allPosts, query])

  const initialIndexToShow = 14
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
  const posts = isSearching
    ? matchingPosts.slice(0, indexToShow)
    : postsToShow.slice(1, indexToShow)

  return (
    <div>
      <Grid className="grid-rows-max-content mb-36 mt-16">
        <div className="col-span-full lg:col-span-6 lg:col-start-7 lg:row-span-2">
          <img
            className="max-h-[50vh] mx-auto lg:max-w-md"
            src={images.skis.src}
            alt={images.skis.alt}
          />
        </div>

        <div className="col-span-full lg:col-span-6 lg:row-start-1">
          <div className="space-y-2 lg:max-w-sm">
            <H2>Learn development with great articles.</H2>
            <H2 variant="secondary" as="p">
              Find the latest of my writing here.
            </H2>
          </div>
        </div>

        <div className="col-span-4 mt-12 lg:row-start-2">
          <div className="relative">
            <div className="absolute left-8 top-0 flex items-center justify-center h-full text-blueGray-500">
              <SearchIcon />
            </div>
            <form
              action="/blog"
              method="GET"
              onSubmit={e => e.preventDefault()}
            >
              <input
                value={queryValue}
                onChange={event =>
                  setQuery(event.currentTarget.value.toLowerCase())
                }
                name="q"
                placeholder="Search blog"
                aria-label="Search blog"
                className="dark:focus:bg-gray-800 placeholder-black dark:placeholder-white px-16 py-6 w-full text-black dark:text-white text-lg font-medium focus:bg-gray-100 bg-transparent border border-gray-200 dark:border-gray-600 rounded-full focus:outline-none"
              />
            </form>
            <div className="absolute right-8 top-0 flex items-center justify-center h-full text-blueGray-500 text-lg font-medium">
              {matchingPosts.length}
            </div>
          </div>
        </div>
      </Grid>

      {data.tags.length > 0 ? (
        <Grid className="mb-14">
          <H6 className="col-span-full mb-6">Search blog by topics</H6>
          <div className="flex flex-wrap col-span-full -mb-4 -mr-4 lg:col-span-10">
            {data.tags.map(tag => (
              <Tag
                key={tag}
                tag={tag}
                selected={query.includes(tag)}
                onClick={() => toggleTag(tag)}
              />
            ))}
          </div>
        </Grid>
      ) : null}

      {featured ? (
        <div className="mb-10">
          <FeaturedArticleSection {...featured} />
        </div>
      ) : null}

      <Grid className="mb-64">
        {posts.length === 0 ? (
          <div className="flex flex-col col-span-full items-center">
            {/* TODO: replace with 404 image */}
            <img
              src={images.onewheel.src}
              alt={images.onewheel.alt}
              className="mt-24 w-full max-w-lg h-auto"
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
          <button
            onClick={() => setIndexToShow(i => i + 16)}
            className="dark:focus:bg-gray-800 flex items-center px-8 py-6 dark:text-white focus:bg-gray-100 bg-transparent border border-gray-200 dark:border-gray-600 rounded-full focus:outline-none"
          >
            {/* TODO: an svg plus often looks better. */}
            Load more articles +
          </button>
        </div>
      ) : null}

      <Grid>
        <div className="col-span-full lg:col-span-5">
          <img src={images.kayak.src} alt={images.kayak.alt} />
        </div>

        <div className="col-span-full mt-4 space-y-4 lg:col-span-6 lg:col-start-7 lg:mt-0">
          <H2>More of a listener when it comes to learning development?</H2>
          <H2 variant="secondary" as="p">
            Check out my podcast Chats with Kent and learn about development and
            more.
          </H2>
          <ArrowLink to="/podcast">Check out the podcast</ArrowLink>
        </div>
      </Grid>
    </div>
  )
}

export function filterPosts(posts: Array<MdxListItem>, searchString: string) {
  if (!searchString) return posts

  const options = {
    keys: [
      {
        key: 'frontmatter.title',
        threshold: matchSorterRankings.CONTAINS,
      },
      {
        key: 'frontmatter.categories',
        threshold: matchSorterRankings.CONTAINS,
        maxRanking: matchSorterRankings.CONTAINS,
      },
      {
        key: 'frontmatter.meta.keywords',
        threshold: matchSorterRankings.CONTAINS,
        maxRanking: matchSorterRankings.CONTAINS,
      },
      {
        key: 'frontmatter.description',
        threshold: matchSorterRankings.CONTAINS,
        maxRanking: matchSorterRankings.CONTAINS,
      },
    ],
  }

  const allResults = matchSorter(posts, searchString, options)
  const searches = new Set(searchString.split(' '))
  if (searches.size < 2) {
    // if there's only one word then we're done
    return allResults
  }

  // if there are multiple words, we'll conduct an individual search for each word
  const [firstWord, ...restWords] = searches.values()
  if (!firstWord) {
    // this should be impossible, but if it does happen, we'll just return an empty array
    return []
  }
  const individualWordOptions = {
    ...options,
    keys: options.keys.map(key => {
      return {
        ...key,
        maxRanking: matchSorterRankings.CASE_SENSITIVE_EQUAL,
        threshold: matchSorterRankings.WORD_STARTS_WITH,
      }
    }),
  }

  // go through each word and further filter the results
  let individualWordResults = matchSorter(
    posts,
    firstWord,
    individualWordOptions,
  )
  for (const word of restWords) {
    const searchResult = matchSorter(
      individualWordResults,
      word,
      individualWordOptions,
    )
    individualWordResults = individualWordResults.filter(r =>
      searchResult.includes(r),
    )
  }
  return Array.from(new Set([...allResults, ...individualWordResults]))
}

export default BlogHome
