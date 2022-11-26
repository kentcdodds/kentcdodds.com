import type {LoaderFunction} from '@remix-run/node'
import {json} from '@remix-run/node'
import {Link, useLoaderData} from '@remix-run/react'
import {getBlogMdxListItems} from '~/utils/mdx'
import {images} from '~/images'
import {Grid} from '~/components/grid'
import {H3} from '~/components/typography'
import {Spacer} from '~/components/spacer'
import {HeroSection} from '~/components/sections/hero-section'
import {RssIcon} from '~/components/icons'
import {markdownToHtmlUnwrapped} from '~/utils/markdown.server'

type LoaderData = {
  posts: Array<{title: string; descriptionHTML: string; slug: string}>
}

export const loader: LoaderFunction = async ({request}) => {
  const posts = await getBlogMdxListItems({request}).then(allPosts =>
    Promise.all(
      allPosts
        .filter(p => !p.frontmatter.draft)
        .map(async p => ({
          title: p.frontmatter.title ?? 'Untitled',
          descriptionHTML: await markdownToHtmlUnwrapped(
            p.frontmatter.description ?? 'No description',
          ),
          slug: p.slug,
        })),
    ),
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
              className="text-secondary underlined ml-2 inline-block hover:text-team-current focus:text-team-current"
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
                  </Link>{' '}
                  <span
                    className="text-secondary"
                    dangerouslySetInnerHTML={{__html: post.descriptionHTML}}
                  />
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
