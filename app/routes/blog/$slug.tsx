import * as React from 'react'
import {useRouteData, json} from 'remix'
import {Link, useParams} from 'react-router-dom'
import type {Await, KCDLoader, MdxListItem, MdxPage} from 'types'
import formatDate from 'date-fns/format'
import {images} from '../../images'
import {
  getMdxPage,
  mdxPageMeta,
  useMdxComponent,
  refreshCacheForMdx,
} from '../../utils/mdx'
import {useOptionalUser} from '../../utils/providers'
import {H2, H6, Paragraph} from '../../components/typography'
import {Grid} from '../../components/grid'
import {ArrowLink, BackLink} from '../../components/arrow-button'
import {BlogSection} from '../../components/sections/blog-section'
import {
  getBlogReadRankings,
  getBlogRecommendations,
} from '../../utils/blog.server'
import {shouldForceFresh} from '../../utils/redis.server'
import {FourOhFour} from '../../components/errors'
import {getDomainUrl} from '../../utils/misc'
import {externalLinks} from '../../external-links'
import {TeamStats} from '../../components/team-stats'

type LoaderData = {
  page: MdxPage | null
  recommendations: Array<MdxListItem>
  readRankings: Await<ReturnType<typeof getBlogReadRankings>>
}

export const loader: KCDLoader<{slug: string}> = async ({request, params}) => {
  const pageMeta = {
    permalink: `${getDomainUrl(request)}/blog/${params.slug}`,
    contentDir: 'blog',
    slug: params.slug,
  }
  if (await shouldForceFresh(request)) {
    await refreshCacheForMdx(pageMeta)
  }

  const page = await getMdxPage(pageMeta)
  const blogRecommendations = (await getBlogRecommendations())
    .filter(b => b.slug !== params.slug)
    .slice(0, 3)
  const readRankings = await getBlogReadRankings(params.slug)

  let data: LoaderData

  if (page) {
    data = {page, recommendations: blogRecommendations, readRankings}

    return json(data)
  } else {
    data = {page: null, recommendations: blogRecommendations, readRankings}
    return json(data, {status: 404})
  }
}

export const meta = mdxPageMeta

export default function MdxScreenBase() {
  const data = useRouteData<LoaderData>()

  if (data.page) return <MdxScreen />
  else return <FourOhFour />
}

function useOnRead({
  parentElRef,
  readTime,
  onRead,
  enabled = true,
}: {
  parentElRef: React.RefObject<HTMLElement>
  readTime: MdxPage['readTime']
  onRead: () => void
  enabled: boolean
}) {
  React.useEffect(() => {
    const parentEl = parentElRef.current
    const time = readTime?.time
    if (!enabled || !parentEl || !time) return

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
  }, [enabled, readTime, onRead, parentElRef])
}

function ArticleFooter() {
  return (
    <Grid>
      <div className="flex flex-col col-span-full justify-between mb-12 pb-12 text-blueGray-500 text-lg font-medium border-b border-gray-600 lg:flex-row lg:col-span-8 lg:col-start-3 lg:pb-6">
        <div className="flex space-x-5">
          <H6 as="h2">Share article</H6>
          {/* TODO: fix links */}
          <Link
            className="dark:hover:text-white dark:focus:text-white hover:text-black focus:text-black focus:outline-none"
            to="/"
          >
            Facebook
          </Link>
          <Link
            className="dark:hover:text-white dark:focus:text-white hover:text-black focus:text-black focus:outline-none"
            to="/"
          >
            Twitter
          </Link>
        </div>

        <div className="flex">
          <Link
            className="dark:hover:text-white dark:focus:text-white hover:text-black focus:text-black focus:outline-none"
            to="/"
          >
            Discuss on Twitter
          </Link>
          <span className="self-center mx-3 text-xs">•</span>
          <Link
            className="dark:hover:text-white dark:focus:text-white hover:text-black focus:text-black focus:outline-none"
            to="/"
          >
            Edit on GitHub
          </Link>
        </div>
      </div>
      <div className="col-span-full lg:col-span-2 lg:col-start-3">
        <img
          className="mb-8 w-32 rounded-lg"
          src={images.kentTransparentProfile()}
          alt={images.kentTransparentProfile.alt}
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
  const data = useRouteData<LoaderData>()
  if (!data.page) {
    throw new Error(
      'This should be impossible because we only render the MdxScreen if there is a data.page object.',
    )
  }

  const user = useOptionalUser()
  const {code, frontmatter} = data.page
  const params = useParams()
  const {slug} = params
  const Component = useMdxComponent(code)

  const readMarker = React.useRef<HTMLDivElement>(null)
  useOnRead({
    parentElRef: readMarker,
    readTime: data.page.readTime,
    onRead: React.useCallback(() => {
      const searchParams = new URLSearchParams([
        ['_data', 'routes/_action/mark-read'],
      ])
      void fetch(`/_action/mark-read?${searchParams}`, {
        method: 'POST',
        body: JSON.stringify({articleSlug: slug}),
      })
    }, [slug]),
    enabled: Boolean(user),
  })

  return (
    <>
      <Grid className="mb-10 mt-24 lg:mb-24">
        <div className="flex col-span-full justify-between lg:col-span-8 lg:col-start-3">
          <BackLink to="/blog">Back to overview</BackLink>
          <TeamStats rankings={data.readRankings} direction="down" />
        </div>
      </Grid>

      <Grid as="header" className="mb-12">
        <div className="col-span-full lg:col-span-8 lg:col-start-3">
          <H2>{frontmatter.title}</H2>
          <H6 as="p" variant="secondary" className="mt-2 lowercase">
            {frontmatter.date
              ? formatDate(new Date(frontmatter.date), 'PPP')
              : 'some day in the past'}{' '}
            — {data.page.readTime?.text ?? 'a quick read'}
          </H6>
        </div>
        <div className="aspect-h-4 aspect-w-3 md:aspect-w-3 md:aspect-h-2 col-span-full mt-10 rounded-lg lg:col-span-10 lg:col-start-2">
          <img
            className="w-full h-full rounded-lg object-cover"
            src={frontmatter.bannerUrl}
            alt={frontmatter.bannerAlt}
          />
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
                    className="text-secondary underlined block mb-6 ml-5 my-3"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <H6 as="span" variant="secondary">
                      Add translation
                    </H6>
                  </a>
                </>
              ) : (
                <>
                  <span className="text-secondary text-lg italic">
                    No translations available.
                  </span>

                  <a
                    href={externalLinks.translationContributions}
                    className="text-secondary underlined block ml-5"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <H6 as="span" variant="secondary">
                      Add translation
                    </H6>
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
          <TeamStats rankings={data.readRankings} direction="up" />
        </div>
      </Grid>

      <div className="mb-64">
        <ArticleFooter />
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
