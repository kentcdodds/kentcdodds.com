import * as React from 'react'
import type {HeadersFunction} from 'remix'
import {useLoaderData, json} from 'remix'
import type {MdxPage, KCDLoader, MdxListItem, KCDHandle} from '~/types'
import {
  getMdxPage,
  getMdxDirList,
  mdxPageMeta,
  useMdxComponent,
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
  page: MdxPage | null
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

  const page = await getMdxPage(
    {contentDir: 'pages', slug: params.slug},
    {request},
  ).catch(() => null)
  const blogRecommendations = await getBlogRecommendations(request)

  const data: LoaderData = {page, blogRecommendations}
  const headers = {
    'Cache-Control': 'public, max-age=3600',
  }
  return json(data, {status: page ? 200 : 404, headers})
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export const meta = mdxPageMeta

export default function MdxScreenBase() {
  const data = useLoaderData<LoaderData>()

  if (data.page) return <MdxScreen mdxPage={data.page} />
  else return <FourOhFour articles={data.blogRecommendations} />
}

function MdxScreen({mdxPage}: {mdxPage: MdxPage}) {
  const {code, frontmatter} = mdxPage
  const Component = useMdxComponent(code)

  return (
    <>
      <Grid className="mb-10 mt-24 lg:mb-24">
        <div className="flex col-span-full justify-between lg:col-span-8 lg:col-start-3">
          <BackLink to="/">Back to home</BackLink>
        </div>
      </Grid>

      <Grid className="mb-12">
        <div className="col-span-full lg:col-span-8 lg:col-start-3">
          <H2>{frontmatter.title}</H2>
          {frontmatter.description ? (
            <H6 as="p" variant="secondary" className="mt-2">
              {frontmatter.description}
            </H6>
          ) : null}
        </div>
        {frontmatter.bannerCloudinaryId ? (
          <BlurrableImage
            key={frontmatter.bannerCloudinaryId}
            blurDataUrl={frontmatter.bannerBlurDataUrl}
            className="aspect-h-4 aspect-w-3 md:aspect-w-3 md:aspect-h-2 col-span-full mt-10 mx-auto rounded-lg lg:col-span-10 lg:col-start-2"
            img={
              <img
                className="rounded-lg"
                title={frontmatter.bannerCredit}
                {...getImgProps(
                  getImageBuilder(
                    frontmatter.bannerCloudinaryId,
                    frontmatter.bannerAlt ??
                      frontmatter.bannerCredit ??
                      frontmatter.title ??
                      'Post banner',
                  ),
                  {
                    widths: [280, 560, 840, 1100, 1650, 2500, 2100, 3100],
                    sizes: [
                      '(max-width:1023px) 80vw',
                      '(min-width:1024px) and (max-width:1620px) 67vw',
                      '1100px',
                    ],
                  },
                )}
              />
            }
          />
        ) : null}
      </Grid>

      <Grid className="prose prose-light dark:prose-dark">
        <Component />
      </Grid>
    </>
  )
}
