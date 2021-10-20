import * as React from 'react'
import type {HeadersFunction} from 'remix'
import {useLoaderData, json, useCatch} from 'remix'
import type {MdxPage, KCDLoader, MdxListItem, KCDHandle} from '~/types'
import {
  getMdxPage,
  getMdxDirList,
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

type LoaderData = {
  page: MdxPage
  blogRecommendations: Array<MdxListItem>
}

export const handle: KCDHandle = {
  getSitemapEntries: async request => {
    const pages = await getMdxDirList('pages', {request})
    return pages.map(page => {
      return {route: `/${page.slug}`, priority: 0.6}
    })
  },
}

export const loader: KCDLoader<{slug: string}> = async ({params, request}) => {
  // because this is our catch-all thing, we'll do an early return for anything
  // that has a other route setup. The response will be handled there.
  if (pathedRoutes[new URL(request.url).pathname]) {
    return new Response()
  }

  const [page, blogRecommendations] = await Promise.all([
    getMdxPage({contentDir: 'pages', slug: params.slug}, {request}).catch(
      () => null,
    ),
    getBlogRecommendations(request),
  ])

  const headers = {
    'Cache-Control': 'private, max-age=3600',
    Vary: 'Cookie',
  }
  if (!page) {
    throw json({blogRecommendations}, {status: 404, headers})
  }
  const data: LoaderData = {page, blogRecommendations}
  return json(data, {status: 200, headers})
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export const meta = mdxPageMeta

export default function MdxScreen() {
  const data = useLoaderData<LoaderData>()
  const {code, frontmatter} = data.page
  const Component = useMdxComponent(code)

  return (
    <>
      <Grid className="mb-10 mt-24 lg:mb-24">
        <div className="flex col-span-full justify-between lg:col-span-8 lg:col-start-3">
          <BackLink to="/">Back to home</BackLink>
        </div>
      </Grid>

      <Grid as="header" className="mb-12">
        <div className="col-span-full lg:col-span-8 lg:col-start-3">
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
