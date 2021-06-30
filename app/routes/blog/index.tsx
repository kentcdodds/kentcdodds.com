import * as React from 'react'
import sortBy from 'sort-by'
import {json, useRouteData} from 'remix'
import type {HeadersFunction} from 'remix'
import type {KCDLoader, MdxListItem} from 'types'
import {useSearchParams} from 'react-router-dom'
import {Grid} from '../../components/grid'
import {images} from '../../images'
import {H2, H3, H6} from '../../components/typography'
import {SearchIcon} from '../../components/icons/search-icon'
import {Spacer} from '../../components/spacer'
import {tags} from '../../../storybook/stories/fixtures'
import {ArticleCard} from '../../components/article-card'
import {ArrowLink} from '../../components/arrow-button'
import {FeaturedArticleSection} from '../../components/sections/featured-article-section'
import {LoadMoreButton} from '../../components/load-more-button'
import {Tag} from '../../components/tag'
import {
  getMdxPagesInDirectory,
  mapFromMdxPageToMdxListItem,
} from '../../utils/mdx'

export const headers: HeadersFunction = ({loaderHeaders}) => {
  return {
    'Cache-Control': loaderHeaders.get('Cache-Control') ?? 'no-cache',
  }
}

type LoaderData = {
  posts: Array<MdxListItem>
}

export const loader: KCDLoader = async ({request}) => {
  const pages = (
    await getMdxPagesInDirectory(
      'blog',
      new URL(request.url).searchParams.get('bust-cache') === 'true',
    )
  ).sort(sortBy('-frontmatter.published'))

  const data: LoaderData = {posts: pages.map(mapFromMdxPageToMdxListItem)}
  return json(data, {
    headers: {
      'Cache-Control': 'public, max-age=60 s-maxage=3600',
    },
  })
}

export function meta() {
  return {
    title: 'Blog | Kent C. Dodds',
    description: 'This is the Kent C. Dodds blog',
  }
}

function debounce<ArgsType extends Array<unknown>, CBReturnType>(
  callback: (...args: ArgsType) => CBReturnType,
  delay: number,
) {
  let timeout: ReturnType<typeof setTimeout>
  return (...args: Parameters<typeof callback>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => callback(...args), delay)
  }
}

function useLatest<ValueType>(value: ValueType) {
  const ref = React.useRef(value)
  React.useEffect(() => {
    ref.current = value
  })
  return ref
}

function useLatestCallback<ArgsType extends Array<unknown>, CBReturnType>(
  callback: (...args: ArgsType) => CBReturnType,
) {
  const ref = useLatest(callback)
  return React.useCallback((...args: ArgsType) => ref.current(...args), [ref])
}

function useDebounce<ArgsType extends Array<unknown>, CBReturnType>(
  callback: (...args: ArgsType) => CBReturnType,
  delay: number,
) {
  const _callback = useLatestCallback(callback)
  return React.useMemo(() => debounce(_callback, delay), [delay, _callback])
}

function useIsMounted() {
  const mounted = React.useRef(false)
  React.useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  })
  return mounted
}

function BlogHome() {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchParamsRef = useLatest(searchParams)

  const isMountedRef = useIsMounted()
  const updateSearchParams = useDebounce((query: string) => {
    if (!isMountedRef.current) return
    const newSearchParams = new URLSearchParams(searchParamsRef.current)
    newSearchParams.set('q', query)
    setSearchParams(newSearchParams, {replace: true})
  }, 200)

  const data = useRouteData<LoaderData>()
  const allPosts = data.posts

  const totalPostCount = allPosts.length
  // TODO: use local state to determine how many to show...
  // because we'll just send the whole thing to the client
  // maybe... still thinking about this actually...
  const hasMorePosts = true

  const query = searchParams.get('q')?.toLowerCase() ?? ''
  // split the query string into words, to select matching category tags
  const queryParts = new Set(query.split(' '))

  const toggleTag = (tag: string) => {
    const currentParts = Array.from(queryParts)

    const nextParts = queryParts.has(tag)
      ? currentParts.filter(t => t !== tag)
      : [...currentParts, tag]

    searchParams.set('q', nextParts.join(' '))
    setSearchParams(searchParams)
  }

  const isSearching = query.trim().length > 0

  // feature the most recent post, unless we're searching
  // TODO: determine featured posts using some smarts on the backend
  // based on the user's read posts etc.
  const featured = isSearching ? null : allPosts[0]
  const posts = isSearching ? allPosts : allPosts.slice(1)

  return (
    <div>
      <Grid className="grid-rows-max-content mt-16">
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

        <div className="col-span-4 mt-6 lg:row-start-2">
          <div className="relative">
            <div className="absolute left-8 top-0 flex items-center justify-center h-full text-blueGray-500">
              <SearchIcon />
            </div>
            <input
              onChange={event =>
                updateSearchParams(event.currentTarget.value.toLowerCase())
              }
              value={query}
              placeholder="Search blog"
              aria-label="Search blog"
              className="dark:focus:bg-gray-800 placeholder-black dark:placeholder-white px-16 py-6 w-full text-black dark:text-white text-lg font-medium focus:bg-gray-100 bg-transparent border border-gray-200 dark:border-gray-600 rounded-full focus:outline-none"
            />
            <div className="absolute right-8 top-0 flex items-center justify-center h-full text-blueGray-500 text-lg font-medium">
              {totalPostCount}
            </div>
          </div>
        </div>
      </Grid>

      <Spacer size="small" />

      <Grid>
        <div className="col-span-full">
          <H6>Search blog by topics</H6>
        </div>
        <div className="flex flex-wrap col-span-full -ml-4 -mt-4 lg:col-span-10">
          {/* TODO: get tags from database */}
          {tags.map(tag => (
            <Tag
              key={tag}
              tag={tag}
              selected={queryParts.has(tag)}
              onClick={() => toggleTag(tag)}
            />
          ))}
        </div>
      </Grid>

      {featured ? (
        <>
          <Spacer size="medium" />
          <FeaturedArticleSection {...featured} />
          <Spacer size="smallest" />
        </>
      ) : null}

      <Grid>
        {isSearching ? (
          <div className="col-span-full">
            <Spacer size="smaller" />
            <H6>{totalPostCount} articles found</H6>
          </div>
        ) : null}

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
        ) : null}
        {posts.map(article => (
          <div key={article.slug} className="col-span-4 mb-10">
            <ArticleCard {...article} />
          </div>
        ))}
      </Grid>

      {/* TODO: remove this eslint-disable, it's needed because this prop does not yet come from the loader */}
      {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
      {hasMorePosts ? (
        <>
          <Spacer size="large" />
          <div className="flex justify-center w-full">
            <LoadMoreButton />
          </div>
        </>
      ) : null}

      <Spacer size="large" />

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

export default BlogHome
