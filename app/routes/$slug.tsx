import {
  json,
  type DataFunctionArgs,
  type HeadersFunction,
} from '@remix-run/node'
import {isRouteErrorResponse, useLoaderData} from '@remix-run/react'
import * as React from 'react'
import {BackLink} from '~/components/arrow-button.tsx'
import {BlurrableImage} from '~/components/blurrable-image.tsx'
import {FourOhFour} from '~/components/errors.tsx'
import {Grid} from '~/components/grid.tsx'
import {H2, H6} from '~/components/typography.tsx'
import {getImageBuilder, getImgProps} from '~/images.tsx'
import {pathedRoutes} from '~/other-routes.server.ts'
import {type KCDHandle} from '~/types.ts'
import {getBlogRecommendations} from '~/utils/blog.server.ts'
import {getMdxPage, getMdxPagesInDirectory} from '~/utils/mdx.server'
import {
  getBannerAltProp,
  getBannerTitleProp,
  mdxPageMeta,
  useMdxComponent,
} from '~/utils/mdx.tsx'
import {reuseUsefulLoaderHeaders, useCapturedRouteError} from '~/utils/misc.tsx'
import {getServerTimeHeader} from '~/utils/timing.server.ts'
import {serverOnly$} from 'vite-env-only'

export const handle: KCDHandle = {
  getSitemapEntries: serverOnly$(async request => {
    const pages = await getMdxPagesInDirectory('pages', {request})
    return pages
      .filter(page => !page.frontmatter.draft)
      .map(page => {
        return {route: `/${page.slug}`, priority: 0.6}
      })
  }),
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
              className="aspect-[3/4] md:aspect-[3/2] md:aspect-1"
              img={
                <img
                  title={getBannerTitleProp(frontmatter)}
                  {...getImgProps(
                    getImageBuilder(
                      frontmatter.bannerCloudinaryId,
                      getBannerAltProp(frontmatter),
                    ),
                    {
                      className: 'rounded-lg object-cover object-center w-full',
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

export function ErrorBoundary() {
  const error = useCapturedRouteError()
  if (isRouteErrorResponse(error)) {
    console.error('CatchBoundary', error)
    if (error.data.blogRecommendations) {
      return <FourOhFour articles={error.data.blogRecommendations} />
    }
    throw new Error(`Unhandled error: ${error.status}`)
  }
}
