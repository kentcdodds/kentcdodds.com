import * as React from 'react'
import {json, useLoaderData, Link} from 'remix'
import type {LoaderFunction} from 'remix'
import {getBlogMdxListItems} from '~/utils/mdx'
import {images} from '~/images'
import {Grid} from '~/components/grid'
import {H3} from '~/components/typography'
import {Spacer} from '~/components/spacer'
import {HeroSection} from '~/components/sections/hero-section'
import {RssIcon} from '~/components/icons/rss-icon'

type LoaderData = {
  posts: Array<{title: string; description: string; slug: string}>
}

export const loader: LoaderFunction = async ({request}) => {
  const posts = await getBlogMdxListItems({request}).then(allPosts =>
    allPosts
      .filter(p => !p.frontmatter.draft)
      .map(p => ({
        title: p.frontmatter.title ?? 'Untitled',
        description: p.frontmatter.description ?? 'No description',
        slug: p.slug,
      })),
  )

  const data: LoaderData = {posts}

  return json(data, {
    headers: {
      'Cache-Control': 'private, max-age=3600',
      Vary: 'Cookie',
    },
  })
}

export default function BlogList() {
  const data = useLoaderData<LoaderData>()

  return (
    <div>
      <HeroSection
        title="Blog post list"
        subtitle={
          <>
            <span>{`For folks wanting something a bit more scrollable.`}</span>
            <Link
              reloadDocument
              to="rss.xml"
              className="text-secondary underlined inline-block ml-2 hover:text-team-current focus:text-team-current"
            >
              <RssIcon title="Get my blog as RSS" />
            </Link>
          </>
        }
        arrowUrl="#posts"
        arrowLabel={`${data.posts.length} Total Posts`}
        imageBuilder={images.skis}
      />
      <Grid as="main">
        <div className="col-span-full" id="posts">
          <H3>Posts</H3>
          <Spacer size="2xs" />
          <div>
            <ul className="list-inside list-disc">
              {data.posts.map(post => (
                <li key={post.slug} className="leading-loose">
                  <Link to={`/blog/${post.slug}`} className="text-xl">
                    {post.title}
                  </Link>
                  <span className="text-secondary"> {post.description}</span>
                </li>
              ))}
            </ul>
            <Spacer size="3xs" />
          </div>
        </div>
      </Grid>
    </div>
  )
}
