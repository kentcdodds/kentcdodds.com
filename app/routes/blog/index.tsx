import * as React from 'react'
import sortBy from 'sort-by'
import {json} from 'remix'
import type {HeadersFunction} from 'remix'
import type {KCDLoader} from 'types'
import {downloadMdxListItemsInDir} from '../../utils/github.server'
import {Grid} from '../../components/grid'
import {images} from '../../images'
import {H2, H6} from '../../components/typography'
import {SearchIcon} from '../../components/icons/search-icon'
import {Spacer} from '../../components/spacer'
import {articles, tags} from '../../../storybook/stories/fixtures'
import {ArticleCard} from '../../components/article-card'
import {ArrowLink} from '../../components/arrow-button'
import {FeaturedArticleSection} from '../../components/sections/featured-article-section'
import {LoadMoreButton} from '../../components/load-more-button'
import {Tag} from '../../components/tag'

export const headers: HeadersFunction = ({loaderHeaders}) => {
  return {
    'Cache-Control': loaderHeaders.get('Cache-Control') ?? 'no-cache',
  }
}

export const loader: KCDLoader = async ({request}) => {
  const posts = (
    await downloadMdxListItemsInDir(
      'blog',
      new URL(request.url).searchParams.get('bust-cache') === 'true',
    )
  ).sort(sortBy('-frontmatter.published'))

  return json(posts, {
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

const fakePostListItems = Array.from({length: 3})
  .flatMap(() => articles)
  .map((article, idx) => ({...article, articleUrl: `/blog-${idx}`}))

function BlogHome() {
  // TODO: use the real data. I used fixtures here, because real data was missing readTime, imageAlt, and only had 2 entries.
  const [featured, ...posts] = fakePostListItems // useRouteData<Array<PostListItem>>()

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

        <form className="col-span-4 mt-6 lg:row-start-2">
          <div className="relative">
            <div className="absolute left-8 top-0 flex items-center justify-center h-full text-blueGray-500">
              <SearchIcon />
            </div>
            <input
              placeholder="Search blog"
              aria-label="Search blog"
              className="dark:focus:bg-gray-800 placeholder-black dark:placeholder-white px-16 py-6 w-full text-black dark:text-white text-lg font-medium focus:bg-gray-100 bg-transparent border border-gray-200 dark:border-gray-600 rounded-full focus:outline-none"
            />
            <div className="absolute right-8 top-0 flex items-center justify-center h-full text-blueGray-500 text-lg font-medium">
              {/* TODO: replace count */}
              173
            </div>
          </div>
        </form>
      </Grid>

      <Spacer size="small" />

      <Grid>
        <div className="col-span-full">
          <H6 as="p">Search blog by topics</H6>
        </div>
        <div className="flex flex-wrap col-span-full -ml-4 -mt-4 lg:col-span-10">
          {/* TODO: get tags from database, and connect `selected` to something */}
          {tags.map((tag, idx) => (
            <Tag key={tag} tag={tag} selected={idx === 3} />
          ))}
        </div>
      </Grid>

      {/* TODO: this should be `smallest`, but `medium` looks better? */}
      <Spacer size="medium" />

      {featured ? <FeaturedArticleSection {...featured} /> : null}

      <Spacer size="smallest" />

      <Grid>
        {posts.map(article => (
          <div key={article.articleUrl} className="col-span-4 mb-10">
            <ArticleCard {...article} />
          </div>
        ))}
      </Grid>

      <Spacer size="large" />
      <div className="flex justify-center w-full">
        <LoadMoreButton />
      </div>
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
