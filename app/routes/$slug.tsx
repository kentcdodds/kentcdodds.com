import * as React from 'react'
import type {HeadersFunction, DataFunctionArgs} from '@remix-run/node'
import {json} from '@remix-run/node'
import {useCatch, useLoaderData} from '@remix-run/react'
import type {KCDHandle} from '~/types'
import {
  getMdxPage,
  getMdxPagesInDirectory,
  mdxPageMeta,
  useMdxComponent,
  getBannerTitleProp,
  getBannerAltProp,
} from '~/utils/mdx'
import {getBlogRecommendations} from '~/utils/blog.server'
import {FourOhFour} from '~/components/errors'
import {Grid} from '~/components/grid'
import {BackLink} from '~/components/arrow-button'
import {H2, H6} from '~/components/typography'
import {pathedRoutes} from '../other-routes.server'
import {getImageBuilder, getImgProps} from '~/images'
import {reuseUsefulLoaderHeaders} from '~/utils/misc'
import {BlurrableImage} from '~/components/blurrable-image'
import {getServerTimeHeader} from '~/utils/timing.server'

export const handle: KCDHandle = {
  getSitemapEntries: async request => {
    const pages = await getMdxPagesInDirectory('pages', {request})
    return pages
      .filter(page => !page.frontmatter.draft)
      .map(page => {
        return {route: `/${page.slug}`, priority: 0.6}
      })
  },
}

export async function loader({params, request}: DataFunctionArgs) {
  if (!params.slug) {
    throw new Error('params.slug is not defined')
  }
  // because this is our catch-all thing, we'll do an early return for anything
  // that has a other route setup. The response will be handled there.
  if (pathedRoutes[new URL(request.url).pathname]) {
    throw new Response('Use other route', {status: 404})
  }

  const timings = {}
  const page = await getMdxPage(
    {contentDir: 'pages', slug: params.slug},
    {request, timings},
  ).catch(() => null)

  const headers = {
    'Cache-Control': 'private, max-age=3600',
    Vary: 'Cookie',
    'Server-Timing': getServerTimeHeader(timings),
  }
  if (!page) {
    const blogRecommendations = await getBlogRecommendations({request, timings})
    throw json({blogRecommendations}, {status: 404, headers})
  }
  return json({page}, {status: 200, headers})
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export const meta = mdxPageMeta

export default function MdxScreen() {
  const data = useLoaderData<typeof loader>()
  const {code, frontmatter} = data.page
  const isDraft = Boolean(frontmatter.draft)
  const isArchived = Boolean(frontmatter.archived)
  const Component = useMdxComponent(code)

  return (
    <>
      <Grid className="mb-10 mt-24 lg:mb-24">
        <div className="col-span-full flex justify-between lg:col-span-8 lg:col-start-3">
          <BackLink to="/">Back to home</BackLink>
        </div>
      </Grid>

      <Grid as="header" className="mb-12">
        <div className="col-span-full lg:col-span-8 lg:col-start-3">
          {isDraft ? (
            <div className="prose prose-light mb-6 max-w-full dark:prose-dark">
              {React.createElement(
                'callout-warning',
                {},
                `This blog post is a draft. Please don't share it in its current state.`,
              )}
            </div>
          ) : null}
          {isArchived ? (
            <div className="prose prose-light mb-6 max-w-full dark:prose-dark">
              {React.createElement(
                'callout-warning',
                {},
                `This blog post is archived. It's no longer maintained and may contain outdated information.`,
              )}
            </div>
          ) : null}
          <H2>{frontmatter.title}</H2>
          {frontmatter.description ? (
            <H6 as="p" variant="secondary" className="mt-2">
              {frontmatter.description}
            </H6>
          ) : null}
        </div>
        {frontmatter.bannerCloudinaryId ? (
          <div className="col-span-full mt-10 lg:col-span-10 lg:col-start-2 lg:mt-16">
            <BlurrableImage
              key={frontmatter.bannerCloudinaryId}
              blurDataUrl={frontmatter.bannerBlurDataUrl}
              className="aspect-h-4 aspect-w-3 md:aspect-w-3 md:aspect-h-2"
              img={
                <img
                  className="rounded-lg object-cover object-center"
                  title={getBannerTitleProp(frontmatter)}
                  {...getImgProps(
                    getImageBuilder(
                      frontmatter.bannerCloudinaryId,
                      getBannerAltProp(frontmatter),
                    ),
                    {
                      widths: [280, 560, 840, 1100, 1650, 2500, 2100, 3100],
                      sizes: [
                        '(max-width:1023px) 80vw',
                        '(min-width:1024px) and (max-width:1620px) 67vw',
                        '1100px',
                      ],
                      transformations: {
                        background: 'rgb:e6e9ee',
                      },
                    },
                  )}
                />
              }
            />
          </div>
        ) : null}
      </Grid>

      <Grid as="main" className="prose prose-light dark:prose-dark">
        <Component />
      </Grid>
    </>
  )
}

export function CatchBoundary() {
  const caught = useCatch()
  console.error('CatchBoundary', caught)
  if (caught.data.blogRecommendations) {
    return <FourOhFour articles={caught.data.blogRecommendations} />
  }
  throw new Error(`Unhandled error: ${caught.status}`)
}
