import * as React from 'react'
import {useLoaderData, json, useFetcher, ActionFunction} from 'remix'
import type {HeadersFunction} from 'remix'
import {Link, useParams} from 'react-router-dom'
import type {Await, KCDHandle, KCDLoader, MdxListItem, MdxPage} from '~/types'
import {getImageBuilder, getImgProps, images} from '~/images'
import {
  getMdxDirList,
  getMdxPage,
  mdxPageMeta,
  useMdxComponent,
} from '~/utils/mdx'
import {H2, H6, Paragraph} from '~/components/typography'
import {Grid} from '~/components/grid'
import {ArrowLink, BackLink} from '~/components/arrow-button'
import {BlogSection} from '~/components/sections/blog-section'
import {
  getBlogReadRankings,
  getTotalPostReads,
  getBlogRecommendations,
} from '~/utils/blog.server'
import {FourOhFour, ServerError} from '~/components/errors'
import {externalLinks} from '../external-links'
import {TeamStats} from '~/components/team-stats'
import type {Timings} from '~/utils/metrics.server'
import {getServerTimeHeader} from '~/utils/metrics.server'
import {useRequestInfo} from '~/utils/providers'
import {formatDate, formatNumber, reuseUsefulLoaderHeaders} from '~/utils/misc'
import {BlurrableImage} from '~/components/blurrable-image'
import {getSession} from '~/utils/session.server'
import {addPostRead} from '~/utils/prisma.server'
import {getClientSession} from '~/utils/client.server'

export const handle: KCDHandle = {
  getSitemapEntries: async request => {
    const pages = await getMdxDirList('blog', {request})
    return pages.map(page => {
      return {route: `/blog/${page.slug}`, priority: 0.7}
    })
  },
}

export const action: ActionFunction = async ({request}) => {
  const params = await request.json()
  if (!params.articleSlug) {
    return new Response('', {status: 404})
  }
  const session = await getSession(request)
  const user = await session.getUser()
  const headers = new Headers()
  if (user) {
    await addPostRead({
      slug: params.articleSlug,
      userId: user.id,
    })
    await session.getHeaders(headers)
  } else {
    const client = await getClientSession(request)
    await addPostRead({
      slug: params.articleSlug,
      clientId: client.getClientId(),
    })
    await client.getHeaders(headers)
  }
  return json({success: true})
}

type LoaderData = {
  page: MdxPage | null
  recommendations: Array<MdxListItem>
  readRankings: Await<ReturnType<typeof getBlogReadRankings>>
  totalReads: string
}

export const loader: KCDLoader<{slug: string}> = async ({request, params}) => {
  const timings: Timings = {}
  const page = await getMdxPage(
    {
      contentDir: 'blog',
      slug: params.slug,
    },
    {request, timings},
  )

  const [recommendations, readRankings, totalReads] = await Promise.all([
    getBlogRecommendations(request, {
      limit: 3,
      keywords: [
        ...(page?.frontmatter.categories ?? []),
        ...(page?.frontmatter.meta?.keywords ?? []),
      ],
      exclude: [params.slug],
    }),
    getBlogReadRankings(request, params.slug),
    getTotalPostReads(request, params.slug),
  ])

  const data: LoaderData = {
    page,
    recommendations,
    readRankings,
    totalReads: formatNumber(totalReads),
  }
  const headers = {
    'Cache-Control': 'private, max-age=3600',
    'Server-Timing': getServerTimeHeader(timings),
  }

  return json(data, {status: page ? 200 : 404, headers})
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export const meta = mdxPageMeta

export default function MdxScreenBase() {
  const data = useLoaderData<LoaderData>()

  if (data.page) return <MdxScreen />
  else return <FourOhFour articles={data.recommendations} />
}

function useOnRead({
  parentElRef,
  readTime,
  onRead,
}: {
  parentElRef: React.RefObject<HTMLElement>
  readTime: MdxPage['readTime']
  onRead: () => void
}) {
  React.useEffect(() => {
    const parentEl = parentElRef.current
    const time = readTime?.time
    if (!parentEl || !time) return

    const visibilityEl = document.createElement('div')

    let scrolledTheMain = false
    const observer = new IntersectionObserver(entries => {
      const isVisible = entries.some(entry => {
        return entry.target === visibilityEl && entry.isIntersecting
      })
      if (isVisible) {
        scrolledTheMain = true
        maybeMarkAsRead()
        observer.disconnect()
        visibilityEl.remove()
      }
    })

    let startTime = new Date().getTime()
    let timeoutTime = time * 0.6
    let timerId: ReturnType<typeof setTimeout>
    let timerFinished = false
    function startTimer() {
      timerId = setTimeout(() => {
        timerFinished = true
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        maybeMarkAsRead()
      }, timeoutTime)
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        clearTimeout(timerId)
        const timeElapsedSoFar = new Date().getTime() - startTime
        timeoutTime = timeoutTime - timeElapsedSoFar
      } else {
        startTime = new Date().getTime()
        startTimer()
      }
    }

    function maybeMarkAsRead() {
      if (timerFinished && scrolledTheMain) {
        cleanup()
        onRead()
      }
    }

    // dirty-up
    parentEl.append(visibilityEl)
    observer.observe(visibilityEl)
    startTimer()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    function cleanup() {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearTimeout(timerId)
      observer.disconnect()
      visibilityEl.remove()
    }
    return cleanup
  }, [readTime, onRead, parentElRef])
}

function ArticleFooter({
  permalink,
  title = 'an awesome post',
}: {
  permalink: string
  title?: string
}) {
  return (
    <Grid>
      <div className="flex flex-col flex-wrap gap-2 col-span-full justify-between mb-12 pb-12 text-blueGray-500 text-lg font-medium border-b border-gray-600 lg:flex-row lg:col-span-8 lg:col-start-3 lg:pb-6">
        <div className="flex space-x-5">
          <a
            className="dark:hover:text-white underlined dark:focus:text-white hover:text-black focus:text-black focus:outline-none"
            target="_blank"
            rel="noreferrer noopener"
            href={`https://twitter.com/intent/tweet?${new URLSearchParams({
              url: permalink,
              text: `I just read ${title} by @kentcdodds`,
            })}`}
          >
            Tweet this article
          </a>
        </div>

        <div className="flex">
          <Link
            className="underlined dark:hover:text-white dark:focus:text-white hover:text-black focus:text-black focus:outline-none"
            to="/"
          >
            Discuss on Twitter
          </Link>
          <span className="self-center mx-3 text-xs">•</span>
          <Link
            className="underlined dark:hover:text-white dark:focus:text-white hover:text-black focus:text-black focus:outline-none"
            to="/"
          >
            Edit on GitHub
          </Link>
        </div>
      </div>
      <div className="col-span-full lg:col-span-2 lg:col-start-3">
        <img
          className="mb-8 w-32 rounded-lg"
          {...getImgProps(images.kentTransparentProfile, {
            widths: [128, 256, 512],
            sizes: ['8rem'],
          })}
        />
      </div>
      <div className="lg:col-start:5 col-span-full lg:col-span-6">
        <H6 as="div">Written by Kent C. Dodds</H6>
        <Paragraph className="mb-12 mt-3">
          {`
Kent C. Dodds is a JavaScript software engineer and teacher. He's taught
hundreds of thousands of people how to make the world a better place with
quality software development tools and practices. He lives with his wife and
four kids in Utah.
          `.trim()}
        </Paragraph>
        <ArrowLink to="/about">Learn more about Kent</ArrowLink>
      </div>
    </Grid>
  )
}

function MdxScreen() {
  const data = useLoaderData<LoaderData>()
  const requestInfo = useRequestInfo()
  if (!data.page) {
    throw new Error(
      'This should be impossible because we only render the MdxScreen if there is a data.page object.',
    )
  }

  const {code, frontmatter} = data.page
  const params = useParams()
  const markAsRead = useFetcher()
  console.log({markAsRead})
  const {slug} = params
  const Component = useMdxComponent(code)

  const permalink = `${requestInfo.origin}/blog/${slug}`

  const readMarker = React.useRef<HTMLDivElement>(null)
  useOnRead({
    parentElRef: readMarker,
    readTime: data.page.readTime,
    onRead: React.useCallback(() => {
      if (!slug) return
      console.log('here')
      markAsRead.submit({articleSlug: slug}, {method: 'post'})
    }, [slug, markAsRead]),
  })

  return (
    <>
      <Grid className="mb-10 mt-24 lg:mb-24">
        <div className="flex col-span-full justify-between lg:col-span-8 lg:col-start-3">
          <BackLink to="/blog">Back to overview</BackLink>
          <TeamStats
            totalReads={data.totalReads}
            rankings={data.readRankings}
            direction="down"
          />
        </div>
      </Grid>

      <Grid as="header" className="mb-12">
        <div className="col-span-full lg:col-span-8 lg:col-start-3">
          <H2>{frontmatter.title}</H2>
          <H6 as="p" variant="secondary" className="mt-2">
            {frontmatter.date
              ? formatDate(frontmatter.date)
              : 'some day in the past'}{' '}
            — {data.page.readTime?.text ?? 'a quick read'}
          </H6>
        </div>
        <div className="aspect-h-4 aspect-w-3 md:aspect-w-3 md:aspect-h-2 col-span-full mt-10 rounded-lg lg:col-span-10 lg:col-start-2">
          {frontmatter.bannerCloudinaryId ? (
            <BlurrableImage
              key={frontmatter.bannerCloudinaryId}
              blurDataUrl={frontmatter.bannerBlurDataUrl}
              className="aspect-h-4 aspect-w-3 md:aspect-w-3 md:aspect-h-2 col-span-full mt-10 mx-auto rounded-lg lg:col-span-10 lg:col-start-2"
              img={
                <img
                  key={frontmatter.bannerCloudinaryId}
                  title={frontmatter.bannerCredit}
                  className="w-full h-full rounded-lg object-cover"
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
        </div>
      </Grid>

      <main ref={readMarker}>
        <Grid className="mb-24">
          <div className="col-span-full lg:col-start-3">
            <div className="flex flex-wrap">
              {frontmatter.translations?.length ? (
                <>
                  <ul className="flex flex-wrap col-span-full -mb-4 -mr-4 lg:col-span-10 lg:col-start-3">
                    {frontmatter.translations.map(({language, link}) => (
                      <li key={`${language}:${link}`}>
                        <a
                          href={link}
                          className="focus-ring bg-secondary text-primary relative block mb-4 mr-4 px-6 py-3 w-auto h-auto whitespace-nowrap rounded-full"
                        >
                          {language}
                        </a>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={externalLinks.translationContributions}
                    className="text-secondary underlined block mb-6 ml-5 my-3 hover:text-team-current focus:text-team-current text-lg font-medium focus:outline-none"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Add translation
                  </a>
                </>
              ) : (
                <>
                  <span className="text-secondary text-lg italic">
                    No translations available.
                  </span>

                  <a
                    href={externalLinks.translationContributions}
                    className="text-secondary underlined block ml-5 hover:text-team-current focus:text-team-current text-lg font-medium focus:outline-none"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Add translation
                  </a>
                </>
              )}
            </div>
          </div>
        </Grid>

        <Grid className="prose prose-light dark:prose-dark mb-24">
          <Component />
        </Grid>
      </main>

      <Grid className="mb-24">
        <div className="flex col-span-full justify-end lg:col-span-8 lg:col-start-3">
          <TeamStats
            totalReads={data.totalReads}
            rankings={data.readRankings}
            direction="up"
          />
        </div>
      </Grid>

      <div className="mb-64">
        <ArticleFooter
          permalink={permalink}
          title={data.page.frontmatter.title}
        />
      </div>

      <BlogSection
        articles={data.recommendations}
        title="If you found this article helpful."
        description="You will love these ones as well."
        showArrowButton={false}
      />
    </>
  )
}

export function ErrorBoundary({error}: {error: Error}) {
  console.error(error)
  return <ServerError />
}
